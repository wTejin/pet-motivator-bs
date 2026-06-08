import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import path from 'path'
import { hashPassword, verifyPassword, signToken } from '../services/auth'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { config, getDefaultPassword } from '../config'
import fs from 'fs'

const db = new PrismaClient()
export const adminRouter = Router()

const VALID_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = (process.env.UPLOAD_DIR || './public') + '/images/pets'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `pet-${unique}${ext}`)
  },
})

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // 日志记录实际 MIME 类型，便于排查上传问题
    console.log('[Upload] mimetype:', file.mimetype, 'originalname:', file.originalname, 'size:', file.size)
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/x-webp', 'image/svg+xml']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else {
      console.log('[Upload] REJECTED mimetype:', file.mimetype)
      cb(new Error(`不支持的文件类型: ${file.mimetype}，仅支持 JPG/PNG/GIF/WebP/SVG`))
    }
  },
})

adminRouter.post('/login', async (req: AuthRequest, res: Response) => {
  const { username, password } = req.body

  if (username === config.superAdminUsername && password === config.superAdminPassword) {
    let admin = await db.admin.findUnique({ where: { username } })
    if (!admin) {
      admin = await db.admin.create({
        data: { username, passwordHash: await hashPassword(password), createdAt: Date.now() },
      })
    }
    const token = signToken({ id: admin.id, role: 'admin' })
    return res.json({ success: true, data: { token, admin: { id: admin.id, username: admin.username } } })
  }

  const admin = await db.admin.findUnique({ where: { username } })
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return res.status(401).json({ success: false, error: '账号或密码错误' })
  }

  const token = signToken({ id: admin.id, role: 'admin' })
  res.json({ success: true, data: { token, admin: { id: admin.id, username: admin.username } } })
})

adminRouter.get('/coaches', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const coaches = await db.coach.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { players: true } } },
  })

  const data = await Promise.all(
    coaches.map(async (c) => {
      const totalScores = await db.scoreRecord.aggregate({
        where: { coachId: c.id },
        _sum: { points: true },
      })
      return {
        id: c.id, phone: c.phone, name: c.name, school: c.school,
        isActive: c.isActive,
        trialUntil: Number(c.trialUntil),
        authorizedUntil: Number(c.authorizedUntil),
        playerMode: c.playerMode,
        playerCount: c._count.players,
        totalScores: totalScores._sum.points || 0,
        createdAt: Number(c.createdAt),
      }
    })
  )

  res.json({ success: true, data })
})

adminRouter.post('/coaches', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { phone } = req.body
  if (!phone) return res.status(400).json({ success: false, error: '手机号必填' })

  const existing = await db.coach.findUnique({ where: { phone } })
  if (existing) return res.status(400).json({ success: false, error: '该手机号已注册' })

  const now = Date.now()
  const authorizedUntil = now + 100 * 365 * 24 * 3600 * 1000

  const coach = await db.coach.create({
    data: {
      phone,
      passwordHash: await hashPassword(getDefaultPassword(phone)),
      name: phone,
      trialUntil: 0,
      authorizedUntil,
      createdAt: now,
      updatedAt: now,
    },
  })

  res.json({
    success: true,
    data: { id: coach.id, phone: coach.phone, name: coach.name, trialUntil: Number(coach.trialUntil) },
  })
})

adminRouter.put('/coaches/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { isActive, authorizedUntil } = req.body
  const now = Date.now()

  const updateData: any = {}
  if (isActive !== undefined) updateData.isActive = isActive
  if (authorizedUntil !== undefined) { updateData.authorizedUntil = authorizedUntil; updateData.updatedAt = now }

  const coach = await db.coach.update({
    where: { id },
    data: updateData,
    select: { id: true, phone: true, isActive: true, authorizedUntil: true },
  })

  res.json({ success: true, data: { ...coach, authorizedUntil: Number(coach.authorizedUntil) } })
})

adminRouter.put('/coaches/:id/reset-password', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const coach = await db.coach.findUnique({ where: { id } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })

  const newPassword = getDefaultPassword(coach.phone)
  await db.coach.update({
    where: { id },
    data: { passwordHash: await hashPassword(newPassword), updatedAt: Date.now() },
  })

  res.json({ success: true, message: '密码已重置', data: { newPassword } })
})

adminRouter.get('/stats', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const now = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)

  const [playerCount, activePlayerCount, petCount, shopItemCount, todayNewPlayerCount] = await Promise.all([
    db.player.count(),
    db.player.count({ where: { isActive: true } }),
    db.pet.count(),
    db.shopItem.count({ where: { coachId: null } }),
    db.player.count({ where: { createdAt: { gte: BigInt(todayStart) } } }),
  ])

  res.json({
    success: true,
    data: {
      playerCount,
      activePlayerCount,
      inactivePlayerCount: playerCount - activePlayerCount,
      petCount,
      shopItemCount,
      todayNewPlayerCount,
      serverTime: now,
    },
  })
})

