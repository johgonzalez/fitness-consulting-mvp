# PPerfil Stripe Billing Provider V1

## Boundary

Stripe is the payment and recurring-billing provider. PPerfil remains authoritative for `billing_state`, grace, continuity, capabilities and access. The provider adapter translates Stripe objects into the provider-neutral `NormalizedBillingProviderSnapshot` established in Billing 1A; Stripe types never enter the canonical Billing domain or resolver.

Billing 1B is server infrastructure only. It does not implement Checkout, Customer Portal, webhooks, payment UI, subscription activation or any database mutation.

## SDK and API contract

- Node SDK: `stripe@22.5.0`
- Explicit API version: `2026-02-25.clover`
- Provider module: `src/lib/billing/providers/stripe/`
- Server entrypoint: `createStripeBillingProvider()`

Stripe documents that a Node SDK normally aligns its generated TypeScript types with the API version current when that SDK is released, while `apiVersion` may explicitly override requests. PPerfil pins the approved Clover contract and structurally validates every provider object at the adapter boundary. This prevents newer generated Stripe types from becoming application authority. Review the pin deliberately when upgrading either the SDK or API version.

Reference: [Stripe API versioning](https://docs.stripe.com/api/versioning?lang=node).

## Environment model

| PPerfil environment | `STRIPE_ENVIRONMENT` | Credential/object mode |
| --- | --- | --- |
| Local | `TEST` | Stripe Sandbox/Test only |
| Preview | `TEST` explicitly | isolated Stripe Sandbox/Test only |
| Production | `LIVE` | Stripe Live only |

When unset, `STRIPE_ENVIRONMENT` defaults to `TEST` outside `NODE_ENV=production` and `LIVE` in production. Preview deployments commonly run with `NODE_ENV=production`, so they must explicitly set `STRIPE_ENVIRONMENT=TEST`.

The provider rejects TEST credentials in LIVE and LIVE credentials in TEST before creating the Stripe client or making a network request. Stripe `livemode` is an environment-safety signal only and never determines PPerfil Billing state.

Objects are environment-specific. Test Customers, Products, Prices and Subscriptions must never populate a Live billing workflow, and Live objects must never be copied into fixtures.

## Key strategy

The only credential variable is server-only:

```dotenv
STRIPE_API_KEY=
```

Accepted key families are `rk_test_`, `sk_test_`, `rk_live_` and `sk_live_`, provided they match `STRIPE_ENVIRONMENT`. Prefer a restricted key (`rk_*`). An unrestricted `sk_test_*` key may be used temporarily for local Sandbox validation. No publishable key is required because the future V1 frontend uses Hosted Checkout.

Never use `NEXT_PUBLIC_` for a Stripe private key. Never commit, paste into chat, log or expose a credential. Store deployed credentials in the platform secret manager. Stripe recommends restricted keys and least privilege: [Stripe key security](https://docs.stripe.com/keys-best-practices).

### Minimum restricted-key permissions

Billing 1B health/read helpers need:

- Account: Read, for account connectivity/pinning;
- Customers: Read; Write only when the approved billing action creates a Customer;
- Products: Read;
- Prices: Read;
- Subscriptions: Read.

Later Billing 1C/1D operations will additionally require, only when implemented:

- Checkout Sessions: Write (and Read for diagnostics);
- Billing Portal Sessions: Write;
- Subscriptions: Write only for explicitly approved management operations;
- Invoices: Read;
- Customers: Write.

Do not enable Charges, PaymentIntents, Refunds, Payouts, Transfers or unrelated write permissions for this architecture. Stripe Dashboard permission labels can evolve; verify the actual calls against the restricted-key request log before Live.

## Account pinning

Optional configuration:

```dotenv
STRIPE_ACCOUNT_ID=acct_...
```

The read-only health check retrieves the current Stripe Account. When a pin is configured, a different account ID fails with `STRIPE_ACCOUNT_MISMATCH`. Pinning is optional for first local setup but recommended for Preview and required by the deployment readiness checklist before Live.

## Provider adapter

The server-only adapter exposes provider-neutral operations:

- `getProviderHealth()`
- `getCustomer(customerId)`
- `createCustomer(...)`
- `getProduct(productId)`
- `getPrice(catalogSelection)`
- `listCurrentSubscriptions(customerId)`
- `getSubscription(...)`

Checkout Session creation, Portal Session creation and webhook processing are intentionally absent.

Provider errors are classified into safe internal codes. Raw Stripe error bodies and credentials are not used as user-facing messages or logging context.

## Customer lifecycle and idempotency

`billing_accounts.id` is PPerfil identity. Stripe Customer ID is only provider identity. Customer ownership must never be inferred from email.

The Customer creation helper accepts a trusted billing account UUID and app user UUID, writes only those safe references to Stripe metadata, and requires an idempotency key. It does not include trainer profile, student, health, assessment or workout data. Billing 1C must first read local `provider_customer_id`; only an approved billing action may create a Customer. Persisting the resulting ID must be atomic through a narrow trusted Billing operation.

Ordinary page views must never create Stripe Customers.

## Catalog and Price recognition

The stable internal catalog request is:

```text
PRO / BR / BRL / MONTH
```

The default Stripe Price lookup key is:

```dotenv
STRIPE_PRO_BR_MONTHLY_LOOKUP_KEY=pperfil_pro_br_monthly
```

The approved Stripe Product is pinned separately after Sandbox catalog creation:

```dotenv
STRIPE_PRO_PRODUCT_ID=prod_...
```

Price recognition requires all of the following:

- exactly one active Price for the lookup key;
- configured Product ID match;
- active recognized Product when expanded;
- currency `brl` at Stripe / `BRL` internally;
- recurring interval `month`, interval count `1`;
- non-negative integer minor-unit amount when present;
- no conflicting PPerfil metadata.
- Price and Subscription `livemode` matching the configured provider environment.

Amount is informational and is never entitlement authority. A random Price for 5990 does not become PRO. Stripe metadata may be checked for conflicts but cannot establish product identity; the lookup key and configured Product pin are authoritative provider catalog controls.

Billing 1B does not create Product or Price objects.

## Subscription normalization

The normalizer maps provider status candidates as follows:

| Stripe status | PPerfil candidate |
| --- | --- |
| `active` | `ACTIVE` |
| `past_due` | `GRACE` candidate |
| `unpaid`, `canceled`, `paused` | `SUSPENDED` |
| `incomplete`, `incomplete_expired` | `SUSPENDED` / no paid entitlement |
| `trialing` | fail closed; V1 has no trial |
| unknown | fail closed |

`past_due` does not start or calculate grace. It carries the candidate state and prior-access context to Billing 1A, where the trusted reconciler enforces the seven-day, non-extending policy. Provider reads never call reconciliation automatically.

Subscription periods are read from the recognized Stripe Subscription Item for the approved Price. Cancellation remains `ACTIVE + cancel_at_period_end` until Billing 1A evaluates the period boundary.

## Sandbox setup for the Product Owner

1. Create or sign in to the Stripe account directly in Stripe.
2. Select Sandbox/Test mode. Confirm that Live mode is not active.
3. Prefer creating a TEST Restricted API Key with the minimum permissions above. An `sk_test_*` key is accepted temporarily.
4. Store the value only in local `.env.local` or the deployment secret manager:

   ```dotenv
   STRIPE_ENVIRONMENT=TEST
   STRIPE_API_KEY=
   ```

5. Never commit the file and never paste the credential into ChatGPT, tickets, screenshots or documentation.
6. Optionally add the account pin shown in the Stripe Dashboard:

   ```dotenv
   STRIPE_ACCOUNT_ID=acct_...
   ```

7. Run the read-only health check:

   ```powershell
   pnpm billing:stripe:check
   ```

The command retrieves Account metadata only and prints `CONNECTED`, environment, credential type, account ID, country and default currency. It creates no Stripe object and never prints the credential.

If a Live key is detected while configured for TEST, the command stops before calling Stripe and prints `LIVE CREDENTIAL BLOCKED`.

## Future integration

Billing 1C may create the approved Sandbox Product/Price and implement Hosted Checkout with the existing internal attempt/idempotency model. A later webhook sprint will add signature verification, sanitized receipt persistence, authoritative subscription refresh and Billing 1A reconciliation. Stripe CLI is not required in 1B; it becomes recommended for local webhook development.

Customer Portal and Live objects require separate approval. No Preview environment may create real subscriptions.
