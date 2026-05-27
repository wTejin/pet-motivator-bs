import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { hashPassword, verifyPassword, signToken } from '../services/auth'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { config, getDefaultPassword } from '../config'

const db = new PrismaClient()
export const adminRouter = Router()

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
  const trialUntil = now + config.trialDays * 24 * 3600 * 1000

  const coach = await db.coach.create({
    data: {
      phone,
      passwordHash: await hashPassword(getDefaultPassword(phone)),
      name: phone,
      trialUntil,
      authorizedUntil: trialUntil,
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

adminRouter.get('/stats', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const [coachCount, playerCount, petCount] = await Promise.all([
    db.coach.count(), db.player.count(), db.pet.count(),
  ])
  res.json({ success: true, data: { coachCount, playerCount, petCount } })
})

adminRouter.post('/pet-species', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { species } = req.body
  if (!Array.isArray(species)) return res.status(400).json({ success: false, error: 'species 必须是数组' })
  for (const s of species) {
    await db.petSpeciesDef.upsert({ where: { id: s.id }, create: s, update: s })
  }
  res.json({ success: true, data: { count: species.length } })
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
