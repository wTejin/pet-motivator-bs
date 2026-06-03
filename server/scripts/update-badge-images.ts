import { PrismaClient } from '@prisma/client'

(async () => {
  const db = new PrismaClient()

  const badgeMap: Record<string, string> = {
    '皇家马德里队徽': '/logos/clubs/Real-Madrid-CF-v2002.svg',
    '巴塞罗那队徽': '/logos/clubs/FC-Barcelona-v2002.svg',
    '拜仁慕尼黑队徽': '/logos/clubs/FC-Bayern-Munchen-v2024.svg',
    '曼城队徽': '/logos/clubs/Manchester-City-v2016.svg',
    '巴黎圣日耳曼队徽': '/logos/clubs/Paris-Saint-Germain-v2013.svg',
    '尤文图斯队徽': '/logos/clubs/Juventus-FC-v2017.svg',
    '多特蒙德队徽': '/logos/clubs/Borussia-Dortmund-v1993.svg',
    '切尔西队徽': '/logos/clubs/Chelsea-FC-v2006.svg',
    '阿森纳队徽': '/logos/clubs/Arsenal-FC-v2002.svg',
    '热刺队徽': '/logos/clubs/Tottenham-Hotspur-Football-Club-v2024.svg',
    '阿贾克斯队徽': '/logos/clubs/AFC-Ajax-v2025.svg',
    '本菲卡队徽': '/logos/clubs/Sport-Lisboa-e-Benfica-v1999.svg',
    '纽卡斯尔联队徽': '/logos/clubs/Newcastle-United-Football-Club-v1988.svg',
    '亚特兰大队徽': '/logos/clubs/Atalanta-BC-v1993.svg',
    '阿根廷国家队徽': '/logos/clubs/Argentina-National-Team-v2024.svg',
    '巴西国家队徽': '/logos/clubs/Brazil-National-Team-v2019.svg',
    '英格兰国家队徽': '/logos/clubs/England-National-Team-v2013.svg',
    '葡萄牙国家队徽': '/logos/clubs/Portuguese-National-Team-v1966.svg',
  }

  let n = 0
  for (const [name, svg] of Object.entries(badgeMap)) {
    const r = await db.shopItem.updateMany({
      where: { name, isLuckyDrop: true, type: 'badge' },
      data: { imageUrl: svg },
    })
    n += r.count
  }
  console.log(`Updated ${n} badge items`)
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
