import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createStripeBillingProvider } from "@/lib/billing/providers/stripe/adapter";
import { createStripeClient } from "@/lib/billing/providers/stripe/client";
import { loadStripeConfiguration } from "@/lib/billing/providers/stripe/runtime-configuration";
import { createBillingAdminClient } from "@/lib/billing/supabase-admin";

export const runtime = "nodejs";
const supported = new Set(["checkout.session.completed","customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"]);

function text(message:string,status:number){return NextResponse.json({ok:status<400,message},{status});}
function objectId(value:unknown){if(typeof value==="string")return value;if(value&&typeof value==="object"&&"id" in value&&typeof(value as{id?:unknown}).id==="string")return(value as{id:string}).id;return null;}

export async function POST(request:Request){
  const secret=process.env.STRIPE_WEBHOOK_SECRET?.trim();if(!secret)return text("Webhook não configurado.",503);
  const signature=request.headers.get("stripe-signature");if(!signature)return text("Assinatura ausente.",400);
  const raw=await request.text();const hash=createHash("sha256").update(raw).digest("hex");
  let event:Stripe.Event;
  try{const stripe=createStripeClient(loadStripeConfiguration());event=await stripe.webhooks.constructEventAsync(raw,signature,secret);}catch{return text("Assinatura inválida.",400);}
  if(event.livemode)return text("Evento Live recusado neste ambiente.",400);
  const admin=createBillingAdminClient();const object=event.data.object as unknown as Record<string,unknown>;const objectIdValue=objectId(object);
  const receipt={provider:"stripe",provider_event_id:event.id,event_type:event.type,provider_object_id:objectIdValue,provider_api_version:event.api_version,provider_livemode:event.livemode,processing_status:supported.has(event.type)?"PROCESSING":"IGNORED",attempt_count:1,payload_sha256:hash,...(!supported.has(event.type)?{processed_at:new Date().toISOString()}:{})};
  const inserted=await admin.from("billing_event_receipts").insert(receipt).select("id").maybeSingle();
  let receiptId:string;
  if(inserted.error?.code==="23505"){
    const existingResult=await admin.from("billing_event_receipts").select("id,processing_status,payload_sha256,attempt_count").eq("provider","stripe").eq("provider_event_id",event.id).single();
    const existing=existingResult.data as{id:string;processing_status:string;payload_sha256:string;attempt_count:number}|null;
    if(existingResult.error||!existing||existing.payload_sha256!==hash)return text("Evento duplicado inválido.",400);
    if(existing.processing_status==="PROCESSED"||existing.processing_status==="IGNORED")return text("Evento já processado.",200);
    const claimed=await admin.from("billing_event_receipts").update({processing_status:"PROCESSING",attempt_count:Math.min(existing.attempt_count+1,1000),sanitized_error_code:null}).eq("id",existing.id).in("processing_status",["FAILED","RECEIVED"]).select("id").maybeSingle();
    if(claimed.error||!claimed.data)return text("Evento já está em processamento.",200);
    receiptId=existing.id;
  }else{
    if(inserted.error||!inserted.data)return text("Recibo indisponível.",503);
    receiptId=(inserted.data as{id:string}).id;
  }
  if(!supported.has(event.type))return text("Evento ignorado.",200);
  try{
    const metadata=(object.metadata&&typeof object.metadata==="object"?object.metadata:{}) as Record<string,unknown>;
    const subscriptionId=event.type==="checkout.session.completed"?objectId(object.subscription):objectIdValue;
    const billingAccountId=typeof metadata.billing_account_id==="string"?metadata.billing_account_id:null;
    if(!subscriptionId?.startsWith("sub_")||!billingAccountId)throw new Error("UNLINKED_PROVIDER_EVENT");
    const accountResult=await admin.from("billing_accounts").select("id,app_user_id,provider_customer_id").eq("id",billingAccountId).single();
    const account=accountResult.data as{id:string;app_user_id:string;provider_customer_id:string|null}|null;
    if(accountResult.error||!account)throw new Error("BILLING_ACCOUNT_NOT_FOUND");
    const priorResult=await admin.from("billing_subscriptions").select("id").eq("billing_account_id",account.id).eq("is_current",true).eq("product_code","PRO").in("billing_state",["ACTIVE","GRACE"]).limit(1);
    if(priorResult.error)throw new Error("PRIOR_ACCESS_READ_FAILED");
    const observedAt=new Date(event.created*1000).toISOString();
    const snapshot=await createStripeBillingProvider().getSubscription({appUserId:account.app_user_id,subscriptionId,catalog:{productCode:"PRO",market:"BR",currency:"BRL",interval:"MONTH"},observedAt,priorPaidAccess:Boolean(priorResult.data?.length),isCurrent:true});
    if(account.provider_customer_id&&snapshot.providerCustomerId!==account.provider_customer_id)throw new Error("BILLING_CUSTOMER_MISMATCH");
    const reconciliation=await admin.rpc("reconcile_billing_subscription",{p_app_user_id:snapshot.appUserId,p_provider:snapshot.provider,p_provider_customer_id:snapshot.providerCustomerId,p_provider_subscription_id:snapshot.providerSubscriptionId,p_provider_product_id:snapshot.providerProductId,p_provider_price_id:snapshot.providerPriceId,p_latest_provider_invoice_id:snapshot.latestProviderInvoiceId,p_product_code:snapshot.productCode,p_market:snapshot.market,p_currency:snapshot.currency,p_billing_interval:snapshot.billingInterval,p_provider_status:snapshot.providerStatus,p_billing_state:snapshot.billingState,p_current_period_start:snapshot.currentPeriodStart,p_current_period_end:snapshot.currentPeriodEnd,p_cancel_at_period_end:snapshot.cancelAtPeriodEnd,p_canceled_at:snapshot.canceledAt,p_ended_at:snapshot.endedAt,p_observed_at:snapshot.observedAt,p_prior_paid_access:snapshot.priorPaidAccess,p_is_current:snapshot.isCurrent});
    if(reconciliation.error)throw new Error("BILLING_RECONCILIATION_FAILED");
    const attemptId=typeof metadata.checkout_attempt_id==="string"?metadata.checkout_attempt_id:null;
    if(attemptId)await admin.from("billing_checkout_attempts").update({status:"COMPLETED"}).eq("id",attemptId).eq("billing_account_id",account.id);
    await admin.from("billing_event_receipts").update({processing_status:"PROCESSED",processed_at:new Date().toISOString(),sanitized_error_code:null}).eq("id",receiptId);
    return text("Evento processado.",200);
  }catch(error){const code=error instanceof Error&&/^[A-Z0-9_]{1,80}$/.test(error.message)?error.message:"WEBHOOK_PROCESSING_FAILED";await admin.from("billing_event_receipts").update({processing_status:"FAILED",sanitized_error_code:code}).eq("id",receiptId);return text("Falha ao reconciliar evento.",503);}
}
