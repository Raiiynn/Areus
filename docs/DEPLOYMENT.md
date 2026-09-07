# Deployment

> Last verified: 2026-08-22.
>
> **The application has not been deployed.** It runs locally and builds
> cleanly. The production section below is a plan, not a record — nothing in it
> has been executed.

## Local development

Requires Node 22+ and npm 10+, plus a Supabase PostgreSQL project.

```bash
npm install
cp .env.example .env          # then set SESSION_SECRET (see below)
npm run db:push               # create the PostgreSQL schema during development
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
| `NEXT_PUBLIC_SITE_URL` | yes | Absolute URLs and Open Graph metadata |
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
`<NEXT_PUBLIC_SITE_URL>/api/discord/interactions`, and give the bot
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
| `npm run db:push` / `db:seed` / `db:reset` | Schema and data |
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

### 2. Adopt migrations

Development uses `prisma db push`, which leaves no history. Switch to
`prisma migrate` and generate an initial migration before any production data
exists.

### 3. Move evidence to object storage

Evidence is written to `var/evidence/` on the local filesystem. Serverless
platforms have ephemeral disks, so this must move to S3, R2 or equivalent.
`src/lib/evidence.ts` is the only module that touches storage.

### 4. Configure email

Password reset currently surfaces its link in the UI because no SMTP exists.
`forgotPasswordAction` returns `devResetPath` — that must be removed and
replaced with a real transport.

### 5. Add rate limiting

Nothing throttles login or submission at the HTTP edge. See SECURITY.md.

### 6. Schedule escalation

`escalateOverdueMatches()` exists but nothing calls it. Wire it to a cron job so
unanswered confirmations actually escalate after 48 hours. This now matters more
than it did: the function publishes a Discord card for each match it escalates,
so until it is scheduled, escalated matches reach neither the channel nor an
admin's attention on their own.

## Deployment procedure (untested)

1. Confirm every gate passes on the exact commit: `npm run gates`
2. Provision Postgres, set `DATABASE_URL`
3. Set `SESSION_SECRET` and `NEXT_PUBLIC_SITE_URL`
4. Run migrations **before** deploying the code that depends on them
5. Deploy
6. Run `npm run audit:e2e -- https://your-host` against the deployed environment
7. Watch error rate and latency through an agreed observation window

## Rollback

Redeploy the previous build. If the release included a migration, the migration
must be reversed first — and expand/migrate/contract staging (see
`.claude/prompts/DATABASE_MIGRATION.md`) is what keeps that possible.

## Monitoring

Not configured. There is no metrics backend, no alerting and no uptime check.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `EADDRINUSE` on start | A previous server still holds the port |
| Empty leaderboards | Expected until matches are approved — ratings only exist once a match has been reviewed |
| Empty gamemode list | Reference data missing — run `npm run db:seed` |
| Cannot reach `/admin` | No approved OWNER or ADMIN exists yet. See "First account" |
| Avatars not loading | `mc-heads.net` unreachable, or the host is missing from `next.config.mjs` `remotePatterns` |
| Every rating is 1000 | Matches submitted but never approved; ratings only move on admin approval |
