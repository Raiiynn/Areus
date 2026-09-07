/**
 * Mints a real session row and prints the raw cookie token.
 *
 * Used by scripts/e2e-check.sh to exercise authenticated HTTP routes.
 * Server Actions can only be invoked with a `Next-Action` header carrying a
 * build-specific action id, so driving the login form from curl is not
 * practical; minting the session directly tests the part that matters for
 * authorization — session validation and the role gates — over real HTTP.
 *
 * Development only. It writes to whatever DATABASE_URL points at.
 *
 * Usage: npx tsx scripts/mint-session.ts <username>
 */

import { createHash, randomBytes } from 'node:crypto'

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const username = process.argv[2]
  if (!username) {
    console.error('usage: tsx scripts/mint-session.ts <username>')
    process.exit(1)
  }

  const user = await db.user.findUnique({
    where: { usernameNormalized: username.toLowerCase() },
  })

  if (!user) {
    console.error(`no such user: ${username}`)
    process.exit(1)
  }

  const token = randomBytes(32).toString('hex')

  await db.session.create({
    data: {
      tokenHash: createHash('sha256').update(token).digest('hex'),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  // Raw token only — the caller puts it in a cookie.
  console.log(token)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
