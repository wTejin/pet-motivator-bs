const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

// 模拟 index.ts 中的 BigInt 修复
BigInt.prototype.toJSON = function () { return Number(this) }

async function main() {
  const coaches = await db.coach.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { players: true } } },
  })

  console.log('Coaches count:', coaches.length)
  console.log('Coach names:', coaches.map(c => c.name))

  const playerCount = await db.player.count()
  const petCount = await db.pet.count()
  const shopItemCount = await db.shopItem.count({ where: { coachId: null } })
  console.log('Stats:', { playerCount, petCount, shopItemCount })

  // 模拟 admin.ts stats API 的返回
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const todayNewPlayerCount = await db.player.count({ where: { createdAt: { gte: BigInt(todayStart) } } })
  console.log('Today new players:', todayNewPlayerCount)
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect() })
