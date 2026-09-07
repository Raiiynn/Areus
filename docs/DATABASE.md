# Database

> Describes the schema as implemented in `prisma/schema.prisma`.
> Last verified: 2026-08-22.

## Technology

Prisma 6 over Supabase PostgreSQL in development and production. The schema deliberately
avoids raw SQL and provider-specific column types so the local and Vercel
databases use the same provider (ADR-0001).

`DATABASE_URL` is the Supabase pooler URL used at runtime. `DIRECT_URL` is the
direct Supabase URL used by Prisma for migrations and `db push`.

Role and status columns are `String` because their legal values are owned by the
application. They live in `src/domain/constants.ts` and are enforced by Zod at
every boundary. Application code must never compare these against bare string
literals — import the constants.

## Entities

```
User ──┬── Session
       ├── PasswordResetToken
       ├── PlayerGamemodeRating ──── Gamemode
       ├── RatingHistory ──────┬──── Gamemode
       │                       └──── Match
       ├── Match (submitter / opponent / winner / reviewer)
       ├── Notification
       └── AuditLog (actor)

Match ──── MatchEvidence
Tier   (standalone — thresholds only)
```

## Tables

### User

Identity, role and approval status.

| Column | Notes |
|---|---|
| `username` / `usernameNormalized` | Display casing preserved; the normalized (lowercased) column carries uniqueness and every lookup |
| `email` / `emailNormalized` | Same pattern |
| `passwordHash` | bcrypt, cost 12 |
| `role` | `PLAYER` \| `ADMIN` \| `OWNER` |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` \| `SUSPENDED` |
| `statusReason`, `statusChangedAt`, `statusChangedById` | Who changed it and why |
| `discordUserId` | Nullable, unique. Set by staff who approve from the Discord channel; uniqueness stops one Discord account speaking for two admins |

Indexed on `status` and `role` — both drive admin queue filters.

### Gamemode

The single source of truth (see ARCHITECTURE.md). `active` and `sortOrder` mean
adding or retiring a gamemode is a data change, never a code change.

Indexed on `(active, sortOrder)`, which is exactly how every list queries it.

### Tier

Configurable thresholds. `maxRating` is null on the top tier. Tier is **derived
from rating at read time** and never stored on a player, so retuning the bands
does not require a migration or a backfill.

### PlayerGamemodeRating

One row per player per gamemode. Unique on `(userId, gamemodeId)`.

Indexed on `(gamemodeId, rating)` — the leaderboard query is filter by gamemode,
order by rating descending, which this index serves directly.

`matchesPlayed` drives the provisional K-factor.

### RatingHistory

**Append-only.** Rows are never updated or deleted. A player's rating is a
projection of these rows, so any rating can be traced back to the match that
caused it.

Unique on `(matchId, userId)` — a match produces exactly one history row per
player, which is also what makes double-approval detectable at the schema level.

`engine` records which algorithm produced the change, so a future migration away
from ELO stays auditable.

### Match

| Column | Notes |
|---|---|
| `submitterId` | Always from the session, never from a form |
| `winnerId` | Denormalized. Recomputing from scores would work today, but the winner is part of the permanent record |
| `status` | See the lifecycle in ARCHITECTURE.md |
| `escalatesAt` | When the opponent-confirmation window lapses |
| `suspicious`, `suspicionReasons` | Set by heuristics at submission; advisory only, never punitive |
| `reviewedById`, `reviewedAt`, `reviewReason` | Admin decision trail |

Indexed on `(status, createdAt)`, `(gamemodeId, status)`, `submitterId`,
`opponentId`.

### MatchEvidence

Files live under `var/evidence/`, outside the web root, and are served only
through an authorized route handler.

Storage is content-addressed by SHA-256, so identical uploads collapse to one
file and the filename carries no user-controlled text — path traversal through a
crafted filename is impossible. `detectedType` is the type read from the file's
magic bytes, not the client's claim.

Indexed on `sha256` so reused evidence is cheap to detect.

### Notification / AuditLog

`Notification` is per-user, indexed on `(userId, readAt, createdAt)`.

`AuditLog` records every privileged action with actor, target and a JSON
metadata blob. Audit rows are written inside the same transaction as the action
they describe — an action that rolled back leaves no audit trail, and vice
versa. `metadata` never contains secrets or password material.

### DiscordApproval

One row per queue item mirrored into the Discord approval channel — a
projection, never a source of truth.

| Column | Notes |
|---|---|
| `kind` / `targetId` | `PLAYER` \| `MATCH`, and the id of the user or match |
| `channelId` | Where the card was posted |
| `messageId` | Nullable between claiming the row and the message being posted |
| `resolvedAt` | Bookkeeping only — it gates nothing |

`@@unique([kind, targetId])` is the idempotency claim: a target is published
exactly once. The row is written **before** the Discord API call, not after.
Posting first would let two concurrent publishers each create a card and the
loser's insert then collide, leaving a live-button message with no row behind it
and no way to clear it. A crash in the gap leaves `messageId` null, which the
resolver reads as "nothing to edit" — a lost card rather than a duplicate
decision.

`resolvedAt` deliberately does not gate whether a decision may still happen.
That authority belongs to the atomic claim inside `reviewPlayer`/`reviewMatch`;
a second gate here could disagree with the first.

## Migrations

Development uses `prisma db push`. **No migration history exists yet** — before
production, switch to `prisma migrate` so changes are versioned and reversible.

## Seeding

`npm run db:seed` writes **reference data only**: 9 gamemodes and 5 tier bands.
These are the two tables the application cannot function without and which no
user action creates. Everything else is earned — accounts by registering,
matches by playing, ratings by winning.

It **upserts and deletes nothing**, so it is safe to run against a live database
whenever a gamemode description or a tier threshold changes.

Earlier it built a demo world of seventeen fictional players and ~1320
played-out matches, and it began by emptying every table — including `User`.
That made it a live grenade once a real person had registered: seeding to adjust
a tier band would have deleted the actual accounts. Both the fixtures and the
destructive prelude are gone.

`npm run db:reset` still drops and recreates everything, as its name says. It is
the only command that destroys data, and after it the database holds reference
data and nothing else — including no administrator, so the first account has to
be registered and then promoted by hand.

Test fixtures use the database configured by `vitest.config.ts`; set its
`DATABASE_URL` to an isolated PostgreSQL test database before running the
integration suite.

## Backup and recovery

Not configured. PostgreSQL backups must be configured with the managed database
provider before production.
will need a real backup policy before launch.
