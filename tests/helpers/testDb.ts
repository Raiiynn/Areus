import { execSync } from 'node:child_process'
import bcrypt from 'bcryptjs'

import { ROLES, STARTING_RATING, USER_STATUSES } from '@/domain/constants'
import { db } from '@/lib/db'

/**
 * Integration test database.
 *
 * `vitest.config.ts` sets DATABASE_URL to a dedicated PostgreSQL database
 * before any module loads, so the services under test never touch development
 * or production data.
 *
 * The schema is pushed to the isolated test database before each run, so the
 * suite starts clean and leaves no state in development or production.
 */

const TEST_DB_URL = process.env.DATABASE_URL

export function resetTestDatabase(): void {
  if (!TEST_DB_URL?.startsWith('postgresql://')) {
    throw new Error('Tests require an isolated PostgreSQL DATABASE_URL.')
  }

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: {
      ...process.env,
      DATABASE_URL: TEST_DB_URL,
      DIRECT_URL: TEST_DB_URL,
    },
    stdio: 'pipe',
  })
}

/** Empties every table without dropping the file. Children before parents. */
export async function clearTables(): Promise<void> {
  await db.discordApproval.deleteMany()
  await db.auditLog.deleteMany()
  await db.notification.deleteMany()
  await db.ratingHistory.deleteMany()
  await db.matchEvidence.deleteMany()
  await db.match.deleteMany()
  await db.playerGamemodeRating.deleteMany()
  await db.passwordResetToken.deleteMany()
  await db.session.deleteMany()
  await db.user.deleteMany()
  await db.tier.deleteMany()
  await db.gamemode.deleteMany()
}

/** Two gamemodes, three tiers, an owner, an admin and four players. */
export async function seedFixture() {
  const passwordHash = await bcrypt.hash('test-password-1234', 4)

  const sword = await db.gamemode.create({
    data: {
      slug: 'sword',
      name: 'Sword',
      description: 'Melee duelling.',
      rules: 'Diamond sword.',
      icon: 'sword',
      themeToken: 'mode-sword',
      sortOrder: 0,
    },
  })

  const inactive = await db.gamemode.create({
    data: {
      slug: 'retired',
      name: 'Retired',
      description: 'Not in use.',
      rules: 'None.',
      icon: 'none',
      themeToken: 'mode-default',
      sortOrder: 9,
      active: false,
    },
  })

  await db.tier.createMany({
    data: [
      { label: 'S', minRating: 1100, maxRating: null, colorToken: 'tier-s', sortOrder: 0 },
      { label: 'B', minRating: 900, maxRating: 1099, colorToken: 'tier-b', sortOrder: 1 },
      { label: 'D', minRating: 0, maxRating: 899, colorToken: 'tier-d', sortOrder: 2 },
    ],
  })

  const makeUser = (username: string, role: string, status: string) =>
    db.user.create({
      data: {
        username,
        usernameNormalized: username.toLowerCase(),
        email: `${username.toLowerCase()}@test.local`,
        emailNormalized: `${username.toLowerCase()}@test.local`,
        passwordHash,
        minecraftUsername: username,
        role,
        status,
      },
    })

  const owner = await makeUser('Owner', ROLES.OWNER, USER_STATUSES.APPROVED)
  const admin = await makeUser('Admin', ROLES.ADMIN, USER_STATUSES.APPROVED)
  const alice = await makeUser('Alice', ROLES.PLAYER, USER_STATUSES.APPROVED)
  const bob = await makeUser('Bob', ROLES.PLAYER, USER_STATUSES.APPROVED)
  const pendingPlayer = await makeUser('Pending', ROLES.PLAYER, USER_STATUSES.PENDING)
  const suspended = await makeUser('Suspended', ROLES.PLAYER, USER_STATUSES.SUSPENDED)

  for (const user of [alice, bob]) {
    await db.playerGamemodeRating.create({
      data: {
        userId: user.id,
        gamemodeId: sword.id,
        rating: STARTING_RATING,
        // Past the provisional window, so K is the established 20 and the
        // expected deltas in the tests are stable.
        matchesPlayed: 20,
      },
    })
  }

  return { sword, inactive, owner, admin, alice, bob, pendingPlayer, suspended }
}

/** Evidence payload carrying a distinct hash per call. */
export function fakeEvidence(seed = 'a') {
  const hash = seed.repeat(64).slice(0, 64)
  return {
    storagePath: `${hash}.png`,
    mimeType: 'image/png',
    byteSize: 1024,
    detectedType: 'png',
    sha256: hash,
  }
}

export { db }
