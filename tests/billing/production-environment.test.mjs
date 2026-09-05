import assert from 'node:assert/strict';
import test from 'node:test';
import Stripe from 'stripe';
import { StripeBillingProviderCore } from '../../src/lib/billing/providers/stripe/adapter-core.ts';
import { resolveStripeConfiguration } from '../../src/lib/billing/providers/stripe/configuration.ts';
import { verifyStripeWebhookEvent } from '../../src/lib/billing/providers/stripe/webhook-verification.ts';

const secret = 'whsec_local_signature_fixture';
const stripe = new Stripe(['sk', 'test', 'fixture'].join('_'));
function signed(livemode, tamper = false) {
  const raw = JSON.stringify({ id: 'evt_fixture', object: 'event', type: 'customer.subscription.updated', livemode, data: { object: { id: 'sub_fixture' } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload: raw, secret });
  return { stripe, raw: tamper ? raw + ' ' : raw, signature, secret };
}
for (const environment of ['TEST', 'LIVE']) {
  const live = environment === 'LIVE';
  const prefix = live ? 'live' : 'test';
  const config = resolveStripeConfiguration({ STRIPE_ENVIRONMENT: environment, STRIPE_API_KEY: ['sk', prefix, 'fixture'].join('_') });
  test(`${environment} accepts only signed webhooks from its own environment`, async () => {
    assert.equal((await verifyStripeWebhookEvent({ ...signed(live), environment })).livemode, live);
    await assert.rejects(verifyStripeWebhookEvent({ ...signed(!live), environment }));
    await assert.rejects(verifyStripeWebhookEvent({ ...signed(live, true), environment }));
    await assert.rejects(verifyStripeWebhookEvent({ ...signed(live), secret: 'whsec_wrong', environment }));
    await assert.rejects(verifyStripeWebhookEvent({ ...signed(undefined), environment }));
  });
  test(`${environment} creates and retrieves its own Checkout Sessions`, async () => {
    let retrieveCalls = 0;
    const session = { id: `cs_${prefix}_fixture`, customer: 'cus_fixture', status: 'open', livemode: live, expires_at: 4102444800, url: 'https://checkout.stripe.com/c/pay/fixture' };
    const provider = new StripeBillingProviderCore({ checkout: { sessions: {
      retrieve: async () => { retrieveCalls++; return session; }, create: async () => session,
    } } }, config);
    const created = await provider.createCheckoutSession({ billingAccountId: 'b1a00000-0000-4000-8000-000000000001', checkoutAttemptId: 'b1a00000-0000-4000-8000-000000000002', customerId: 'cus_fixture', priceId: 'price_fixture', idempotencyKey: 'checkout:fixture:production', productCode: 'PRO', market: 'BR', successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel', trialPeriodDays: 7 });
    assert.equal(created.id, session.id);
    assert.equal((await provider.getCheckoutSession(session.id)).id, session.id);
    await assert.rejects(provider.getCheckoutSession(`cs_${live ? 'test' : 'live'}_fixture`));
    assert.equal(retrieveCalls, 1, 'opposite environment must be rejected before retrieval');
    session.livemode = !live;
    await assert.rejects(provider.getCheckoutSession(session.id));
  });
}
test('Vercel Production requires LIVE while Preview requires TEST', () => {
  for (const deployment of ['production', 'preview', 'development']) {
    const correct = deployment === 'production' ? 'LIVE' : 'TEST';
    for (const environment of ['TEST', 'LIVE']) {
      const source = { VERCEL_ENV: deployment, STRIPE_ENVIRONMENT: environment, STRIPE_API_KEY: ['sk', environment.toLowerCase(), 'fixture'].join('_') };
      if (environment === correct) assert.equal(resolveStripeConfiguration(source).environment, correct);
      else assert.throws(() => resolveStripeConfiguration(source));
    }
  }
});
