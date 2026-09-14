# Deployment

> Last verified: 2026-09-07.
>
> The application has not been deployed from this workspace. Production
> prerequisites below must be configured and verified in the target account.

## Local development

Requires Node 22+ and npm 10+, plus a Supabase PostgreSQL project.

```bash
npm install
cp .env.example .env          # then set SESSION_SECRET (see below)
npm run db:push               # local development only
npm run db:seed               # gamemodes and tier bands (reference data only)
npm run dev                   # http://localhost:3000
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### First account

No accounts are seeded — the seed writes gamemodes and tier bands only, so a
fresh database has no users at all.

That leaves a chicken and egg: a registration can only be approved by an
administrator, and there is no administrator yet. Break it once, by hand:

1. Register at `/register`.
2. `npx prisma studio`, open `User`, and set `role` to `OWNER` and `status` to
   `APPROVED` on that row.

From then on every account goes through the normal approval flow, from `/admin`
or from the Discord approval channel.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Supabase pooler connection string for runtime/Vercel |
| `DIRECT_URL` | yes | Supabase direct connection string for Prisma migrations and `db push` |
| `SESSION_SECRET` | yes | 32-byte hex. Rotating it invalidates every session |
| `SITE_URL` | yes | Absolute URLs and Open Graph metadata |
| `RESEND_API_KEY` | yes | Password reset email delivery |
| `EMAIL_FROM` | yes | Verified sender for password reset email |
| `EVIDENCE_BUCKET` | yes | S3-compatible bucket for private evidence |
| `EVIDENCE_REGION` | yes | Object storage region |
| `EVIDENCE_ENDPOINT` | no | Custom endpoint for R2, MinIO, or another S3-compatible provider |
| `EVIDENCE_FORCE_PATH_STYLE` | no | Use path-style requests when required by the provider |
| `EVIDENCE_ACCESS_KEY_ID` | yes | Object storage access key |
| `EVIDENCE_SECRET_ACCESS_KEY` | yes | Object storage secret |
| `CRON_SECRET` | yes | Secret for the escalation cron endpoint |
| `DISCORD_BOT_TOKEN` | no | Discord approval channel. Its presence switches the whole integration on |
| `DISCORD_PUBLIC_KEY` | no | Verifies interaction signatures |
| `DISCORD_APPLICATION_ID` | no | Addresses interaction follow-ups |
| `DISCORD_GUILD_ID` | no | The one guild whose clicks are honoured |
| `DISCORD_APPROVALS_CHANNEL_ID` | no | Where approval cards are posted |

The five Discord variables are all-or-nothing: unless every one is set the
integration is inert — nothing is posted and the interactions endpoint answers
503. That is the state the test suite runs in, and it is why no test needs to
mock the network. Buttons require a Discord **Application**, not a channel
webhook; set its Interactions Endpoint URL to
`<SITE_URL>/api/discord/interactions`, and give the bot
VIEW_CHANNEL and SEND_MESSAGES in the approvals channel.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` then `next build` |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (uses a separate PostgreSQL test database) |
| `npm run db:migrate` | Apply committed Prisma migrations in production |
| `npm run db:push` / `db:seed` / `db:reset` | Development schema and data |
| `npm run audit:responsive` | Static responsive-risk scan |
| `npm run audit:e2e` | HTTP end-to-end checks against a running server |
| `npm run gates` | lint, typecheck, test, build, responsive audit |

## Before deploying — required work

These are blocking, not optional.

### 1. Configure Supabase PostgreSQL

Create a Supabase project and open **Connect > ORMs > Prisma**. Set:

- `DATABASE_URL` to the pooler URI on port `6543`, including
   `pgbouncer=true&connection_limit=1`.
- `DIRECT_URL` to the direct database URI on port `5432`.

Set both variables locally and in Vercel. `DATABASE_URL` is used by the app at
runtime; `DIRECT_URL` is used by Prisma for schema changes and migrations.

The Prisma datasource declares both URLs in `prisma/schema.prisma`.

The schema avoids raw SQL and provider-specific types, but the application must
still be validated against the actual PostgreSQL version before production.

### 2. Apply migrations

An initial migration now exists under `prisma/migrations/`. Run
`npm run db:migrate` against the production database before deploying the
application. Keep `prisma db:push` limited to disposable development databases.

### 3. Configure object storage

Production evidence is stored in the configured S3-compatible bucket. The
filesystem adapter remains available only for local development and tests.
Use a private bucket with no public listing or public object access.

### 4. Configure email

Password reset links are sent through the Resend API. Verify `EMAIL_FROM` in
Resend and set `RESEND_API_KEY` in the deployment environment. The reset token
is never returned to the browser.

### 5. Verify rate limiting

Login, password reset, and match submission actions use PostgreSQL-backed fixed
window limits. Keep the database available to the application and add provider
edge limits as a second layer if abuse volume warrants it.

### 6. Schedule escalation — **not yet configured**

`/api/cron/escalate` exists and is authenticated with `CRON_SECRET`, but nothing
currently calls it. A scheduler must be attached before this deployment can be
considered complete.

The endpoint is the only caller of `escalateOverdueMatches()`. Until something
invokes it, a match whose opponent never confirms within
`OPPONENT_CONFIRMATION_WINDOW_HOURS` (48) stays in `PENDING_OPPONENT`
indefinitely: it never reaches the admin queue and no Discord card is posted.
The failure is silent — nothing errors, the matches simply stop moving.

The repository previously carried a `vercel.json` scheduling it every 15
minutes. That was removed because Vercel's Hobby plan permits **daily cron jobs
only**, and a more frequent expression is rejected at deploy time, before the
build runs — which blocked every deployment. Three ways to restore scheduling:

| Option | Cadence | Cost |
|---|---|---|
| Scheduled GitHub Actions workflow calling the endpoint with `Bearer $CRON_SECRET` | ~15 min, best effort | free; needs `CRON_SECRET` and `SITE_URL` as repository secrets |
| External cron service hitting the same URL | any | varies |
| Restore `vercel.json` with a daily schedule such as `0 3 * * *` | once per day, ±59 min | free; escalation is delayed up to ~25 h past the 48 h window |

## Deployment procedure (untested)

1. Confirm every gate passes on the exact commit: `npm run gates`
2. Provision Postgres, set `DATABASE_URL`
3. Set `SESSION_SECRET` and `SITE_URL`
4. Run `npm run db:migrate` **before** deploying the code that depends on them
5. Deploy
6. Run `npm run audit:e2e -- https://your-host` against the deployed environment
7. Watch error rate and latency through an agreed observation window

## Rollback

Redeploy the previous build. If the release included a migration, the migration
must be reversed first — and expand/migrate/contract staging (see
`.claude/prompts/DATABASE_MIGRATION.md`) is what keeps that possible.

## Monitoring

Configure uptime checks for `/`, `/api/live/version`, database backup alerts,
and error-rate alerts in the hosting provider before launch. The application
does not bundle a metrics backend.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `EADDRINUSE` on start | A previous server still holds the port |
| Empty leaderboards | Expected until matches are approved — ratings only exist once a match has been reviewed |
| Empty gamemode list | Reference data missing — run `npm run db:seed` |
| Cannot reach `/admin` | No approved OWNER or ADMIN exists yet. See "First account" |
| Avatars not loading | `mc-heads.net` unreachable, or the host is missing from `next.config.mjs` `remotePatterns` |
| Every rating is 1000 | Matches submitted but never approved; ratings only move on admin approval |
