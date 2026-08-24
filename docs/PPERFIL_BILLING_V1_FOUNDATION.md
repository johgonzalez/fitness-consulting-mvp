# PPerfil Billing V1 Foundation

## Scope and boundary

Billing 1A introduces the trusted commercial authority without integrating a payment provider. Product code, commercial state and resolved capabilities belong to PPerfil. A future Stripe adapter may normalize provider objects into the reconciliation RPC, but Stripe subscription, Price and PaymentIntent objects must not escape into product domains.

The application domain uses `BillingState`, `BillingSubscription`, `BillingAccessContext` and resolved capabilities. The database keeps `trainer_entitlements` as the existing product-access projection. No second entitlement table was created.

No Stripe SDK, Product, Price, Customer, Checkout Session, Customer Portal, webhook route or Stripe API call is part of this sprint.

## Schema

- `billing_accounts`: one internal account per `app_users` row; provider customer identity is nullable and never a primary key.
- `billing_subscriptions`: normalized provider subscription snapshot, canonical product/state, period, grace, suspension and cancellation data.
- `billing_checkout_attempts`: future Checkout idempotency and request audit boundary. Redirect URLs are deliberately absent.
- `billing_event_receipts`: sanitized delivery/processing metadata only. Raw payloads, signatures, emails, addresses, payment method data, PAN and CVV are prohibited.

Provider identifiers have scoped unique indexes. Each billing account has at most one current subscription. Foreign-key ownership paths and operational state lookups are indexed.

Money is stored as integer minor units (`amount_minor`) with a separate ISO 4217 currency. The launch price is not encoded in entitlement logic.

Event receipt retention is operationally targeted at 12 months. Automatic deletion is intentionally deferred.

## State model

The only PPerfil billing states are:

- `FREE`: no paid capabilities.
- `ACTIVE`: paid capabilities enabled.
- `GRACE`: paid capabilities remain enabled until the fixed grace boundary.
- `SUSPENDED`: paid capabilities disabled; data preserved.

`ACTIVE_CANCELING` is not persisted. It is derived from `ACTIVE + cancel_at_period_end=true`. Access remains active before `current_period_end`; at the boundary it resolves to suspended.

Provider status is stored separately and is never used directly by product screens.

## Grace and recovery

Grace may start only after prior paid access and lasts at most seven days. A repeated event preserves the original `grace_started_at` and `grace_until`, so retries cannot extend access. A first-payment failure cannot create grace. `unpaid`, `canceled` and `paused` are expected to be normalized by the future provider adapter to `SUSPENDED`.

Successful recovery resolves to `ACTIVE`, clears active grace/suspension markers and restores current commercial projection flags.

## Student continuity

The pure resolver models a 14-day window beginning at effective suspension:

- workouts already assigned/published before suspension may still be completed;
- assessments already sent before suspension may still be answered;
- the student may always read their own history;
- progress uploads are blocked after suspension;
- the day-14 boundary is exclusive: continuity has expired at exactly 14 days.

Billing 1A does not wire this policy into every workout, assessment or progress operation. That enforcement remains a later product-domain integration task.

## Entitlement model

Canonical paid capabilities are:

- `site.publish`
- `leads.receive`
- `students.manage`
- `assessments.manage`
- `workouts.program`
- `student_workouts.execute`
- `progress.manage`

The pure resolver is the application authority for these semantic capabilities. It fails closed for unknown product/state, invalid market/currency, unrecognized provider snapshots and unrecognized provider Prices.

Existing `trainer_entitlements` columns remain a compatibility projection:

| Flag | Classification | Billing 1A meaning |
| --- | --- | --- |
| `can_build_site` | ACTIVE | FREE and PRO may build |
| `can_preview_site` | ACTIVE | FREE and PRO may preview |
| `can_use_template_01..04` | ROLLOUT | catalog availability; not pricing tiers |
| `can_use_free_template` | LEGACY | retained compatibility aggregate |
| `can_use_premium_templates` | LEGACY | retained compatibility aggregate; no longer a paid tier |
| `can_publish_site` | COMMERCIAL | current publication authorization projection |
| `can_receive_leads` | COMMERCIAL | current lead-reception authorization projection |
| `can_use_matching` | LEGACY / COMMERCIAL | retained current projection pending matching-domain review |

Essential, Motion, Conversion and Atelier are buildable/previewable on FREE. Template flags remain rollout controls.

## Publication behavior

`trainer_profiles.published` preserves trainer publication intent. Public availability now requires both:

```text
trainer_profiles.published
AND
current commercial publication access
```

Suspension does not rewrite `published`. The public profile RLS policy, testimonial RLS policy and public service/methodology projections revalidate commercial access on every request. Recovery to ACTIVE therefore restores the site automatically without republishing.

For accounts not yet adopted by the new subscription authority, the existing `can_publish_site` projection remains the compatibility source. Once a current billing subscription exists, its canonical state and boundary dates govern availability.

## Security boundary

All four billing tables have RLS enabled. `anon` and `authenticated` have no direct table privileges. Authenticated clients cannot insert accounts/subscriptions, edit states, alter provider identifiers, set grace, change product, or mark a subscription current.

`get_my_billing_summary()` is a fixed-search-path `SECURITY DEFINER` projection filtered by `auth.uid()`. It returns only safe product state, market/currency, interval, period-end, cancellation and grace fields.

`reconcile_billing_subscription(...)` is fixed-search-path `SECURITY DEFINER` and executable only by `service_role`. It accepts an explicit normalized provider snapshot, never calls a provider, and updates the existing entitlement projection. A future server-only billing adapter must validate Stripe Product/Price allowlists before invoking it. The application must not introduce a general-purpose service-role client or expose `SUPABASE_SERVICE_ROLE_KEY` through `NEXT_PUBLIC_*`.

## Legacy commercial records

`commercial_offers`, `founder_offer` and `publication_purchase_intents` remain legacy one-time-publication records. They are not subscription authority, are not consulted by the resolver/reconciler, and their stored price must never imply PRO access. Removal or migration requires a separate commercial-data decision.

## International conventions

- market/country: ISO 3166-1 alpha-2 uppercase (`BR` initially)
- currency: ISO 4217 uppercase (`BRL` initially)
- application locale: BCP 47 (`pt-BR` initially)
- timezone: IANA name where needed
- money: integer minor units plus currency

Display strings such as `R$` and `Brasil` are not billing authority.

## Future Billing 1B / 1C integration points

1. Add a server-only Stripe adapter and pinned, supported Stripe API version.
2. Map approved Stripe Product/Price IDs to internal `PRO`, market, currency and interval.
3. Create Checkout Sessions with server-generated idempotency and the internal attempt ID in metadata.
4. Add a verified webhook route that records sanitized event receipts and invokes reconciliation.
5. Handle event ordering by fetching/normalizing authoritative provider state before reconciliation.
6. Add Customer Portal/cancel-at-period-end flows without exposing provider state to product domains.
7. Wire semantic capability checks and student continuity into paid domain operations.

Pix, refunds and disputes remain outside this foundation. Cancellation is not a refund, and disputes do not automatically revoke entitlement without a future explicit policy.
