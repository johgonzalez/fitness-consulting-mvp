import { createStripeBillingProvider } from '../../src/lib/billing/providers/stripe/adapter.ts';
import { loadStripeConfiguration } from '../../src/lib/billing/providers/stripe/runtime-configuration.ts';

if (process.env.VERCEL_ENV === 'production') {
  try {
    const configuration = loadStripeConfiguration();
    if (configuration.environment !== 'LIVE' || !configuration.accountId || !configuration.proProductId) {
      throw new Error('LIVE_BILLING_CONFIGURATION_REQUIRED');
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET?.trim().startsWith('whsec_')) {
      throw new Error('WEBHOOK_SECRET_REQUIRED');
    }
    const database = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    if (!database.hostname.endsWith('.supabase.co') || database.protocol !== 'https:') {
      throw new Error('SUPABASE_CONFIGURATION_REQUIRED');
    }
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!service) throw new Error('SERVICE_KEY_REQUIRED');
    if (!service.startsWith('sb_secret_')) {
      const claims = JSON.parse(Buffer.from(service.split('.')[1], 'base64url').toString());
      if (claims.role !== 'service_role' || claims.ref !== database.hostname.split('.')[0]) {
        throw new Error('SERVICE_KEY_PROJECT_MISMATCH');
      }
    }
    const provider = createStripeBillingProvider();
    const health = await provider.getProviderHealth();
    const price = await provider.getPrice({ productCode: 'PRO', market: 'BR', currency: 'BRL', interval: 'MONTH' });
    console.log(JSON.stringify({ billingProductionPreflight: 'PASS', environment: health.environment, account: health.accountId, supabaseProject: database.hostname.split('.')[0], price: price.providerPriceId, amountMinor: price.unitAmountMinor, currency: price.currency }));
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : /^[A-Z_]+$/.test(error?.message || '') ? error.message : 'BILLING_PRODUCTION_PREFLIGHT_FAILED';
    console.error(`Billing production preflight failed: ${code}`);
    process.exitCode = 1;
  }
} else {
  console.log('Billing production preflight skipped outside Vercel Production.');
}
