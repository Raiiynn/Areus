# Architecture

> Describes what the code does today. Last verified: 2026-08-22.

## Overview

AREUS is a server-rendered Next.js application. Public pages render on the
server so rankings are visible and indexable without JavaScript; mutations go
through Server Actions, which puts validation and authorization on the server by
default.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5, App Router |
| Language | TypeScript 5.9, `strict` + `noUncheckedIndexedAccess` |
| Database | PostgreSQL via Prisma 6 |
| Auth | Own session layer, bcryptjs |
| Validation | Zod |
| Styling | Tailwind over a CSS custom-property token layer |
| Animation | GSAP + `@gsap/react` |
| Tests | Vitest |

Rationale and rejected alternatives: `docs/adr/0001-technology-stack.md`.

## Layering

```
app/**                    Server components by default
  server/actions/**       'use server' — authorize, validate, delegate
    services/**           Business rules. No React, no Next, no HTTP types
      lib/db.ts           Prisma
```

Rules the code holds to:

- **No business logic in components.** Components read from services and render.
- **Authorization is centralized** in `lib/auth/authorization.ts`. No route
  re-implements a role check.
- **Every mutation validates at the boundary** with a Zod schema from
  `lib/validation/schemas.ts` before a service sees it.
- **Services are testable without a request** — they take plain arguments and
  return plain data, which is why `tests/matchLifecycle.test.ts` can drive the
  entire match lifecycle with no HTTP.

## Directory map

| Path | Holds |
|---|---|
| `src/app` | Routes, layouts, pages, route handlers |
| `src/components/ui` | Generic primitives (Button, Card, Field, Badge) |
| `src/components/domain` | AREUS concepts (TierBadge, LeaderboardTable) |
| `src/components/admin` | Staff-only forms |
| `src/components/motion` | GSAP wrappers (Reveal, CountUp) |
| `src/domain` | Pure rules: constants, rating engine, tiers |
| `src/lib` | Infrastructure: db, auth, evidence, validation |
| `src/services` | Application services |
| `src/server/actions` | Server Actions |
| `prisma` | Schema and seed |
| `tests` | Vitest suites |
| `scripts` | Audits and development utilities |

## Route map

**Public** — `/`, `/players`, `/players/[username]`, `/gamemodes`,
`/gamemodes/[slug]`, `/leaderboards`, `/rules`, `/login`, `/register`,
`/register/submitted`, `/forgot-password`, `/reset-password`

**Authenticated** — `/dashboard`, `/profile`, `/matches`, `/matches/submit`,
`/notifications`

**Staff** — `/admin`, `/admin/players`, `/admin/matches`

**Owner** — `/admin/admins`

**Route handler** — `GET /api/evidence/[id]`, authorized per request.

## Match lifecycle

```
submit ──▶ PENDING_OPPONENT ──confirm──▶ PENDING_ADMIN ──approve──▶ APPROVED
              │                              │                          │
              │ dispute                      │ reject                   └─▶ ratings applied
              ▼                              ▼
           REJECTED                       REJECTED

PENDING_OPPONENT ──48h with no response──▶ PENDING_ADMIN
```

Ratings change at exactly one point — admin approval — inside a transaction.
No other code path writes to `PlayerGamemodeRating`.

## Rating architecture

`domain/rating/engine.ts` defines a `RatingEngine` interface; `elo.ts`
implements it. Callers depend only on the interface, so Glicko-2 or TrueSkill
can replace ELO without touching the services. Every `RatingHistory` row records
which engine produced it, so a future migration stays auditable.

Engines are pure — no clock, no database, no randomness — which is what lets
`tests/rating.test.ts` assert properties like rating conservation directly.

## Transactional approval

Approval runs as one transaction:

1. Re-read match status **inside** the transaction (blocks double-approval)
2. Ensure both rating rows exist
3. Compute the rating change
4. Append two immutable `RatingHistory` rows
5. Update both `PlayerGamemodeRating` rows
6. Mark the match approved
7. Notify both players
8. Write the audit entry

Any failure rolls all of it back. An approved match with a missing rating update
cannot occur — asserted by `tests/matchLifecycle.test.ts`.

## Single source of truth: gamemodes

Gamemodes live in one table. Every surface — landing page, gamemode list,
leaderboards, submit dropdown, admin — reads it. There is no hardcoded gamemode
array anywhere in `src/`.

This is a direct fix for a defect observed on the live site, where the Gamemodes
section advertised *TNT Cart* and *Spear* while the submit dropdown offered
*Pot* and *SMP*. See `docs/PRODUCT_AUDIT.md` §5.

## State management

There is no client state library. Server components read from services; the few
client components hold only local UI state (drawer open, which form branch is
showing). Filters live in the URL, so a filtered view is shareable and the back
button works.

## Observability

Structured error logging via the App Router error boundary, which surfaces an
opaque digest to the user and keeps the trace server-side. Audit logging covers
every privileged action. No metrics or tracing backend is wired up.

## Known limitations

- PostgreSQL must be provisioned for local development, test, and production.
- No email transport; password reset surfaces its link in-app.
- Match escalation is a function, not a scheduled job — nothing calls
  `escalateOverdueMatches` automatically yet.
- No rate limiting at the HTTP edge.
