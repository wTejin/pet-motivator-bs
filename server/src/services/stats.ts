import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

export async function refreshPlayerStatsCache(playerId: string, coachId: string) {
  const dimensions = await db.scoreDimension.findMany({
    where: { coachId, isActive: true },
    include: { indicators: { where: { isActive: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  if (dimensions.length === 0) return

  const indicatorScores = await db.scoreRecord.groupBy({
    by: ['indicatorId'],
    where: { playerId, indicatorId: { not: null }, type: { in: ['earn', 'penalty'] } },
    _sum: { points: true },
  })
  const scoreMap = new Map(indicatorScores.map(s => [s.indicatorId, s._sum.points || 0]))

  const dimStats = dimensions.map((dim) => {
    const maxScore = dim.indicators.reduce((sum, i) => sum + i.dailyLimit * 7, 0)
    const dimTotal = dim.indicators.reduce((sum, ind) => sum + (scoreMap.get(ind.id) || 0), 0)
    const indicators = dim.indicators.map(ind => ({
      indicatorId: ind.id,
      indicatorName: ind.name,
      score: scoreMap.get(ind.id) || 0,
    }))
    return {
      dimensionId: dim.id,
      dimensionName: dim.name,
      icon: dim.icon,
      score: Math.min(99, Math.round((dimTotal / Math.max(1, maxScore)) * 99)),
      maxScore,
      indicators,
    }
  })

  const overall = Math.round(dimStats.reduce((s, d) => s + d.score, 0) / dimStats.length)
  const now = Date.now()

  await db.playerStatsCache.upsert({
    where: { playerId },
    create: { playerId, overall, dimensionJson: dimStats as any, updatedAt: now },
    update: { overall, dimensionJson: dimStats as any, updatedAt: now },
  })
}
