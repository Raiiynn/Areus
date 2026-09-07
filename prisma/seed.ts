/**
 * Reference data seed.
 *
 * Gamemodes and tier bands only. These are the two tables the application
 * cannot function without and which no user action creates — everything else in
 * the database is earned: accounts by registering, matches by playing, ratings
 * by winning.
 *
 * This script used to build a demo world of seventeen fictional players and
 * over a thousand played-out matches, and it began by emptying every table.
 * That made it unrunnable once a real person had registered: seeding to add a
 * gamemode would have deleted the actual users. It now **upserts** and deletes
 * nothing, so it is safe to run against a live database whenever the gamemode
 * or tier definitions change.
 *
 * Gamemodes: the live site showed two conflicting lists (see
 * docs/PRODUCT_AUDIT.md §5). All nine are seeded from this one table so the
 * conflict cannot recur; which are genuinely active is a product decision the
 * owner makes by toggling `active`.
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const GAMEMODES = [
  {
    slug: 'sword',
    name: 'Sword',
    description:
      'Classic melee duelling. Timing, positioning, and clean combos decide it.',
    rules:
      'Diamond sword, no shields. First to the agreed score wins. Full iron armour.',
    icon: 'sword',
    themeToken: 'mode-sword',
  },
  {
    slug: 'axe',
    name: 'Axe',
    description:
      'Heavier hits, slower recovery. Punishes greed more than any other mode.',
    rules: 'Netherite axe and shield permitted. Full iron armour.',
    icon: 'axe',
    themeToken: 'mode-axe',
  },
  {
    slug: 'crystal',
    name: 'Crystal',
    description:
      'End crystal duelling. Explosive, positional, and unforgiving of a slow reaction.',
    rules: 'Crystals, obsidian and totems permitted. Netherite armour.',
    icon: 'crystal',
    themeToken: 'mode-crystal',
  },
  {
    slug: 'uhc',
    name: 'UHC',
    description:
      'No natural regeneration. Every heart lost is gone until you earn it back.',
    rules: 'No golden apples. Natural regeneration disabled. Full iron armour.',
    icon: 'uhc',
    themeToken: 'mode-uhc',
  },
  {
    slug: 'mace',
    name: 'Mace',
    description:
      'Wind-charge mobility and heavy slam damage. Vertical duelling.',
    rules: 'Mace and wind charges permitted. Full iron armour.',
    icon: 'mace',
    themeToken: 'mode-mace',
  },
  {
    slug: 'pot',
    name: 'Pot',
    description:
      'Splash potion duelling. Health management under sustained pressure.',
    rules: 'Splash healing potions permitted. Diamond sword, full iron armour.',
    icon: 'pot',
    themeToken: 'mode-pot',
  },
  {
    slug: 'smp',
    name: 'SMP',
    description:
      'Survival-multiplayer kit. Closest to real server combat conditions.',
    rules: 'Standard SMP kit. Totems permitted. Netherite armour.',
    icon: 'smp',
    themeToken: 'mode-smp',
  },
  {
    slug: 'tnt-cart',
    name: 'TNT Cart',
    description:
      'Minecart TNT duelling. Positioning and prediction over raw aim.',
    rules: 'TNT minecarts only. Full iron armour, no healing potions.',
    icon: 'tnt',
    themeToken: 'mode-tnt',
  },
  {
    slug: 'spear',
    name: 'Spear',
    description: 'Reach duelling. Spacing discipline decides every exchange.',
    rules: 'Trident only. Full iron armour, no shields.',
    icon: 'spear',
    themeToken: 'mode-spear',
  },
]

/**
 * Tier bands, anchored to the 1000 starting rating.
 *
 * These are deliberately not the 1800/1600/1400 bands a chess ladder uses. ELO
 * in a closed competitive pool compresses around the starting rating — players
 * mostly face opponents near their own level, so the expected score stays near
 * 0.5 and deltas stay small. Bands set at 1800+ would leave every player in the
 * bottom tier forever, which is what the first seed run demonstrated.
 *
 * S is roughly +100 or better against the baseline, D roughly -100 or worse.
 * Thresholds are rows precisely so the owner can retune them as the player
 * base grows and the distribution widens (FULL_BUILD §1162).
 */
const TIERS = [
  { label: 'S', minRating: 1100, maxRating: null, colorToken: 'tier-s', sortOrder: 0 },
  { label: 'A', minRating: 1040, maxRating: 1099, colorToken: 'tier-a', sortOrder: 1 },
  { label: 'B', minRating: 980, maxRating: 1039, colorToken: 'tier-b', sortOrder: 2 },
  { label: 'C', minRating: 920, maxRating: 979, colorToken: 'tier-c', sortOrder: 3 },
  { label: 'D', minRating: 0, maxRating: 919, colorToken: 'tier-d', sortOrder: 4 },
]

async function main() {
  console.log('Seeding AREUS reference data...')

  // Upsert, keyed on the natural unique column, so re-running is a no-op and an
  // edited description or rule reaches an existing row without touching the
  // ratings and matches that reference it.
  for (const [index, gamemode] of GAMEMODES.entries()) {
    await db.gamemode.upsert({
      where: { slug: gamemode.slug },
      update: { ...gamemode, sortOrder: index },
      create: { ...gamemode, sortOrder: index },
    })
  }

  for (const tier of TIERS) {
    await db.tier.upsert({
      where: { label: tier.label },
      update: tier,
      create: tier,
    })
  }

  const [gamemodes, tiers, users] = await Promise.all([
    db.gamemode.count(),
    db.tier.count(),
    db.user.count(),
  ])

  console.log(`  ${gamemodes} gamemodes, ${tiers} tiers`)
  console.log(`  ${users} user(s) left untouched`)

  if (users === 0) {
    // Worth saying out loud: with no accounts there is no one who can approve
    // the first registration, so the first account has to be promoted by hand.
    console.log('')
    console.log('No accounts exist yet. Register one, then promote it with:')
    console.log('  npx prisma studio   (set role=OWNER, status=APPROVED)')
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
