// 批量运行管道计算 — 在 Docker 容器内执行
// Usage: docker exec -w /app pet-motivator-bs-server-1 node /tmp/run-pipeline-all.cjs
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
const { computePipeline } = require('/app/dist/src/services/pipeline/index.js')

async function main() {
  const players = await db.player.findMany({ select: { id: true, name: true } })
  console.log(`Computing pipeline for ${players.length} players...`)

  let ok = 0, fail = 0
  for (let i = 0; i < players.length; i++) {
    const p = players[i]
    try {
      const result = await computePipeline(p.id)
      ok++
      console.log(`[${i + 1}/${players.length}] ${p.name}: overall=${result.overall}, tier=${result.potentialTier}, maturity=${result.maturityCategory}`)
    } catch (e) {
      fail++
      console.error(`[${i + 1}/${players.length}] ${p.name}: ERROR - ${e.message}`)
    }
  }

  console.log(`Done! ${ok} OK, ${fail} failed`)
  await db.$disconnect()
}

main()
