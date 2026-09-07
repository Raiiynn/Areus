/** Ad-hoc ladder inspection. Not part of the app; useful when tuning the seed. */
import { PrismaClient } from '@prisma/client'
import { resolveTier } from '../src/domain/tiers'

const db = new PrismaClient()

async function main() {
  const tiers = await db.tier.findMany({ orderBy: { sortOrder: 'asc' } })
  const rows = await db.playerGamemodeRating.findMany({
    where: { gamemode: { slug: 'sword' } },
    orderBy: { rating: 'desc' },
    include: { user: { select: { username: true } } },
  })

  console.log('Sword ladder:')
  const counts = new Map<string, number>()
  for (const r of rows) {
    const t = resolveTier(r.rating, tiers)?.label ?? '-'
    counts.set(t, (counts.get(t) ?? 0) + 1)
    console.log(`  ${t}  ${r.user.username.padEnd(10)} ${r.rating}  W${r.wins}/L${r.losses}`)
  }

  console.log('\ntier distribution:', [...counts.entries()].map(([k, v]) => `${k}=${v}`).join(' '))

  const agg = await db.playerGamemodeRating.aggregate({ _sum: { rating: true }, _count: true })
  console.log('mean rating:', Math.round((agg._sum.rating ?? 0) / agg._count))
}

main().finally(() => db.$disconnect())
