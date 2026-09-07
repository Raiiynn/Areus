# Security

> Describes controls that exist in the code today, each verified by the suite
> named against it. Last verified: 2026-08-22.

## Threat model

The realistic adversary is **an authenticated player trying to inflate their own
rating** — by impersonating someone, fabricating evidence, approving their own
matches, or reaching admin functions. Every control below aims there first.

Secondary: an unauthenticated visitor reading data they should not see.

## Trust boundaries

| Boundary | Control |
|---|---|
| Browser to Server Action | Zod `.strict()` parse, then a role gate |
| Browser to route handler | Session check, then object-level authorization |
| Uploaded file to disk | Magic-byte type detection, size cap, content-addressed name |
| Service to database | Prisma parameterized queries only; no raw SQL anywhere |
| Discord to interactions endpoint | Ed25519 signature over the raw body, then guild/channel pinning, then a linked-account role gate |

## Authentication

- Passwords hashed with bcrypt, cost 12, salted per password.
- Login failure is generic and constant-shaped for both unknown-user and
  wrong-password, with equivalent time burned on each path.
- Password reset tokens are 32 random bytes, stored only as SHA-256, single-use,
  and expire after 60 minutes.
- A successful reset destroys every session for the account.

Verified: `tests/security.test.ts`.

## Sessions

- The cookie carries an opaque 32-byte random token; only its SHA-256 is stored,
  so a database dump does not yield live sessions.
- `httpOnly`, `SameSite=Lax`, `Secure` in production.
- **No role or status is encoded in the cookie.** The user record is re-read on
  every request, so a suspension or demotion takes effect immediately rather
  than when the cookie happens to expire.
- Logout deletes the row server-side, not just the cookie.
- Suspension destroys every session for that user.

Verified: `tests/authorization.test.ts`, `scripts/e2e-check.sh`.

## Authorization

Centralized in `src/lib/auth/authorization.ts`.

- `requireAuth` — any signed-in user
- `requireApprovedUser` — signed in, approved, not suspended
- `requireRole(role)` — compares **privilege rank**, so requiring ADMIN admits
  OWNER automatically and no check can accidentally omit a higher role
- `assertOwnsOrStaff` — object-level ownership, the IDOR guard

An unrecognised role value resolves to no privilege at all — it fails closed.

Enforced invariants:

- An admin cannot act on the owner, on another admin, or on themselves.
- Only the owner can change roles.
- `OWNER` is not grantable — by schema and by service.
- Only the named opponent can confirm a match; only the submitter can withdraw
  one.

Verified: `tests/authorization.test.ts` (18 tests), `scripts/e2e-check.sh`
(role boundaries over real HTTP).

## Input handling

Every mutation parses through a Zod schema with `.strict()` before a service
sees it. Query-string filters are parsed too, and fall back to defaults rather
than throwing.

Injection: Prisma parameterizes everything; there is no raw SQL, no shell
execution, and no `eval`-family sink in the codebase.

Output: React escapes by default. There is no `dangerouslySetInnerHTML`
anywhere.

## File upload

- Type determined by **magic bytes**, never by the client `Content-Type` or the
  file extension. PNG, JPEG and WebP only.
- SVG is rejected — it can carry script.
- 5MB cap, checked before the buffer is read.
- Stored outside the web root under `var/evidence/`.
- Filename is the content hash, so nothing user-controlled reaches the path.
- Read path re-validates the stored name against a strict pattern and confirms
  the resolved path stays inside the evidence root.
- Served only to match participants and staff.

Verified: `tests/security.test.ts` — includes rejecting a PE executable, a shell
script, an SVG and a GIF.

## Anti-manipulation

Layered, and **advisory rather than punitive** — heuristics raise a flag for
human review, they never auto-punish:

- Opponent confirmation before admin review
- Duplicate submission detection
- Reused-screenshot detection by content hash
- Submission-rate and same-opponent-frequency heuristics
- Implausible score-gap heuristic
- Full audit log

## Data protection

- Public projections never select `passwordHash` or `email`.
- Suspended and rejected accounts are not publicly visible.
- Evidence is private and access-checked per request.
- Audit metadata never contains secrets.

Verified: `scripts/e2e-check.sh` asserts no hash and no email appear in public
HTML.

## Security headers

Set globally in `next.config.mjs`: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
and a restrictive `Permissions-Policy`.

## Secrets

`SESSION_SECRET` and `DATABASE_URL` come from the environment. `.env` is
gitignored; `.env.example` carries placeholders only. No secret appears in
source, fixtures, logs or the client bundle.

## Known gaps

These are real and unaddressed:

| Gap | Impact |
|---|---|
| **No rate limiting** | Login and submission endpoints can be hammered. The submission heuristics flag high rates for review, but nothing blocks at the edge |
| **No CSP header** | Nothing beyond React escaping mitigates an injected script |
| **No CSRF token** | Server Actions carry same-origin protections, but there is no explicit anti-CSRF token |
| **bcrypt, not argon2id** | A deliberate trade for Windows build reliability (ADR-0001) |
| **No migration history** | `db push` leaves no audit trail of schema changes |
| **Reset link surfaced in UI** | No SMTP exists. Must be replaced with email before production |
| **Discord linking is unverified** | An admin types their own Discord ID; nothing proves they own it. A mistyped ID grants approval rights to a stranger. Mitigated by uniqueness and an audit row on every link, not prevented. OAuth2 `identify` is the fix |

## Discord approvals

The interactions endpoint is the only route reachable without a session, so its
controls are worth stating plainly.

**Authentication** is the Ed25519 signature Discord applies to
`timestamp + rawBody`. The raw bytes are read once and never re-serialised, the
key is imported from bare hex, and a timestamp more than 300 seconds old is
refused so a captured request cannot be replayed indefinitely. Everything fails
closed; no branch returns success without a completed cryptographic check.

**Authority is separate from authentication.** A valid signature only proves the
request came from Discord — it says nothing about who clicked. The clicking
user's Discord id must match a `User.discordUserId` whose account is ADMIN or
OWNER and not suspended. Discord's `member.permissions` and `member.roles` are
never consulted: being an administrator of the Discord server confers nothing.

**Nothing in the payload is trusted.** The `custom_id` yields an opaque target
id and nothing else; the target is re-read from the database and the decision
goes through `reviewPlayer`/`reviewMatch`, which enforce every invariant
independently. Rejection reasons are re-validated against the same Zod schemas
the web forms use — the modal's `min_length` is a client-side courtesy.

**Two smaller controls.** Every outbound message sets
`allowed_mentions: { parse: [] }`, so a rejection reason containing `@everyone`
cannot ping a server through us; and player-supplied text is Markdown-escaped so
a chosen username cannot render as a link or a heading.

Evidence screenshots are deliberately **not** sent to Discord. Uploading them
would publish private evidence to everyone in the channel and leave it on
Discord's CDN permanently; the card carries a link to the admin queue instead.

## Verification status

| Area | Verified by |
|---|---|
| Password hashing, validation, file types | `tests/security.test.ts` (29) |
| Role hierarchy, escalation, session destruction | `tests/authorization.test.ts` (18) |
| IDOR, match ownership, double-approval | `tests/matchLifecycle.test.ts` (33) |
| Interaction signature, replay, tampering | `tests/discordVerify.test.ts` (10) |
| `custom_id` parsing against hostile input | `tests/discordCustomId.test.ts` (14) |
| Discord authorization and decision path | `tests/discordInteractions.test.ts` (12) |
| Atomic claim on a registration decision | `tests/adminReview.test.ts` (4) |
| Route-level authorization over HTTP | `scripts/e2e-check.sh` (63) |
