# Feature: Hardcore SMP portal

| Field | Value |
|---|---|
| Status | Frontend implemented; integration and release verification pending |
| Author | Codex |
| Date | 2026-10-14 |
| Related ADR | adr/0002-smp-public-read-model.md |

## Summary and problem
Transform the public PvP landing experience into a private Hardcore SMP season,
survival, and faction portal. Keep existing account, administration, Discord,
match, and rating workflows intact. Existing ratings are not survival statistics.

## Verified audit
- package.json: Next.js 15, React 19, TypeScript, Tailwind, Prisma, Vitest.
- prisma/schema.prisma: PostgreSQL; users have Minecraft usernames, not UUIDs.
  No season, faction, death, or SMP statistics models exist.
- src/app/layout.tsx: server-owned session and notification lookup.
- src/lib/auth/authorization.ts: centralized authorization.
- src/services/players.ts: public projections exclude emails and password hashes.
- public/areus-logo.png: existing brand asset retained.
- src/app/fonts.ts: existing next/font loading must remain self-hosted for CSP.
- Existing public routes include /leaderboards, /gamemodes and username profiles.
- Deployed website could not be inspected through the web tool.
- Root MASTER_PROMPT.md and PROJECT_CONTEXT.md exist; supporting guidance lives
  under .claude/. Historical greenfield and SQLite statements are stale.

## Users, flow, and permissions
Visitors browse overview, mechanics, rankings, factions, players, events, rules,
and community. Private account and staff operations retain their current gates.
No new public mutation or ingestion endpoint is introduced.

## Architecture and sitemap
Server pages -> services/hardcore.ts (explicit unavailable read model until an
authoritative integration exists) -> domain/hardcore.ts (typed public contracts
and pure ranking rules). Client components own only local display filters.

Routes: /, /minecraft, /leaderboard, /factions, /players, /events, /rules,
/community; details /factions/[id], /events/[id]. Existing /players/[username]
remains compatible; UUID-backed SMP profiles require verified identity migration.
Existing /leaderboards and /gamemodes remain accessible as legacy PvP records.

## Requirements and acceptance criteria
- Preserve logo, auth, legacy records and working routes.
- Apply requested blue surfaces, Inter body, Space Grotesk headings.
- Provide responsive overview, mechanics, ranking filters and detail layouts.
- Never publish fabricated records, server addresses, credentials, or private data.
- Distinguish unavailable telemetry from zero and offline.
- Present Season 01 as a proposed season until configured, not a live season.
- Show requested mechanics as planned, with operational status unconfirmed.
- Keep faction weights proposed, normalized, and missing-data aware.
- Handle loading, empty, unknown IDs, query boundaries and integration downtime.

## Non-goals and data/API changes
No destructive migration, live-server configuration, production deployment or
unverified Discord invite. No database changes or new HTTP endpoints in this slice.
Integration recommendations are in SMP_INTEGRATION.md.

## Edge cases and failure modes
Empty and unavailable snapshots show actionable explanatory states. Unknown
detail IDs render the Next not-found state, not invented entities. Zero deaths never divides by zero.
Missing faction metrics do not become zero-score rankings. No cooldown is inferred
from a browser clock. Lists use bounded pagination. User strings render through
React escaping. Configured backend and database availability remain unknown.

## Testing and rollout
Unit tests cover ranking, validation, filters and zero/missing values. Run lint,
types, tests, build, static responsive audit and browser verification if available.
User authorized continuing after baseline failures: 98 tests passed, 85 skipped
because test database setup failed; Prisma generate hit Windows EPERM rename.
These remain baseline limitations and must not be reported as passing.
Rollback is reverting this frontend slice; no database rollback is necessary.

## Todos
- [x] Audit repository and read actual guidance locations.
- [x] Specify public read-model boundaries and safe legacy compatibility.
- [x] Implement domain contracts, proposed ranking, and behavior tests.
- [x] Implement blue design, navigation, homepage, mechanics and public routes.
- [x] Add data-aware leaderboard, directory and profile layouts.
- [ ] Document backend integration and verify all quality gates.
- [x] Complete self review and item-by-item checklist report: SMP_VERIFICATION.md.
