# API

> Describes what exists today. Last verified: 2026-08-22.

## Shape of this application

AREUS has **no public REST API**. Mutations go through Next.js Server Actions
and reads happen in server components. That is a deliberate consequence of
ADR-0001: putting mutations behind Server Actions means validation and
authorization run on the server by default, rather than depending on every
client remembering to send the right thing.

There is exactly one HTTP route handler.

## Server Actions

Each action follows the same shape: **authorize, validate, delegate, revalidate.**
None of them contains business logic — that lives in `src/services`.

### Authentication — `src/server/actions/auth.ts`

| Action | Authorization | Validated by |
|---|---|---|
| `registerAction` | none (public) | `registerSchema` |
| `loginAction` | none (public) | `loginSchema` |
| `logoutAction` | current session | — |
| `forgotPasswordAction` | none (public) | `forgotPasswordSchema` |
| `resetPasswordAction` | valid reset token | `resetPasswordSchema` |

Notes:

- `registerAction` sets role and status server-side. There is no input field for
  either, so a crafted form cannot create an approved admin.
- `loginAction` returns an identical message and shape for "no such user" and
  "wrong password", and burns equivalent time on both paths, so neither the
  response nor its timing reveals which usernames exist.
- `forgotPasswordAction` responds identically whether or not the account exists.
- `resetPasswordAction` invalidates every session for the account on success.

### Matches — `src/server/actions/matches.ts`

| Action | Authorization | Validated by |
|---|---|---|
| `submitMatchAction` | `requireApprovedUser` | `submitMatchSchema` + magic-byte check |
| `respondToMatchAction` | `requireApprovedUser` + must be the named opponent | `confirmMatchSchema` |
| `cancelMatchAction` | `requireApprovedUser` + must be the submitter | — |
| `reviewMatchAction` | `requireAdmin` | `reviewMatchSchema` |

`submitMatchSchema` has **no field for the submitter identity** — it comes from
the session. Sending one is rejected, because the schema is `.strict()`.

Object-level ownership for confirm and cancel is checked inside the service
against the caller's id, so holding another player's match id achieves nothing.

### Administration — `src/server/actions/admin.ts`

| Action | Authorization | Validated by |
|---|---|---|
| `reviewPlayerAction` | `requireAdmin` | `reviewPlayerSchema` |
| `changeRoleAction` | `requireOwner` | `changeRoleSchema` |

`changeRoleSchema` accepts only `PLAYER` and `ADMIN`. `OWNER` is rejected at the
schema *and* in the service — there is no code path that creates a second owner.

## Route handler

### `GET /api/evidence/[id]`

Streams a match evidence screenshot.

| | |
|---|---|
| Auth required | yes |
| Authorized for | the two players in the match, and staff |
| 200 | image bytes, `Cache-Control: private, max-age=3600`, `X-Content-Type-Options: nosniff` |
| 404 | not signed in, evidence does not exist, **or** the caller is not entitled to it |
| 500 | the row exists but the file is unreadable |

Unauthorized callers get **404, not 403**. Confirming that a particular evidence
id exists is itself a disclosure.

## Validation

Every schema lives in `src/lib/validation/schemas.ts` and uses `.strict()`, so
unknown fields are rejected rather than ignored. A field that is silently
dropped today becomes a vulnerability the moment someone adds a spread.

## Errors

Server Actions return a typed state object:

```ts
{ error?: string; fieldErrors?: Record<string, string>; success?: string }
```

Messages are written for the player and disclose nothing internal. Unexpected
errors propagate to the App Router error boundary, which shows an opaque digest
and keeps the trace server-side.

## Route handlers

Three, all authenticating themselves — there is no middleware and no edge gate.

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/evidence/[id]` | GET | Session; participant or staff | Streams a match screenshot. 404, never 403 |
| `/api/live/version` | GET | Session | Change fingerprint for the client poller. 401 when signed out |
| `/api/discord/interactions` | POST | Ed25519 request signature | Discord button and modal handling |

### `/api/discord/interactions`

The only endpoint reachable without a session cookie. Its authentication is the
Ed25519 signature Discord applies to `timestamp + rawBody`; without a valid one
nothing downstream runs.

An invalid signature returns **401**, deliberately breaking the 404-not-403
convention used everywhere else: Discord validates a new endpoint URL by sending
a bad signature and requiring a 401, and answering 404 makes the URL unsavable.

Authority to actually decide anything is separate from authentication. It comes
from `member.user.id` matching a `User.discordUserId` whose account is ADMIN or
OWNER and not suspended. Discord's own permissions and roles are never
consulted — being a Discord server admin confers nothing here.

## Not implemented

- Public REST or GraphQL API
- API tokens or machine authentication
- Outbound webhooks for third parties
- Rate limiting at the HTTP edge