// ---- 球员管理（跨教练）----

adminRouter.get('/players', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const players = await db.player.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      coach: { select: { id: true, name: true, phone: true, school: true } },
      pet: { select: { id: true, name: true, stage: true, speciesId: true, level: true } },
    },
  })

  const data = players.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    isActive: p.isActive,
    age: p.age,
    birthDate: p.birthDate,
    gender: p.gender,
    currentPoints: p.currentPoints,
    coachId: p.coachId,
    coachName: p.coach.name,
    coachPhone: p.coach.phone,
    coachSchool: p.coach.school,
    pet: p.pet ? {
      id: p.pet.id, name: p.pet.name, stage: p.pet.stage,
      speciesId: p.pet.speciesId, level: p.pet.level,
    } : null,
    createdAt: Number(p.createdAt),
    updatedAt: Number(p.updatedAt),
  }))

  res.json({ success: true, data })
})

adminRouter.delete('/players/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const player = await db.player.findUnique({ where: { id } })
  if (!player) return res.status(404).json({ success: false, error: '球员不存在' })

  await db.player.delete({ where: { id } })

  res.json({ success: true, message: '球员数据已永久删除' })
})

adminRouter.put('/players/:id/restore', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const player = await db.player.findUnique({ where: { id } })
  if (!player) return res.status(404).json({ success: false, error: '球员不存在' })

  if (player.isActive) {
    return res.status(400).json({ success: false, error: '球员当前已是活跃状态' })
  }

  const updated = await db.player.update({
    where: { id },
    data: { isActive: true, updatedAt: Date.now() },
  })

  res.json({ success: true, data: { id: updated.id, isActive: updated.isActive }, message: '球员已恢复' })
})

adminRouter.get('/pet-species', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const species = await db.petSpeciesDef.findMany({ orderBy: { name: 'asc' } })
  res.json({
    success: true,
    data: species.map(s => ({
      ...s,
      stages: JSON.parse(JSON.stringify(s.stages)),
    })),
  })
})

adminRouter.post('/pet-species', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { species } = req.body
  if (species && Array.isArray(species)) {
    for (const s of species) {
      await db.petSpeciesDef.upsert({ where: { id: s.id }, create: s, update: s })
    }
    return res.json({ success: true, data: { count: species.length } })
  }

  const { id, name, category, description, emoji, backgroundColor, accentColor, stages } = req.body
  if (!id || !name || !category) {
    return res.status(400).json({ success: false, error: 'id、name、分类必填' })
  }
  if (!/^[a-z0-9-]+$/.test(id)) {
    return res.status(400).json({ success: false, error: 'ID 只能包含小写字母、数字和连字符' })
  }

  // 检查 ID 是否已存在
  const existing = await db.petSpeciesDef.findUnique({ where: { id } })
  if (existing) {
    return res.status(400).json({ success: false, error: `物种ID "${id}" 已存在，请换一个` })
  }

  const finalStages = stages || {
    egg: { emoji: '🥚', imageUrl: '', label: '蛋' },
    level1: { emoji: '🐣', imageUrl: '', label: '幼崽' },
    level2: { emoji: '🐥', imageUrl: '', label: '少年' },
    level3: { emoji: '🐤', imageUrl: '', label: '成年' },
    rare: { emoji: '✨', imageUrl: '', label: '稀有' },
  }

  try {
    const item = await db.petSpeciesDef.create({
      data: {
        id,
        name,
        category,
        description: description || '',
        emoji: emoji || '🥚',
        backgroundColor: backgroundColor || '#e3f2fd',
        accentColor: accentColor || '#42a5f5',
        stages: finalStages,
      },
    })
    res.json({ success: true, data: { ...item, stages: JSON.parse(JSON.stringify(item.stages)) } })
  } catch (e: any) {
    console.error('创建物种失败:', e.message)
    res.status(500).json({ success: false, error: `创建失败: ${e.message}` })
  }
})

adminRouter.put('/pet-species/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const existing = await db.petSpeciesDef.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ success: false, error: '物种不存在' })

  const { name, category, description, emoji, backgroundColor, accentColor, stages } = req.body
  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (category !== undefined) updateData.category = category
  if (description !== undefined) updateData.description = description
  if (emoji !== undefined) updateData.emoji = emoji
  if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor
  if (accentColor !== undefined) updateData.accentColor = accentColor
  if (stages !== undefined) updateData.stages = stages

  const updated = await db.petSpeciesDef.update({ where: { id }, data: updateData })
  res.json({ success: true, data: { ...updated, stages: JSON.parse(JSON.stringify(updated.stages)) } })
})

