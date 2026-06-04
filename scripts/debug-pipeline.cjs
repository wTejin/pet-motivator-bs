const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
const { computePipeline } = require('/app/dist/src/services/pipeline/index.js')

async function main() {
  const p = await db.player.findFirst({ where: { name: '小明' } })
  console.log('Player:', p?.name)

  const bio = await db.playerBiometric.findFirst({ where: { playerId: p.id }, orderBy: { measuredAt: 'desc' } })
  console.log('Bio:', bio ? `${bio.heightCm}cm ${bio.weightKg}kg` : 'NONE')

  const ninetyDaysAgo = Date.now() - 90 * 24 * 3600 * 1000
  console.log('90 days ago:', ninetyDaysAgo, 'now:', Date.now())
  const assessments = await db.dailyAssessment.findMany({
    where: { playerId: p.id, createdAt: { gte: ninetyDaysAgo } },
    orderBy: { createdAt: 'asc' },
  })
  console.log('Assessments:', assessments.length)

  try {
    const result = await computePipeline(p.id)
    console.log('Result:', result)
  } catch (e) {
    console.error('Error:', e.message, e.stack)
  }
  await db.$disconnect()
}
main()