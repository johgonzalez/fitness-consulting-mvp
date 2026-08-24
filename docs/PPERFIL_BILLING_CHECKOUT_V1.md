# PPerfil Billing Checkout V1

## Scope

Billing 1C adds the TEST-only Stripe catalog and Hosted Checkout boundary. It does not implement webhooks, Customer Portal, payment reconciliation or entitlement activation. PPerfil remains the authority for `billing_state` and paid capabilities.

## Approved Sandbox catalog

| Field | Value |
| --- | --- |
| Product | PPerfil Pro |
| Product code | `PRO` |
| Market | `BR` |
| Currency | `BRL` |
| Interval | `MONTH` |
| Amount | `5990` minor units |
| Lookup key | `pperfil_pro_br_monthly` |
| TEST Product ID | `prod_V8O6ulkkoHStvD` |
| TEST Price ID | `price_1U87KfGcGN0dnwUzQprr10CB` |

The amount is commercial configuration, not entitlement authority. Runtime resolution starts with the internal tuple `PRO / BR / BRL / MONTH`, resolves the stable lookup key server-side, and validates environment, Product identity, lookup key, active state, currency, recurring interval and amount. The browser never supplies a Price ID, Product ID, amount, currency or quantity.

## Idempotent catalog setup

Run:

```powershell
pnpm billing:stripe:check
pnpm billing:stripe:setup-catalog
```

The setup command requires TEST credentials and account pinning. It reuses a matching Product and Price and fails closed if the lookup key resolves to an incompatible object. Product and Price creation use stable Stripe idempotency keys. A repeated successful run must report `product_created=false` and `price_created=false`.

Stripe Prices are immutable commercial history. A future price change creates a new Price and a deliberately versioned lookup-key transition; it never edits the old Price to represent a new amount.

## Server-only configuration

Local and Preview use Stripe TEST. Production will use Stripe LIVE in a later readiness pass.

```dotenv
STRIPE_ENVIRONMENT=TEST
STRIPE_API_KEY=...
STRIPE_ACCOUNT_ID=...
STRIPE_PRO_BR_MONTHLY_LOOKUP_KEY=pperfil_pro_br_monthly
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`STRIPE_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. They must never use a `NEXT_PUBLIC_` prefix, appear in logs, or be committed. The Supabase key is consumed only by the scoped Billing Checkout repository; the application does not expose a general-purpose admin client.

## Customer lifecycle

An authenticated request is revalidated with Supabase Auth and `get_my_app_identity()`. Only a `TRAINER` may continue. The scoped server repository then finds or creates the Trainer's internal `billing_account`.

One internal Billing Account maps to one Stripe Customer per environment. The Customer uses deterministic idempotency `billing-customer:{billing_account_id}` and only the internal `billing_account_id` and `app_user_id` metadata. Email, student, health, workout, assessment and trainer profile data are not sent to Stripe. If a local Customer mapping exists but Stripe cannot retrieve it, Checkout fails without creating another Customer.

## Checkout attempt and duplicate protection

Before Stripe Checkout, the server checks the local current subscription and the Stripe Customer's current subscriptions. Any recognized active or pending provider subscription blocks a second Checkout.

`billing_checkout_attempts` reserves the internal attempt before Session creation. Billing 1A states map as follows:

- `CREATED`: Session creation reserved/in progress.
- `SESSION_CREATED`: open Stripe Session stored.
- `COMPLETED`, `EXPIRED`, `FAILED`, `CANCELED`: terminal audit states for later lifecycle processing.

The attempt ID becomes `client_reference_id`. The provider idempotency key is stable for retries, and concurrent inserts converge through the existing unique provider-idempotency constraint. An existing usable Session is retrieved and reused. The Checkout URL is returned to the authenticated browser but is never stored in the database.

## Hosted Checkout

Endpoint:

```text
POST /api/billing/stripe/checkout
```

The request body must be an empty JSON object. The server resolves `PRO / BR / BRL / MONTH`, creates a Stripe Hosted Checkout Session in `subscription` mode, fixes quantity to one and uses card-first payment methods. There is no trial.

Success URL:

```text
{NEXT_PUBLIC_SITE_URL}/dashboard/settings/billing?checkout=returned&session_id={CHECKOUT_SESSION_ID}
```

Cancel URL:

```text
{NEXT_PUBLIC_SITE_URL}/dashboard/settings/billing?checkout=canceled
```

The configured application URL is validated server-side; the request `Host` header is not redirect authority.

## Return semantics

`checkout=canceled` says that payment was canceled and no amount was charged. `checkout=returned` says Stripe received the Checkout and that confirmation is pending.

The query string and success redirect never:

- mark the attempt complete;
- set `billing_state=ACTIVE`;
- grant `PRO`;
- enable any paid capability.

Authoritative activation requires a signed Stripe webhook plus Billing reconciliation in Billing 1D. Until then, a successful TEST Checkout may remain `SESSION_CREATED`.

## Manual Sandbox test

1. Keep the approved TEST Stripe key and account pin in `.env.local`.
2. Configure the server-only Supabase service-role/secret key locally; never paste it into source or chat.
3. Run `pnpm dev`.
4. Sign in as a real local Trainer. Demo fixture mode is read-only and cannot create Billing records.
5. Open `http://localhost:3000/dashboard/settings/billing`.
6. Select **Assinar PPerfil Pro**.
7. Complete Hosted Checkout with an official Stripe TEST payment method from Stripe documentation. Do not store test card details.
8. Confirm the return page says confirmation is pending and that Billing remains non-ACTIVE before Billing 1D.

## Security invariants

- Unauthenticated and Student requests are denied.
- Every POST authenticates and authorizes independently of layouts or middleware.
- Same-origin requests are required.
- Client catalog/amount/currency/Product/quantity input is rejected.
- Cross-user Billing Account ownership fails closed.
- Stripe environment and account pinning remain mandatory for controlled setup.
- Provider errors are sanitized.
- Authenticated/anonymous clients retain no direct Billing table writes.
- No Checkout return path grants entitlement.

## Known limitation before Billing 1D

There is no Stripe webhook or reconciliation worker. Payment completion, invoice state, payment failure, grace and suspension cannot become authoritative yet. Customer Portal is deferred to Billing 1E.