adminRouter.delete('/pet-species/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const existing = await db.petSpeciesDef.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ success: false, error: '物种不存在' })
  await db.petSpeciesDef.delete({ where: { id } })
  res.json({ success: true, message: '已删除' })
})

adminRouter.post('/accessories', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { accessories } = req.body
  if (!Array.isArray(accessories)) return res.status(400).json({ success: false, error: 'accessories 必须是数组' })
  for (const a of accessories) {
    await db.accessoryDef.upsert({ where: { id: a.id }, create: a, update: a })
  }
  res.json({ success: true, data: { count: accessories.length } })
})

adminRouter.post('/backgrounds', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { backgrounds } = req.body
  if (!Array.isArray(backgrounds)) return res.status(400).json({ success: false, error: 'backgrounds 必须是数组' })
  for (const b of backgrounds) {
    await db.petBackgroundDef.upsert({ where: { id: b.id }, create: b, update: b })
  }
  res.json({ success: true, data: { count: backgrounds.length } })
})

function inferUsageType(type: string): string {
  if (type === 'accessory') return 'rent'
  if (type === 'background') return 'rent'
  if (type === 'toy') return 'charge'
  return 'consume'
}

// ---------- 魔法集市 ----------

adminRouter.get('/shop-items', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const items = await db.shopItem.findMany({
    where: { coachId: null },
    orderBy: { sortOrder: 'asc' },
  })
  res.json({ success: true, data: items.map(i => ({ ...i, effect: JSON.parse(JSON.stringify(i.effect)) })) })
})

adminRouter.post('/shop-items', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { name, description, emoji, type, price, stock, effect, usageType, usageCount, imageUrl, imageClass, sortOrder, isLuckyDrop, rarity } = req.body
  if (!name || !type || price == null) {
    return res.status(400).json({ success: false, error: '名称、类型、价格必填' })
  }
  if (rarity && !VALID_RARITIES.includes(rarity)) {
    return res.status(400).json({ success: false, error: `无效的稀有度：${rarity}，可选值：${VALID_RARITIES.join(', ')}` })
  }
  const now = Date.now()
  const inferredUsageType = usageType || inferUsageType(type)
  const item = await db.shopItem.create({
    data: {
      name,
      description: description || '',
      emoji: emoji || '📦',
      type,
      price: Number(price),
      stock: stock != null ? Number(stock) : 999,
      effect: effect || {},
      usageType: inferredUsageType,
      usageCount: usageCount != null ? Number(usageCount) : null,
      imageUrl: imageUrl || null,
      imageClass: imageClass || '',
      sortOrder: sortOrder != null ? Number(sortOrder) : 0,
      isLuckyDrop: isLuckyDrop || false,
      rarity: rarity || 'common',
      createdAt: now,
    },
  })
  res.json({ success: true, data: item })
})

adminRouter.put('/shop-items/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, description, emoji, type, price, stock, effect, usageType, usageCount, imageUrl, imageClass, sortOrder, isActive, isLuckyDrop, rarity } = req.body
  if (rarity && !VALID_RARITIES.includes(rarity)) {
    return res.status(400).json({ success: false, error: `无效的稀有度：${rarity}，可选值：${VALID_RARITIES.join(', ')}` })
  }
  const existing = await db.shopItem.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ success: false, error: '商品不存在' })

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (emoji !== undefined) updateData.emoji = emoji
  if (type !== undefined) updateData.type = type
  if (price !== undefined) updateData.price = Number(price)
  if (stock !== undefined) updateData.stock = Number(stock)
  if (effect !== undefined) updateData.effect = effect
  if (type !== undefined && usageType === undefined) updateData.usageType = inferUsageType(type)
  if (usageType !== undefined) updateData.usageType = usageType
  if (usageCount !== undefined) updateData.usageCount = usageCount != null ? Number(usageCount) : null
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl
  if (imageClass !== undefined) updateData.imageClass = imageClass
  if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder)
  if (isActive !== undefined) updateData.isActive = isActive
  if (isLuckyDrop !== undefined) updateData.isLuckyDrop = isLuckyDrop
  if (rarity !== undefined) updateData.rarity = rarity

  const updated = await db.shopItem.update({ where: { id }, data: updateData })
  res.json({ success: true, data: updated })
})

adminRouter.delete('/shop-items/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const existing = await db.shopItem.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ success: false, error: '商品不存在' })
  await db.shopItem.delete({ where: { id } })
  res.json({ success: true, message: '已删除' })
})

// ---------- 图片上传 ----------

adminRouter.post('/upload-image', authenticate, requireRole('admin'), imageUpload.single('image'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: '未收到文件' })
  const url = `/images/pets/${req.file.filename}`
  res.json({ success: true, data: { url } })
})
