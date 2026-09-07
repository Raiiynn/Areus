# Changelog

All notable changes to this project are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

Initial implementation. Nothing has been released or deployed.

### Added

**Competition**

- Nine gamemodes, each with an independent rating and ladder, driven from a
  single database table.
- ELO rating engine behind a `RatingEngine` interface, with provisional
  K-factors for a player's first ten matches in a gamemode.
- Configurable tier bands (S/A/B/C/D) derived from rating at read time.
- Immutable, append-only rating history — every rating traceable to the match
  that caused it.

**Match lifecycle**

- Match submission with screenshot evidence, opponent confirmation, and admin
  review. Ratings change only on approval, inside a single transaction.
- 48-hour opponent-confirmation window, after which a match escalates to admin
  review rather than expiring.
- Anti-manipulation heuristics: duplicate detection, reused-screenshot
  detection, submission-rate and same-opponent frequency, implausible score
  gaps. All advisory — they flag for review, never auto-punish.

**Accounts**

- Registration with an administrator approval gate before competitive access.
- Session authentication with opaque hashed tokens.
- Password reset with single-use, expiring tokens.
- Three-level role hierarchy: PLAYER < ADMIN < OWNER.

**Staff**

- Admin overview with queue counts, player approval, and a match review queue
  showing evidence, head-to-head history and suspicion flags.
- Owner-only administrator management.
- Audit log covering every privileged action, written transactionally with the
  action it records.
- Registration decisions take an optional `expectedStatus`, turning the write
  into an atomic claim so two simultaneous decisions cannot both succeed. This
  closed a real defect: `reviewPlayer` previously had no status guard, so a
  concurrent approve and reject both committed, each wrote an audit row, and the
  player received two contradictory notifications.

**Discord approvals**

- Registrations and match reviews are mirrored into a Discord channel with
  Approve and Reject buttons that perform the real decision in AREUS. Rejection
  opens a modal, because a reason is mandatory and a button carries no text.
- Requires a Discord Application, not a channel webhook: components can only be
  sent by an application-owned message, and clicks arrive at an Interactions
  Endpoint URL. Interaction requests are authenticated by Ed25519 signature.
- A click is only honoured for a Discord account linked to an AREUS
  administrator, linked by the admin on their profile. Discord's own roles and
  permissions confer nothing.
- Evidence screenshots are not sent to Discord; the card links to the admin
  queue, keeping evidence non-public.
- Inert unless all five `DISCORD_*` variables are set, which is how the test
  suite stays offline without mocking the network.
- The Discord message is a projection, never a source of truth. A Discord
  outage means a missing card; the web queue stays authoritative. There is no
  outbox or retry queue.

**Seed data**

- The seed writes reference data only — 9 gamemodes and 5 tier bands. The
  seventeen fictional players and ~1320 played-out matches are gone; the site
  shows only genuinely registered accounts.
- It upserts and no longer empties every table first. The previous version began
  with `user.deleteMany()`, so running it to adjust a tier band would have
  deleted every real account.

**Live updates**

- Pages refresh themselves when something the viewer can see changes, so a queue
  item decided from Discord does not linger on an open admin page. Polling
  rather than SSE, because serverless has no shared memory to hold an emitter.

**Interface**

- 21 pages and 3 route handlers, server-rendered.
- Design system: token layer, component library, dark competitive identity.
- GSAP motion respecting `prefers-reduced-motion`.
- Mobile-first responsive layouts; leaderboards restructure to cards below
  768px rather than scrolling sideways.
- Contextual skeletons, empty states and error states throughout.

**Quality**

- 108 automated tests across rating, tiers, match lifecycle, authorization and
  security.
- 63 HTTP end-to-end checks (`npm run audit:e2e`).
- Static responsive-risk audit (`npm run audit:responsive`).

### Fixed

- **Gamemode list divergence.** The live site advertised *TNT Cart* and *Spear*
  on its Gamemodes section while its Submit Match dropdown offered *Pot* and
  *SMP* — so a player could not submit for two advertised modes, and could
  submit for two that were not advertised. Both lists now read one table.
  See `docs/PRODUCT_AUDIT.md` §5.

- **Impersonation via free-text identity.** The live submission form accepted a
  typed username for the submitter. Identity now comes from the session and
  there is no input field for it.

### Security

- Evidence uploads validated by magic bytes rather than client `Content-Type`;
  SVG and executables rejected.
- Evidence stored outside the web root, served only to match participants and
  staff.
- Object-level authorization on every player-scoped action.
- Suspension destroys all sessions immediately.
- Security headers set globally.

### Known limitations

- Not deployed. PostgreSQL must be provisioned and validated first — see DEPLOYMENT.md.
- No rate limiting, CSP header, or explicit CSRF token.
- No email transport; password reset links surface in-app.
- `escalateOverdueMatches()` is not yet scheduled.
- No migration history (`db push` only).
- Responsive QA is static analysis plus reasoning, not real-viewport testing —
  no browser automation was available.
