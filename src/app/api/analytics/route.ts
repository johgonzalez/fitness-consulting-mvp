import { NextResponse } from "next/server";
import { isDemoModeAvailable } from "@/lib/demo/config";
import { createClient } from "@/lib/supabase/server";
import { getVisitorHash } from "@/lib/visitor";
export async function POST(request:Request){
 if(isDemoModeAvailable())return NextResponse.json({ok:true,demo:true});
 try{const body=await request.json() as {event?:string;slug?:string}; const hash=await getVisitorHash(); const supabase=await createClient();
 if(body.event==="lead_form_started") await supabase.rpc("record_lead_form_started",{p_session_hash:hash});
 else if((body.event==="profile_view"||body.event==="whatsapp_click")&&body.slug) await supabase.rpc("record_public_analytics",{p_event:body.event,p_slug:body.slug,p_session_hash:hash});
 return NextResponse.json({ok:true});}catch{return NextResponse.json({ok:false},{status:400});}
}
