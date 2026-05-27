import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/services/auth'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ---- Default admin account ----
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

  // ---- Default pet species ----
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
          stages: { egg: { emoji: '🥚', scale: 0.5, animation: 'bounce', label: '蛋' }, baby: { emoji: '🐶', scale: 0.7, animation: 'bounce', label: '幼崽' }, teen: { emoji: '🐕', scale: 0.85, animation: 'walk', label: '少年' }, adult: { emoji: '🐕', scale: 1.0, animation: 'run', label: '成年' }, rare: { emoji: '🦊', scale: 1.2, animation: 'glow', label: '稀有' } },
        },
        {
          id: 'default-cat',
          name: '小奶猫',
          category: 'cat',
          description: '优雅灵动的小猫咪',
          emoji: '🐱',
          backgroundColor: '#ec4899',
          accentColor: '#db2777',
          stages: { egg: { emoji: '🥚', scale: 0.5, animation: 'bounce', label: '蛋' }, baby: { emoji: '🐱', scale: 0.7, animation: 'bounce', label: '幼崽' }, teen: { emoji: '😺', scale: 0.85, animation: 'walk', label: '少年' }, adult: { emoji: '😸', scale: 1.0, animation: 'run', label: '成年' }, rare: { emoji: '🦁', scale: 1.2, animation: 'glow', label: '稀有' } },
        },
        {
          id: 'default-dragon',
          name: '小火龙',
          category: 'dragon',
          description: '神秘强大的小火龙',
          emoji: '🐲',
          backgroundColor: '#ef4444',
          accentColor: '#dc2626',
          stages: { egg: { emoji: '🥚', scale: 0.5, animation: 'bounce', label: '蛋' }, baby: { emoji: '🐣', scale: 0.7, animation: 'bounce', label: '幼崽' }, teen: { emoji: '🐤', scale: 0.85, animation: 'walk', label: '少年' }, adult: { emoji: '🐉', scale: 1.0, animation: 'fly', label: '成年' }, rare: { emoji: '🐲', scale: 1.2, animation: 'glow', label: '稀有' } },
        },
      ],
    })
    console.log('✅ Default pet species created')
  }

  // ---- Default shop items (system-wide, coachId = null) ----
  const shopCount = await db.shopItem.count()
  if (shopCount === 0) {
    await db.shopItem.createMany({
      data: [
        { name: '狗粮', description: '恢复饥饿值 30 点', type: 'food', price: 20, effect: { hunger: 30 }, imageClass: 'food-dogfood', stock: 999, isActive: true, sortOrder: 1, createdAt: Date.now() },
        { name: '牛奶', description: '恢复饥饿值 20 点', type: 'food', price: 15, effect: { hunger: 20 }, imageClass: 'food-milk', stock: 999, isActive: true, sortOrder: 2, createdAt: Date.now() },
        { name: '玩具球', description: '恢复心情值 25 点', type: 'special', price: 25, effect: { mood: 25 }, imageClass: 'toy-ball', stock: 999, isActive: true, sortOrder: 3, createdAt: Date.now() },
        { name: '蝴蝶结', description: '头部装饰', type: 'decoration', price: 50, effect: { decoration: 'bow' }, imageClass: 'deco-bow', stock: 999, isActive: true, sortOrder: 4, createdAt: Date.now() },
      ],
    })
    console.log('✅ Default shop items created')
  }

  console.log('✅ Seed complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
