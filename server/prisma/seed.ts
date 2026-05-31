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
