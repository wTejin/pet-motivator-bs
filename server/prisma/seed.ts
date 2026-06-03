import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/services/auth'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ---- 1. Default admin account ----
  const existingAdmin = await db.admin.findUnique({ where: { username: 'admin' } })
  if (!existingAdmin) {
    await db.admin.create({
      data: {
        username: 'admin',
        passwordHash: await hashPassword('admin123'),
        createdAt: Date.now(),
      },
    })
    console.log('✅ Admin created: admin / admin123')
  } else {
    console.log('⏭️  Admin already exists, skipping')
  }

  // ---- 2. Default pet species ----
  const speciesCount = await db.petSpeciesDef.count()
  if (speciesCount === 0) {
    await db.petSpeciesDef.createMany({
      data: [
        {
          id: 'default-dog',
          name: '小柯基',
          category: 'dog',
          description: '忠诚可靠的小伙伴',
          emoji: '🐶',
          backgroundColor: '#f97316',
          accentColor: '#ea580c',
          stages: { egg: { emoji: '🥚', scale: 0.5, animation: 'bounce', label: '蛋' }, level1: { emoji: '🐶', scale: 0.7, animation: 'bounce', label: '幼崽' }, level2: { emoji: '🐕', scale: 0.85, animation: 'walk', label: '少年' }, level3: { emoji: '🐕', scale: 1.0, animation: 'run', label: '成年' }, rare: { emoji: '🦊', scale: 1.2, animation: 'glow', label: '稀有' } },
        },
        {
          id: 'default-cat',
          name: '小奶猫',
          category: 'cat',
          description: '优雅灵动的小猫咪',
          emoji: '🐱',
          backgroundColor: '#ec4899',
          accentColor: '#db2777',
          stages: { egg: { emoji: '🥚', scale: 0.5, animation: 'bounce', label: '蛋' }, level1: { emoji: '🐱', scale: 0.7, animation: 'bounce', label: '幼崽' }, level2: { emoji: '😺', scale: 0.85, animation: 'walk', label: '少年' }, level3: { emoji: '😸', scale: 1.0, animation: 'run', label: '成年' }, rare: { emoji: '🦁', scale: 1.2, animation: 'glow', label: '稀有' } },
        },
        {
          id: 'default-dragon',
          name: '小火龙',
          category: 'dragon',
          description: '神秘强大的小火龙',
          emoji: '🐲',
          backgroundColor: '#ef4444',
          accentColor: '#dc2626',
          stages: { egg: { emoji: '🥚', scale: 0.5, animation: 'bounce', label: '蛋' }, level1: { emoji: '🐣', scale: 0.7, animation: 'bounce', label: '幼崽' }, level2: { emoji: '🐤', scale: 0.85, animation: 'walk', label: '少年' }, level3: { emoji: '🐉', scale: 1.0, animation: 'fly', label: '成年' }, rare: { emoji: '🐲', scale: 1.2, animation: 'glow', label: '稀有' } },
        },
      ],
    })
    console.log('✅ Default pet species created')
  }

  // ---- 2.5 Default accessory definitions ----
  const accessoryCount = await db.accessoryDef.count()
  if (accessoryCount === 0) {
    await db.accessoryDef.createMany({
      data: [
        { id: 'bow', name: '蝴蝶结', slot: 'neck', emoji: '🎀', imageUrl: '', position: { top: '72%', left: '50%', scale: 0.9 } },
        { id: 'scarf', name: '围巾', slot: 'neck', emoji: '🧣', imageUrl: '', position: { top: '70%', left: '50%', scale: 1.0 } },
        { id: 'crown', name: '皇冠', slot: 'head', emoji: '👑', imageUrl: '', position: { top: '8%', left: '50%', scale: 0.85 } },
      ],
    })
    console.log('✅ Default accessory definitions created')
  }

  // ---- 2.6 Default background definitions ----
  const backgroundCount = await db.petBackgroundDef.count()
  if (backgroundCount === 0) {
    await db.petBackgroundDef.createMany({
      data: [
        { id: 'forest', name: '森林背景', cssGradient: 'linear-gradient(135deg, #2d5a27, #4a7c59)', imageUrl: '', thumbnailColor: '#2d5a27' },
        { id: 'starry', name: '星空背景', cssGradient: 'linear-gradient(135deg, #1a1a2e, #16213e)', imageUrl: '', thumbnailColor: '#1a1a2e' },
      ],
    })
    console.log('✅ Default background definitions created')
  }

  // ---- 3. Default shop items (system-wide, coachId = null) ----
  const shopCount = await db.shopItem.count()
  if (shopCount === 0) {
    await db.shopItem.createMany({
      data: [
        { name: '狗粮', emoji: '🍖', description: '恢复饱食 20 点，囤货必备', type: 'food', usageType: 'consume', price: 10, effect: { consume: { hunger: 20 } }, imageClass: 'food-dogfood', stock: 999, isActive: true, sortOrder: 1, createdAt: Date.now() },
        { name: '高级罐头', emoji: '🥫', description: '恢复饱食 35 点 + 心情 3 点', type: 'food', usageType: 'consume', price: 25, effect: { consume: { hunger: 35, mood: 3 } }, imageClass: 'food-can', stock: 999, isActive: true, sortOrder: 2, createdAt: Date.now() },
        { name: '能量棒', emoji: '🍫', description: '恢复饱食 25 点 + 成长 2 点', type: 'food', usageType: 'consume', price: 20, effect: { consume: { hunger: 25, carePoints: 2 } }, imageClass: 'food-bar', stock: 999, isActive: true, sortOrder: 3, createdAt: Date.now() },
        { name: '蝴蝶结', emoji: '🎀', description: '装备后心情 +12', type: 'accessory', usageType: 'equip', price: 40, effect: { equip: { moodBonus: 12, decoration: 'bow' } }, imageClass: 'deco-bow', stock: 999, isActive: true, sortOrder: 4, createdAt: Date.now() },
        { name: '围巾', emoji: '🧣', description: '装备后心情 +15', type: 'accessory', usageType: 'equip', price: 55, effect: { equip: { moodBonus: 15, decoration: 'scarf' } }, imageClass: 'deco-scarf', stock: 999, isActive: true, sortOrder: 5, createdAt: Date.now() },
        { name: '皇冠', emoji: '👑', description: '装备后心情 +20', type: 'accessory', usageType: 'equip', price: 80, effect: { equip: { moodBonus: 20, decoration: 'crown' } }, imageClass: 'deco-crown', stock: 999, isActive: true, sortOrder: 6, createdAt: Date.now() },
        { name: '森林背景', emoji: '🌲', description: '更换背景，心情 +20', type: 'background', usageType: 'replace', price: 80, effect: { equip: { moodBonus: 20, backgroundId: 'forest' } }, imageClass: 'bg-forest', stock: 999, isActive: true, sortOrder: 7, createdAt: Date.now() },
        { name: '星空背景', emoji: '🌌', description: '更换背景，心情 +25', type: 'background', usageType: 'replace', price: 100, effect: { equip: { moodBonus: 25, backgroundId: 'starry' } }, imageClass: 'bg-starry', stock: 999, isActive: true, sortOrder: 8, createdAt: Date.now() },
        { name: '玩具球', emoji: '⚽', description: '心情 +8 + 成长 +3', type: 'toy', usageType: 'consume', price: 20, effect: { consume: { mood: 8, carePoints: 3 } }, imageClass: 'toy-ball', stock: 999, isActive: true, sortOrder: 9, createdAt: Date.now() },
        { name: '飞盘', emoji: '🥏', description: '心情 +12 + 成长 +5', type: 'toy', usageType: 'consume', price: 35, effect: { consume: { mood: 12, carePoints: 5 } }, imageClass: 'toy-frisbee', stock: 999, isActive: true, sortOrder: 10, createdAt: Date.now() },
        { name: '智能玩具', emoji: '🤖', description: '心情 +15 + 成长 +8', type: 'toy', usageType: 'consume', price: 60, effect: { consume: { mood: 15, carePoints: 8 } }, imageClass: 'toy-robot', stock: 999, isActive: true, sortOrder: 11, createdAt: Date.now() },
        { name: '成长药水', emoji: '🧪', description: '饱食+10 心情+15 成长+10', type: 'magic', usageType: 'consume', price: 80, effect: { consume: { hunger: 10, mood: 15, carePoints: 10 } }, imageClass: 'magic-potion', stock: 999, isActive: true, sortOrder: 12, createdAt: Date.now() },
        { name: '精灵祝福', emoji: '🧚', description: '饱食+20 心情+25 成长+20', type: 'magic', usageType: 'consume', price: 150, effect: { consume: { hunger: 20, mood: 25, carePoints: 20 } }, imageClass: 'magic-blessing', stock: 999, isActive: true, sortOrder: 13, createdAt: Date.now() },
      ],
    })
    console.log('✅ Default shop items created (13 items)')
  }

  // ---- 3.5 Lucky Drop 惊喜掉落系统 ----
  const luckyCount = await db.shopItem.count({ where: { isLuckyDrop: true } })
  if (luckyCount === 0) {
    const now = Date.now()

    // ── 3.5a 新增配饰定义（12 件）──
    const accDefs = [
      { id: 'clover_badge', name: '四叶草徽章', slot: 'body', emoji: '🍀', imageUrl: '', position: { top: '55%', left: '50%', scale: 0.6 } },
      { id: 'baseball_cap', name: '棒球帽', slot: 'head', emoji: '🧢', imageUrl: '', position: { top: '2%', left: '50%', scale: 0.75 } },
      { id: 'courage_medal', name: '勇气勋章', slot: 'neck', emoji: '🎖️', imageUrl: '', position: { top: '68%', left: '50%', scale: 0.7 } },
      { id: 'sunflower_hairpin', name: '向日葵发饰', slot: 'head', emoji: '🌻', imageUrl: '', position: { top: '5%', left: '42%', scale: 0.65 } },
      { id: 'balloon_bundle', name: '气球束', slot: 'back', emoji: '🎈', imageUrl: '', position: { top: '20%', left: '55%', scale: 0.8 } },
      { id: 'sunglasses_cool', name: '炫酷墨镜', slot: 'face', emoji: '🕶️', imageUrl: '', position: { top: '30%', left: '50%', scale: 0.9 } },
      { id: 'moon_hairpin', name: '月牙发卡', slot: 'head', emoji: '🌙', imageUrl: '', position: { top: '3%', left: '55%', scale: 0.55 } },
      { id: 'star_glasses', name: '星星大眼睛', slot: 'face', emoji: '🤩', imageUrl: '', position: { top: '30%', left: '50%', scale: 0.85 } },
      { id: 'butterfly_wings', name: '幻彩蝴蝶翅膀', slot: 'back', emoji: '🦋', imageUrl: '', position: { top: '35%', left: '50%', scale: 0.9 } },
      { id: 'magic_tophat', name: '魔术师高帽', slot: 'head', emoji: '🎩', imageUrl: '', position: { top: '0%', left: '50%', scale: 0.8 } },
      { id: 'star_trail', name: '星光拖尾', slot: 'back', emoji: '💫', imageUrl: '', position: { top: '50%', left: '50%', scale: 0.7 } },
      { id: 'dragon_wings', name: '暗焰龙翼', slot: 'back', emoji: '🐉', imageUrl: '', position: { top: '30%', left: '50%', scale: 1.1 } },
    ]
    for (const def of accDefs) {
      const exists = await db.accessoryDef.findUnique({ where: { id: def.id } })
      if (!exists) await db.accessoryDef.create({ data: def })
    }
    console.log('✅ Lucky accessory definitions created (12 items)')

    // ── 3.5b 新增背景定义（3 件）──
    const bgDefs = [
      { id: 'circus', name: '马戏团舞台', cssGradient: 'linear-gradient(180deg, #cc2936 0%, #cc2936 30%, #f4a261 60%, #f4a261 100%)', imageUrl: '', thumbnailColor: '#cc2936' },
      { id: 'underwater', name: '海底世界', cssGradient: 'linear-gradient(180deg, #0077b6 0%, #00b4d8 50%, #90e0ef 100%)', imageUrl: '', thumbnailColor: '#0077b6' },
      { id: 'castle', name: '梦幻城堡', cssGradient: 'linear-gradient(180deg, #1a0533 0%, #4a1942 50%, #e8a87c 100%)', imageUrl: '', thumbnailColor: '#1a0533' },
    ]
    for (const def of bgDefs) {
      const exists = await db.petBackgroundDef.findUnique({ where: { id: def.id } })
      if (!exists) await db.petBackgroundDef.create({ data: def })
    }
    console.log('✅ Lucky background definitions created (3 items)')

    // ── 3.5c 38 件惊喜掉落 ShopItem ──
    const luckyItems = [
      // === Common (55%) — 5 件 ===
      { name: '幸运四叶草徽章', emoji: '🍀', description: '胸前闪亮的四叶草，据说能带来好运', type: 'accessory', usageType: 'equip', price: 0, rarity: 'common', effect: { equip: { decoration: 'clover_badge' } }, imageClass: 'lucky-clover', stock: 0, isActive: true, sortOrder: 100, isLuckyDrop: true },
      { name: '帅气棒球帽', emoji: '🧢', description: '运动风的红色棒球帽，歪戴更有范', type: 'accessory', usageType: 'equip', price: 0, rarity: 'common', effect: { equip: { decoration: 'baseball_cap' } }, imageClass: 'lucky-cap', stock: 0, isActive: true, sortOrder: 101, isLuckyDrop: true },
      { name: '勇气勋章', emoji: '🎖️', description: '一枚金色的荣誉勋章，教练都夸我勇敢', type: 'accessory', usageType: 'equip', price: 0, rarity: 'common', effect: { equip: { decoration: 'courage_medal' } }, imageClass: 'lucky-medal', stock: 0, isActive: true, sortOrder: 102, isLuckyDrop: true },
      { name: '向日葵发饰', emoji: '🌻', description: '头顶开着一朵小太阳，笑容也跟着灿烂', type: 'accessory', usageType: 'equip', price: 0, rarity: 'common', effect: { equip: { decoration: 'sunflower_hairpin' } }, imageClass: 'lucky-sunflower', stock: 0, isActive: true, sortOrder: 103, isLuckyDrop: true },
      { name: '欢乐气球束', emoji: '🎈', description: '三只彩色气球飘在身后，像过节一样', type: 'accessory', usageType: 'equip', price: 0, rarity: 'common', effect: { equip: { decoration: 'balloon_bundle' } }, imageClass: 'lucky-balloon', stock: 0, isActive: true, sortOrder: 104, isLuckyDrop: true },
      // === Uncommon (28%) — 4 件 ===
      { name: '炫酷黑墨镜', emoji: '🕶️', description: '纯黑镜片，戴上谁都认不出我', type: 'accessory', usageType: 'equip', price: 0, rarity: 'uncommon', effect: { equip: { decoration: 'sunglasses_cool' } }, imageClass: 'lucky-sunglasses', stock: 0, isActive: true, sortOrder: 200, isLuckyDrop: true },
      { name: '月牙发卡', emoji: '🌙', description: '弯弯的月牙别在发间，夜晚会发光', type: 'accessory', usageType: 'equip', price: 0, rarity: 'uncommon', effect: { equip: { decoration: 'moon_hairpin' } }, imageClass: 'lucky-moon', stock: 0, isActive: true, sortOrder: 201, isLuckyDrop: true },
      { name: '星星大眼睛', emoji: '🤩', description: '镜框是两颗五角星，眨眼看世界', type: 'accessory', usageType: 'equip', price: 0, rarity: 'uncommon', effect: { equip: { decoration: 'star_glasses' } }, imageClass: 'lucky-starglasses', stock: 0, isActive: true, sortOrder: 202, isLuckyDrop: true },
      { name: '马戏团舞台', emoji: '🎪', description: '红白条纹帐篷 + 彩旗飘动', type: 'background', usageType: 'replace', price: 0, rarity: 'uncommon', effect: { equip: { backgroundId: 'circus' } }, imageClass: 'lucky-circus', stock: 0, isActive: true, sortOrder: 203, isLuckyDrop: true },
      // === Rare (12%) — 3 件纯装饰 + 18 件徽章 ===
      { name: '幻彩蝴蝶翅膀', emoji: '🦋', description: '一对半透明的蓝色翅膀，轻轻扇动', type: 'accessory', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { decoration: 'butterfly_wings' } }, imageClass: 'lucky-butterfly', stock: 0, isActive: true, sortOrder: 300, isLuckyDrop: true },
      { name: '海底世界', emoji: '🌊', description: '深海蓝渐变 + 游动的小鱼气泡', type: 'background', usageType: 'replace', price: 0, rarity: 'rare', effect: { equip: { backgroundId: 'underwater' } }, imageClass: 'lucky-underwater', stock: 0, isActive: true, sortOrder: 301, isLuckyDrop: true },
      { name: '魔术师高帽', emoji: '🎩', description: '高高的黑色礼帽，随时能变出兔子', type: 'accessory', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { decoration: 'magic_tophat' } }, imageClass: 'lucky-tophat', stock: 0, isActive: true, sortOrder: 302, isLuckyDrop: true },
      // 俱乐部徽章 × 14
      { name: '皇家马德里队徽', emoji: '⚪', description: '银河战舰 · 欧冠之王', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Real-Madrid-CF-v2002.svg' } }, imageClass: 'badge-real-madrid', stock: 0, isActive: true, sortOrder: 303, isLuckyDrop: true },
      { name: '巴塞罗那队徽', emoji: '🔵', description: '红蓝军团 · 拉玛西亚', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/FC-Barcelona-v2002.svg' } }, imageClass: 'badge-barcelona', stock: 0, isActive: true, sortOrder: 304, isLuckyDrop: true },
      { name: '拜仁慕尼黑队徽', emoji: '🔴', description: '德甲巨人 · 南部之星', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/FC-Bayern-Munchen-v2024.svg' } }, imageClass: 'badge-bayern', stock: 0, isActive: true, sortOrder: 305, isLuckyDrop: true },
      { name: '曼城队徽', emoji: '🔵', description: '蓝月亮 · 英超霸主', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Manchester-City-v2016.svg' } }, imageClass: 'badge-mancity', stock: 0, isActive: true, sortOrder: 306, isLuckyDrop: true },
      { name: '巴黎圣日耳曼队徽', emoji: '🔴', description: '大巴黎 · 法兰西之王', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Paris-Saint-Germain-v2013.svg' } }, imageClass: 'badge-psg', stock: 0, isActive: true, sortOrder: 307, isLuckyDrop: true },
      { name: '尤文图斯队徽', emoji: '⚪', description: '老妇人 · 黑白军团', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Juventus-FC-v2017.svg' } }, imageClass: 'badge-juventus', stock: 0, isActive: true, sortOrder: 308, isLuckyDrop: true },
      { name: '多特蒙德队徽', emoji: '🟡', description: '大黄蜂 · 威斯特法伦', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Borussia-Dortmund-v1993.svg' } }, imageClass: 'badge-dortmund', stock: 0, isActive: true, sortOrder: 309, isLuckyDrop: true },
      { name: '切尔西队徽', emoji: '🔵', description: '蓝军 · 斯坦福桥', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Chelsea-FC-v2006.svg' } }, imageClass: 'badge-chelsea', stock: 0, isActive: true, sortOrder: 310, isLuckyDrop: true },
      { name: '阿森纳队徽', emoji: '🔴', description: '枪手 · 兵工厂', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Arsenal-FC-v2002.svg' } }, imageClass: 'badge-arsenal', stock: 0, isActive: true, sortOrder: 311, isLuckyDrop: true },
      { name: '热刺队徽', emoji: '⚪', description: '白百合 · 北伦敦', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Tottenham-Hotspur-Football-Club-v2024.svg' } }, imageClass: 'badge-spurs', stock: 0, isActive: true, sortOrder: 312, isLuckyDrop: true },
      { name: '阿贾克斯队徽', emoji: '🔴', description: '兵工厂 · 荷兰豪门', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/AFC-Ajax-v2025.svg' } }, imageClass: 'badge-ajax', stock: 0, isActive: true, sortOrder: 313, isLuckyDrop: true },
      { name: '本菲卡队徽', emoji: '🔴', description: '雄鹰 · 葡超豪门', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Sport-Lisboa-e-Benfica-v1999.svg' } }, imageClass: 'badge-benfica', stock: 0, isActive: true, sortOrder: 314, isLuckyDrop: true },
      { name: '纽卡斯尔联队徽', emoji: '⚫', description: '喜鹊 · 圣詹姆斯公园', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Newcastle-United-Football-Club-v1988.svg' } }, imageClass: 'badge-newcastle', stock: 0, isActive: true, sortOrder: 315, isLuckyDrop: true },
      { name: '亚特兰大队徽', emoji: '🔵', description: '女神 · 贝尔加莫之光', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Atalanta-BC-v1993.svg' } }, imageClass: 'badge-atalanta', stock: 0, isActive: true, sortOrder: 316, isLuckyDrop: true },
      // 国家队 × 4
      { name: '阿根廷国家队徽', emoji: '🇦🇷', description: '潘帕斯雄鹰 · 世界冠军', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Argentina-National-Team-v2024.svg' } }, imageClass: 'badge-argentina', stock: 0, isActive: true, sortOrder: 317, isLuckyDrop: true },
      { name: '巴西国家队徽', emoji: '🇧🇷', description: '桑巴军团 · 五星巴西', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Brazil-National-Team-v2019.svg' } }, imageClass: 'badge-brazil', stock: 0, isActive: true, sortOrder: 318, isLuckyDrop: true },
      { name: '英格兰国家队徽', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', description: '三狮军团 · 足球回家', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/England-National-Team-v2013.svg' } }, imageClass: 'badge-england', stock: 0, isActive: true, sortOrder: 319, isLuckyDrop: true },
      { name: '葡萄牙国家队徽', emoji: '🇵🇹', description: '五盾军团 · 航海家之国', type: 'badge', usageType: 'equip', price: 0, rarity: 'rare', effect: { equip: { badgeSvg: '/logos/clubs/Portuguese-National-Team-v1966.svg' } }, imageClass: 'badge-portugal', stock: 0, isActive: true, sortOrder: 320, isLuckyDrop: true },
      // === Epic (4%) — 5 件 ===
      { name: '金色闪电战靴', emoji: '👟', description: '穿上它，跑得像风一样快', type: 'accessory', usageType: 'equip', price: 0, rarity: 'epic', effect: { equip: { decoration: 'golden_boot_dummy' } }, imageClass: 'lucky-goldenboot', stock: 0, isActive: true, sortOrder: 400, isLuckyDrop: true },
      { name: '金手套', emoji: '🧤', description: '扑出所有必进球', type: 'accessory', usageType: 'equip', price: 0, rarity: 'epic', effect: { equip: { decoration: 'golden_glove_dummy' } }, imageClass: 'lucky-goldenglove', stock: 0, isActive: true, sortOrder: 401, isLuckyDrop: true },
      { name: '世界杯决赛用球', emoji: '⚽', description: '皮球自带金色弧线', type: 'accessory', usageType: 'equip', price: 0, rarity: 'epic', effect: { equip: { decoration: 'worldcup_ball_dummy' } }, imageClass: 'lucky-wcball', stock: 0, isActive: true, sortOrder: 402, isLuckyDrop: true },
      { name: '星光拖尾', emoji: '💫', description: '走路身后留下一串小星星', type: 'accessory', usageType: 'equip', price: 0, rarity: 'epic', effect: { equip: { decoration: 'star_trail' } }, imageClass: 'lucky-startrail', stock: 0, isActive: true, sortOrder: 403, isLuckyDrop: true },
      { name: '梦幻城堡', emoji: '🏰', description: '童话城堡剪影 + 紫色晚霞渐变', type: 'background', usageType: 'replace', price: 0, rarity: 'epic', effect: { equip: { backgroundId: 'castle' } }, imageClass: 'lucky-castle', stock: 0, isActive: true, sortOrder: 404, isLuckyDrop: true },
      // === Legendary (1%) — 3 件 ===
      { name: '暗焰龙翼', emoji: '🐉', description: '传说级的龙之翼，展开时散发火焰粒子', type: 'accessory', usageType: 'equip', price: 0, rarity: 'legendary', effect: { equip: { decoration: 'dragon_wings' } }, imageClass: 'lucky-dragonwings', stock: 0, isActive: true, sortOrder: 500, isLuckyDrop: true },
      { name: '大力神杯', emoji: '🏆', description: '每个踢球孩子的终极梦想', type: 'accessory', usageType: 'equip', price: 0, rarity: 'legendary', effect: { equip: { decoration: 'worldcup_trophy_dummy' } }, imageClass: 'lucky-trophy', stock: 0, isActive: true, sortOrder: 501, isLuckyDrop: true },
      { name: '传奇10号战袍', emoji: '👕', description: '这个号码，不用多说了吧', type: 'accessory', usageType: 'equip', price: 0, rarity: 'legendary', effect: { equip: { decoration: 'jersey_10_dummy' } }, imageClass: 'lucky-jersey10', stock: 0, isActive: true, sortOrder: 502, isLuckyDrop: true },
    ]
    await db.shopItem.createMany({
      data: luckyItems.map(item => ({ ...item, createdAt: now })),
    })
    console.log('✅ Lucky drop items created (38 items)')
  }

  // ---- 4. Demo coaches with players, pets, and score records ----
  const coachCount = await db.coach.count()
  if (coachCount === 0) {
    const now = Date.now()
    const day = 24 * 3600 * 1000

    // Coach 1: 活跃正式教练（授权还有 90 天）
    const coach1 = await db.coach.create({
      data: {
        phone: '13800138001',
        passwordHash: await hashPassword('138001'),
        name: '王教练',
        school: '红星小学',
        isActive: true,
        trialUntil: now + 7 * day,
        authorizedUntil: now + 90 * day,
        playerMode: 'open',
        teamName: '红星小将',
        createdAt: now - 30 * day,
        updatedAt: now,
      },
    })

    // Coach 2: 活跃正式教练（授权还有 30 天）
    const coach2 = await db.coach.create({
      data: {
        phone: '13800138002',
        passwordHash: await hashPassword('138002'),
        name: '李教练',
        school: '蓝天青训',
        isActive: true,
        trialUntil: now + 7 * day,
        authorizedUntil: now + 30 * day,
        playerMode: 'display',
        teamName: '蓝天FC',
        createdAt: now - 60 * day,
        updatedAt: now,
      },
    })

    // Coach 3: 试用中教练（刚注册 2 天）
    const coach3 = await db.coach.create({
      data: {
        phone: '13800138003',
        passwordHash: await hashPassword('138003'),
        name: '张教练',
        school: '阳光体育',
        isActive: true,
        trialUntil: now + 5 * day,
        authorizedUntil: now + 5 * day,
        playerMode: 'open',
        teamName: '阳光少年',
        createdAt: now - 2 * day,
        updatedAt: now,
      },
    })

    // Coach 4: 已过期教练（启用但授权 10 天前到期）
    const coach4 = await db.coach.create({
      data: {
        phone: '13800138004',
        passwordHash: await hashPassword('138004'),
        name: '陈教练',
        school: '绿茵学院',
        isActive: true,
        trialUntil: now - 10 * day,
        authorizedUntil: now - 10 * day,
        playerMode: 'display',
        teamName: '绿茵队',
        createdAt: now - 100 * day,
        updatedAt: now,
      },
    })

    // Coach 5: 已停用教练
    const coach5 = await db.coach.create({
      data: {
        phone: '13800138005',
        passwordHash: await hashPassword('138005'),
        name: '刘教练',
        school: '未来之星',
        isActive: false,
        trialUntil: now + 3 * day,
        authorizedUntil: now + 3 * day,
        playerMode: 'display',
        teamName: '未来星',
        createdAt: now - 15 * day,
        updatedAt: now,
      },
    })

    console.log('✅ 5 demo coaches created (活跃×2, 试用中×1, 已过期×1, 停用×1)')

    // ---- Create players and pets for each active coach ----
    const coaches = [coach1, coach2, coach3, coach4]
    const speciesList = await db.petSpeciesDef.findMany()

    for (const coach of coaches) {
      const numPlayers = 4 + Math.floor(Math.random() * 4) // 4-7 players per coach
      for (let i = 0; i < numPlayers; i++) {
        const playerIndex = i + 1
        const player = await db.player.create({
          data: {
            coachId: coach.id,
            name: `${coach.name.replace('教练', '')}学员${playerIndex}`,
            avatar: ['😊', '😎', '🤩', '🥳', '👦', '👧'][i % 6],
            age: 8 + Math.floor(Math.random() * 6),
            currentPoints: 50 + Math.floor(Math.random() * 200),
            isActive: true,
            createdAt: now - Math.floor(Math.random() * 30) * day,
            updatedAt: now,
          },
        })

        // Create pet for each player
        const species = speciesList[i % speciesList.length]
        const stageKeys = ['egg', 'level1', 'level2', 'level3', 'rare']
        const stage = stageKeys[Math.floor(Math.random() * 3)] // egg to level2

        await db.pet.create({
          data: {
            playerId: player.id,
            speciesId: species.id,
            name: `${player.name}的宠物`,
            stage,
            carePoints: Math.floor(Math.random() * 300),
            level: 1 + Math.floor(Math.random() * 3),
            hunger: 40 + Math.floor(Math.random() * 60),
            mood: 40 + Math.floor(Math.random() * 60),
            currentSkin: 'default',
            equippedDecorations: [],
            lastDecayAt: now,
            lastFedAt: now - Math.floor(Math.random() * 12) * 3600 * 1000,
            lastPlayedAt: now - Math.floor(Math.random() * 24) * 3600 * 1000,
            createdAt: player.createdAt,
            evolvedAt: 0,
          },
        })

        // Create some score records
        const recordTypes = ['earn', 'bonus']
        const reasons = ['传接球训练', '盘带练习', '团队配合', '头球练习', '射门训练', '每日签到']
        const numRecords = 3 + Math.floor(Math.random() * 8)
        for (let r = 0; r < numRecords; r++) {
          await db.scoreRecord.create({
            data: {
              coachId: coach.id,
              playerId: player.id,
              points: [5, 10, 15, 20][Math.floor(Math.random() * 4)],
              type: recordTypes[Math.floor(Math.random() * recordTypes.length)],
              reason: reasons[Math.floor(Math.random() * reasons.length)],
              operatorType: 'coach',
              operatorId: coach.id,
              createdAt: now - Math.floor(Math.random() * 30) * day,
            },
          })
        }
      }
    }

    console.log('✅ Demo players, pets, and score records created')
  } else {
    console.log('⏭️  Coaches already exist, skipping demo data')
  }

  console.log('✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
