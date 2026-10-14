# SMP integration plan — proposed, not implemented

## Current boundary

The frontend reads `getHardcoreSnapshot()` in `src/services/hardcore.ts`.
It currently returns `availability: unavailable`, nullable totals, unknown server
status, and empty records. This is intentional unavailable-state behavior, not a
mock dataset. No live statistics, season schedule, active bans, or online status
are established. The existing PostgreSQL database and PvP records are unchanged.

## Target flow

Private Paper server -> statistics plugin with durable outbox -> authenticated
backend ingestion -> PostgreSQL -> allow-listed public read projections -> UI.

Keep all integration configuration backend-only. Never include addresses, ports,
credentials, tokens, private member fields or raw plugin payloads in public DTOs,
HTML, Next public environment variables, source maps, or browser errors.

## Additive entities to design before migration

| Entity | Proposed keys and relationships |
|---|---|
| MinecraftPlayer | Canonical UUID primary key; display username; verified edition; optional linked User ID |
| PlayerSeasonStatistics | Unique player UUID + season ID; kills/deaths/playtime/survival and DeathBan count |
| Season | Stable ID, name, authoritative start/end timestamps, publication status |
| Faction | Stable plugin ID, name/tag; verified leader UUID; optional approved emblem asset |
| FactionMember | Unique faction ID + player UUID + season ID; joined/left timestamps |
| FactionStatistics | Unique faction + season; nullable power/territory/war metrics, provenance |
| DeathEvent | Unique source event ID; player UUID, season, cause, occurredAt |
| DeathBanRecord | Death event reference, imposedAt, expiresAt, revokedAt; authoritative timestamps |
| FactionWar | Stable event ID, participants, result and occurredAt; only verified plugin events |
| CommunityEvent | Stable ID; title/category/description/start/status/publication flag |
| Achievement | Definition ID and unique player/faction + season award reference |
| IngestedEvent | Unique source + event ID; payload digest, receipt timestamp and processing outcome |

Do not overwrite User IDs, infer UUIDs from usernames, or infer Bedrock from name
prefixes. Verify Java identities and Floodgate-linked Bedrock identities through
the actual server integration. Store aliases for username changes; keep old
username URLs compatible and redirect only after a verified account link exists.
The current `[username]` route also accepts canonical UUID paths through the SMP
read model. Unknown UUIDs render Next's not-found/noindex state. Streamed responses
can already have HTTP 200 headers when that state is rendered. Existing username profiles remain legacy
records, explicitly labeled as such.

Prepare an expand-only Prisma migration, verify it in isolated staging, backfill
only verified links, and deploy the reader after those tables exist. Keep old
tables during rollout. Rollback disables the adapter and uses unavailable states;
do not drop backfilled or production records to reverse a frontend deployment.

## Ingestion contract to specify next

No ingestion endpoint is implemented. Proposed envelope: eventId, sourceId,
schemaVersion, occurredAt, seasonId, type, and strictly typed event payload.
Validate UUIDs, finite non-negative counters, bounded strings/arrays, timestamps,
known event types and unknown-field rejection with Zod at the server boundary.

Use TLS and a rotated server-to-server credential (for example HMAC signatures
over canonical request bytes, timestamp and nonce). Store it only in plugin and
backend secret configuration. Enforce timestamp skew/replay policy, source-level
authorization, request/body limits and per-source rate limits. Never accept an
unsigned browser submission as Minecraft telemetry.

Insert unique source/event ID and apply projections in one transaction. Retries
with the same ID and digest return the existing outcome; an ID reused with a
different digest is rejected and audited. Handle out-of-order events by source
sequence or replayable immutable logs instead of blindly incrementing counters.
The plugin uses a durable queue, bounded exponential backoff with jitter, and
retries after downtime; failed deliveries remain inspectable by authorized staff.

## Read model, privacy and scale

Publish only explicitly public statistics. Do not return User email, session,
Discord IDs, moderation evidence, inventory contents, private territory
coordinates or integration metadata. Profile visibility must respect account and
server publication policy. A website role does not imply Minecraft identity.

Replace the unavailable service with server-side database queries and explicit
DTO mapping, not `SELECT *`. Paginate and sort in PostgreSQL before activating a
large live roster. The frontend currently paginates bounded in-memory records
for an intentionally empty source; this is not a production-scale query adapter.
Index season + metric + UUID for leaderboards, faction/season membership, and
season + occurredAt for recent activity. Return a freshness timestamp. Distinguish
unavailable, stale, offline and empty states; stale telemetry cannot establish an
online server or active ban. Adopt a documented heartbeat expiry and cache policy.

## Proposed ranking and timestamps

`rankFactions` normalizes each metric to 0–1 across eligible peers, using 0.5
when all peers tie. Defaults: PvP 35%, wars 30%, survival 20%, territory 15%.
PvP uses `(kills/memberCount)/(deaths/memberCount + 1)`; wars use win fraction;
survival uses mean survival minutes; territory uses plugin-reported claim units.
The final score is the weighted sum times 100. Missing or invalid metrics leave
the faction unranked. Weights must be finite, non-negative and sum to one.
This formula and normalization policy need owner approval before live activation.

Top survivors currently means current survival duration, with stable UUID tie
breaks. Other categories are kills, deaths, longest survival, playtime and K/D.
Deathless K/D is rendered as text, never serialized numeric Infinity. A 0/0
record is 0.00. Cooldowns require authoritative DeathBan expiresAt and revocation
state; do not derive bans from a death alone or browser clock guesses. The current
profile shows recorded expiry timestamps only. Event countdowns use published
event schedules and never claim an event has started just because time elapsed.

## Unknowns requiring owner/server confirmation

- Actual season ID, schedule, progression and enabled plugin configuration.
- UUID linkage and public visibility policy for existing website members.
- Faction plugin capabilities, power/claim units, history and war semantics.
- Approved ranking weights and metric definitions.
- Verified public Discord invitation.
- Plugin ownership, secure ingestion deployment and credential rotation process.

No paid service or additional database infrastructure is required by this plan.
