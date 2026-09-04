# Community Social V1

## Product contract

Community is one destination with two internal modes: **Feed** and **Grupos**. A verified app user can belong to zero or many groups. The feed aggregates posts from active memberships only; discovery exposes group metadata, never member-only content.

The launch contract includes:

- Trainer-created groups with discoverable or private visibility;
- open, approval-based, or invite-only membership;
- explicit owner, moderator, and member roles;
- relationship-derived default-group membership plus durable direct invitations;
- text, trainer announcement, workout-completion, and hardened image posts;
- optimistic reactions and comments with idempotent mutation identifiers;
- monthly and all-time ranking based on distinct local calendar days with completed workouts after membership begins;
- reports, moderation audit events, and social notifications;
- private media storage served with short-lived signed URLs.

## Privacy and authorization

The database is authoritative. Browser requests use the authenticated Supabase session and RLS; no Community request path uses the service-role credential. Discovery returns only allowed group metadata. Posts, comments, members, ranking, rules, reports, and media require an active membership or a narrower management permission.

A trainer–student relationship can derive membership in the trainer's default group. Ending that relationship revokes only relationship-derived membership. A membership created by explicit invitation or direct group action remains intact until it is explicitly removed or left.

## Ranking definition

An active day is a local date in the group's IANA timezone with at least one eligible completed workout execution. Multiple completions on the same date count once. Completions before `joined_at` do not count. Order is deterministic: active days descending, timestamp at which the total was reached ascending, then app-user identifier ascending.

## Image pipeline

The browser prepares WebP previews for responsiveness. The server remains authoritative: it validates type and size, decodes the image, applies orientation, limits dimensions, re-encodes WebP without metadata, and stores it in a private bucket. Uploads support progress, cancellation, retry, a maximum of four images, and cleanup when post creation fails. This closes the Early Access photo-posting gate without weakening storage RLS.

## UX and accessibility

Mobile is primary. Feed state and scroll position survive navigation to a detail screen. Keyset pagination loads through an intersection sentinel. Search ignores stale responses. Composer and notifications use keyboard-operable modal sheets with focus return, visible focus, safe-area spacing, 16px form text, and reduced-motion behavior. Desktop keeps a centered reading column rather than expanding posts into a dashboard grid.

## Non-goals

No public social feed, follower graph, direct messages, events, ads, sponsorship, fake engagement, or global cross-trainer ranking is introduced in V1.
