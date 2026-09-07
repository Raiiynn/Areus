# ADR-0001: Technology stack

| Field | Value |
|---|---|
| Status | accepted |
| Date | 2026-08-22 |
| Deciders | Autonomous build, under FULL_BUILD.md §58 |

## Context

AREUS must be rebuilt from nothing. The original repository is unavailable
(FULL_BUILD §64), and the live site exposes no framework fingerprints through
the tooling available here — `WebFetch` converts pages to markdown and discards
`<script>` tags.

FULL_BUILD §117 forbids inventing a stack before inspecting the project.
Inspection found an empty directory, so there was no stack to discover; it had
to be decided. §58 governs that case: make the best decision and continue
rather than block.

## Decision drivers

1. The spec itself names Server Actions, server components, strict TypeScript,
   and React GSAP integration — the stack is heavily implied by the requirements.
2. The live deployment target is Vercel.
3. The build must run offline, on Windows, with no cloud account or database
   server.
4. Rating and role logic must be testable without a browser.

## Options considered

### A. Next.js 15 App Router + TypeScript + Prisma/PostgreSQL

- Satisfies every stack signal in the spec directly.
- PostgreSQL keeps local and production behavior aligned.
- Server Actions put validation and authorization on the server by default,
  which suits §1332.

### B. Vite + React SPA with a separate API server

- Two processes, two deploy targets, more moving parts.
- §29 demands server rendering for SEO; an SPA fights that.
- Rejected.

## Decision

**Option A.** Next.js 15 App Router, TypeScript strict, Prisma with
PostgreSQL, Tailwind with a custom token layer, GSAP for animation, Zod for
validation, bcryptjs for password hashing, Vitest for testing.

## Rationale

Every stack signal in FULL_BUILD points at Next.js and nothing points
elsewhere. PostgreSQL is used locally and in production so provider behavior
is consistent across environments.

PostgreSQL is required because SQLite does not persist on Vercel's filesystem.
Using it locally as well avoids an untested provider switch at deployment time.
The schema avoids raw SQL and provider-specific column types so the same schema
can be used across environments.

bcryptjs over argon2id is a deliberate reduction in hash strength, chosen for
build reliability on Windows. It is isolated in `src/lib/auth/password.ts` so
replacing it is a single-file change.

## Consequences

**Positive**

- Local and production database behavior use the same provider.
- Server-first rendering satisfies the SEO requirements in §29.
- One language across the whole stack.

**Negative**

- A PostgreSQL database is required for local development and deployment.
- bcryptjs is slower than a native binding and weaker than argon2id.
- Server Actions are Next-specific, so the delivery layer is not portable.

**Neutral**

- Tailwind is present but constrained by a token layer.

## Trade-offs accepted

Local database provisioning is required for production parity. Hash strength is
still reduced for build reliability. Both choices are isolated and reversible.

## Follow-up actions

- [x] Switch the Prisma provider to `postgresql`
- [ ] Reconsider argon2id once the deployment platform is Linux
