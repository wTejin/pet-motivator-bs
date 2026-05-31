const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  const c = await db.coach.count()
  const p = await db.player.count()
  const pet = await db.pet.count()
  const s = await db.shopItem.count({ where: { coachId: null } })
  const now = Date.now()
  const d7 = now + 7 * 24 * 3600 * 1000
  const coaches = await db.coach.findMany()
  const active = coaches.filter(c => c.isActive && Number(c.authorizedUntil) > now).length
  const expiring = coaches.filter(c => c.isActive && Number(c.authorizedUntil) > now && Number(c.authorizedUntil) <= d7).length
  const expired = coaches.filter(c => c.isActive && Number(c.authorizedUntil) > 0 && Number(c.authorizedUntil) <= now).length
  console.log('DB counts:', { coaches: c, players: p, pets: pet, shopItems: s })
  console.log('Coach stats:', { total: coaches.length, active, expiring, expired })
  console.log('Coach details:')
  coaches.forEach(c => {
    console.log(`  ${c.name} active=${c.isActive} authUntil=${new Date(Number(c.authorizedUntil)).toLocaleDateString()}`)
  })
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect() })
