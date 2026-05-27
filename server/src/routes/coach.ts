import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { hashPassword, verifyPassword, signToken } from '../services/auth'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { config, getDefaultPassword } from '../config'

const db = new PrismaClient()
export const coachRouter = Router()

function coachId(req: AuthRequest): string { return req.userId! }

// ---------- 注册 & 登录 ----------

coachRouter.post('/register', async (req: AuthRequest, res: Response) => {
  const { phone } = req.body
  if (!phone || !/^\d{11}$/.test(phone)) {
    return res.status(400).json({ success: false, error: '请输入有效的11位手机号' })
  }
  const existing = await db.coach.findUnique({ where: { phone } })
  if (existing) return res.status(400).json({ success: false, error: '该手机号已注册' })

  const now = Date.now()
  const trialUntil = now + config.trialDays * 24 * 3600 * 1000
  const coach = await db.coach.create({
    data: {
      phone, passwordHash: await hashPassword(getDefaultPassword(phone)),
      name: phone, trialUntil, authorizedUntil: trialUntil,
      createdAt: now, updatedAt: now,
    },
  })
  res.json({ success: true, data: { id: coach.id, phone: coach.phone, name: coach.name } })
})

coachRouter.post('/login', async (req: AuthRequest, res: Response) => {
  const { phone, password } = req.body
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach || !(await verifyPassword(password, coach.passwordHash))) {
    return res.status(401).json({ success: false, error: '手机号或密码错误' })
  }
  if (!coach.isActive) return res.status(403).json({ success: false, error: '账号已被停用，请联系管理员' })
  const now = Date.now()
  if (now > Number(coach.authorizedUntil)) {
    return res.status(403).json({ success: false, error: '授权已过期，请联系管理员续期' })
  }
  const token = signToken({ id: coach.id, role: 'coach' })
  res.json({
    success: true,
    data: {
      token,
      coach: {
        id: coach.id, phone: coach.phone, name: coach.name, school: coach.school,
        playerMode: coach.playerMode,
        trialUntil: Number(coach.trialUntil),
        authorizedUntil: Number(coach.authorizedUntil),
      },
    },
  })
})

coachRouter.put('/password', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body
  const coach = await db.coach.findUnique({ where: { id: coachId(req) } })
  if (!coach || !(await verifyPassword(oldPassword, coach.passwordHash))) {
    return res.status(400).json({ success: false, error: '原密码错误' })
  }
  await db.coach.update({
    where: { id: coachId(req) },
    data: { passwordHash: await hashPassword(newPassword), updatedAt: Date.now() },
  })
  res.json({ success: true, message: '密码修改成功' })
})

// ---------- 球员管理 ----------

coachRouter.get('/players', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const players = await db.player.findMany({
    where: { coachId: coachId(req) }, orderBy: { createdAt: 'asc' },
    include: { pet: true },
  })
  const data = players.map(p => ({
    id: p.id, name: p.name, avatar: p.avatar,
    currentPoints: p.currentPoints, lifetimePoints: p.lifetimePoints,
    isActive: p.isActive, pet: p.pet || null, createdAt: Number(p.createdAt),
  }))
  res.json({ success: true, data })
})

coachRouter.post('/players', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, avatar } = req.body
  const now = Date.now()
  const player = await db.player.create({
    data: { coachId: coachId(req), name, avatar: avatar || '😊', createdAt: now, updatedAt: now },
  })
  res.json({ success: true, data: player })
})

coachRouter.put('/players/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, avatar, isActive } = req.body
  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  const updated = await db.player.update({
    where: { id },
    data: {
      ...(name && { name }), ...(avatar && { avatar }),
      ...(isActive !== undefined && { isActive }), updatedAt: Date.now(),
    },
  })
  res.json({ success: true, data: updated })
})

coachRouter.delete('/players/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  await db.pet.deleteMany({ where: { playerId: id } })
  await db.scoreRecord.deleteMany({ where: { playerId: id } })
  await db.playerInventory.deleteMany({ where: { playerId: id } })
  await db.player.delete({ where: { id } })
  res.json({ success: true, message: '删除成功' })
})

// ---------- 记分 ----------

coachRouter.post('/scores', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { playerId, indicatorId, points, type, reason, sessionId } = req.body
  const player = await db.player.findFirst({ where: { id: playerId, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  if (indicatorId) {
    const indicator = await db.scoreIndicator.findUnique({ where: { id: indicatorId } })
    if (indicator) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const todayCount = await db.scoreRecord.aggregate({
        where: { playerId, indicatorId, createdAt: { gte: todayStart.getTime() } },
        _sum: { points: true },
      })
      const todayPoints = todayCount._sum.points || 0
      if (todayPoints + points > indicator.dailyLimit) {
        return res.status(400).json({ success: false, error: `今日该指标已达上限 (${todayPoints}/${indicator.dailyLimit})` })
      }
    }
  }

  const now = Date.now()
  const record = await db.scoreRecord.create({
    data: {
      coachId: coachId(req), playerId, ruleId: null, indicatorId: indicatorId || null,
      sessionId: sessionId || null, points, type, reason,
      operatorType: 'coach', operatorId: coachId(req), createdAt: now,
    },
  })

  await db.player.update({
    where: { id: playerId },
    data: {
      currentPoints: { increment: points },
      lifetimePoints: points > 0 ? { increment: points } : undefined,
      updatedAt: now,
    },
  })
  res.json({ success: true, data: record })
})

coachRouter.get('/scores/:playerId', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const records = await db.scoreRecord.findMany({
    where: { playerId, coachId: coachId(req) },
    orderBy: { createdAt: 'desc' }, take: 50,
  })
  res.json({ success: true, data: records.map(r => ({ ...r, createdAt: Number(r.createdAt) })) })
})

// ---------- 球员统计（含维度分数） ----------

coachRouter.get('/player-stats/:playerId', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const player = await db.player.findFirst({ where: { id: playerId, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const dimensions = await db.scoreDimension.findMany({
    where: { coachId: coachId(req), isActive: true },
    include: { indicators: { where: { isActive: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0)
  const [todayScores, weekScores] = await Promise.all([
    db.scoreRecord.aggregate({ where: { playerId, createdAt: { gte: todayStart.getTime() } }, _sum: { points: true } }),
    db.scoreRecord.aggregate({ where: { playerId, createdAt: { gte: weekStart.getTime() } }, _sum: { points: true } }),
  ])

  const dimStats = await Promise.all(dimensions.map(async (dim) => {
    const indicatorIds = dim.indicators.map(i => i.id)
    const total = indicatorIds.length > 0 ? await db.scoreRecord.aggregate({
      where: { playerId, indicatorId: { in: indicatorIds } }, _sum: { points: true },
    }) : { _sum: { points: 0 } }
    const maxScore = dim.indicators.reduce((sum, i) => sum + i.dailyLimit * 7, 0)
    const score = total._sum?.points || 0
    return {
      dimensionId: dim.id, dimensionName: dim.name, icon: dim.icon,
      score: Math.min(99, Math.round((score / Math.max(1, maxScore)) * 99)), maxScore,
    }
  }))

  const overall = dimStats.length > 0 ? Math.round(dimStats.reduce((s, d) => s + d.score, 0) / dimStats.length) : 0
  const allPlayers = await db.player.findMany({
    where: { coachId: coachId(req) }, select: { id: true, currentPoints: true },
    orderBy: { currentPoints: 'desc' },
  })
  const rank = allPlayers.findIndex(p => p.id === playerId) + 1

  res.json({
    success: true,
    data: {
      playerId, playerName: player.name, avatar: player.avatar, overall, dimensions: dimStats,
      totalPoints: player.currentPoints, lifetimePoints: player.lifetimePoints,
      todayPoints: todayScores._sum?.points || 0, weeklyPoints: weekScores._sum?.points || 0, rank,
    },
  })
})

// ---------- 维度 & 指标 CRUD ----------

coachRouter.get('/dimensions', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const dimensions = await db.scoreDimension.findMany({
    where: { coachId: coachId(req) },
    include: { indicators: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  })
  res.json({ success: true, data: dimensions })
})

coachRouter.post('/dimensions', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, icon, sortOrder } = req.body
  const dim = await db.scoreDimension.create({
    data: { coachId: coachId(req), name, icon: icon || '⭐', sortOrder: sortOrder || 0 },
  })
  res.json({ success: true, data: dim })
})

coachRouter.put('/dimensions/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, icon, sortOrder, isActive } = req.body
  const dim = await db.scoreDimension.findFirst({ where: { id, coachId: coachId(req) } })
  if (!dim) return res.status(404).json({ success: false, error: '维度不存在' })
  const updated = await db.scoreDimension.update({
    where: { id },
    data: {
      ...(name && { name }), ...(icon && { icon }),
      ...(sortOrder !== undefined && { sortOrder }), ...(isActive !== undefined && { isActive }),
    },
  })
  res.json({ success: true, data: updated })
})

coachRouter.delete('/dimensions/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  await db.scoreIndicator.deleteMany({ where: { dimensionId: id } })
  await db.scoreDimension.deleteMany({ where: { id, coachId: coachId(req) } })
  res.json({ success: true, message: '删除成功' })
})

coachRouter.post('/indicators', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { dimensionId, name, criteria, defaultPoints, dailyLimit, sortOrder } = req.body
  const dim = await db.scoreDimension.findFirst({ where: { id: dimensionId, coachId: coachId(req) } })
  if (!dim) return res.status(404).json({ success: false, error: '维度不存在' })
  const indicator = await db.scoreIndicator.create({
    data: { dimensionId, name, criteria: criteria || '', defaultPoints: defaultPoints || 5, dailyLimit: dailyLimit || 20, sortOrder: sortOrder || 0 },
  })
  res.json({ success: true, data: indicator })
})

coachRouter.put('/indicators/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, criteria, defaultPoints, dailyLimit, isActive, sortOrder } = req.body
  const updated = await db.scoreIndicator.update({
    where: { id },
    data: {
      ...(name && { name }), ...(criteria !== undefined && { criteria }),
      ...(defaultPoints !== undefined && { defaultPoints }), ...(dailyLimit !== undefined && { dailyLimit }),
      ...(isActive !== undefined && { isActive }), ...(sortOrder !== undefined && { sortOrder }),
    },
  })
  res.json({ success: true, data: updated })
})

coachRouter.delete('/indicators/:id', authenticate, requireRole('coach'), async (_req: AuthRequest, res: Response) => {
  const id = _req.params.id as string
  await db.scoreIndicator.deleteMany({ where: { id } })
  res.json({ success: true, message: '删除成功' })
})

// ---------- 奖励规则 ----------

coachRouter.get('/bonus-rules', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const rules = await db.bonusRule.findMany({ where: { coachId: coachId(req) } })
  res.json({ success: true, data: rules })
})

coachRouter.put('/bonus-rules/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, points, frequency, criteria, isActive } = req.body
  const updateData: any = {}
  if (name) updateData.name = name
  if (points !== undefined) updateData.points = points
  if (frequency) updateData.frequency = frequency
  if (criteria) updateData.criteria = criteria
  if (isActive !== undefined) updateData.isActive = isActive
  const updated = await db.bonusRule.update({ where: { id }, data: updateData })
  res.json({ success: true, data: updated })
})

// ---------- 模式开关 ----------

coachRouter.get('/mode', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const coach = await db.coach.findUnique({ where: { id: coachId(req) }, select: { playerMode: true } })
  res.json({ success: true, data: { playerMode: coach?.playerMode || 'display' } })
})

coachRouter.put('/mode', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { playerMode } = req.body
  if (!['open', 'display'].includes(playerMode)) {
    return res.status(400).json({ success: false, error: '无效的模式值' })
  }
  await db.coach.update({ where: { id: coachId(req) }, data: { playerMode, updatedAt: Date.now() } })
  res.json({ success: true, data: { playerMode } })
})

// ---------- 快捷链接 ----------

coachRouter.get('/players/:id/quick-link', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  const coach = await db.coach.findUnique({ where: { id: coachId(req) }, select: { phone: true } })
  const link = `/join?c=${coach!.phone}&p=${id}`
  res.json({ success: true, data: { link, playerName: player.name } })
})

// ---------- 商店 ----------

coachRouter.get('/shop-items', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const items = await db.shopItem.findMany({
    where: { OR: [{ coachId: coachId(req) }, { coachId: null }] },
    orderBy: { sortOrder: 'asc' },
  })
  res.json({ success: true, data: items.map(i => ({ ...i, effect: JSON.parse(JSON.stringify(i.effect)) })) })
})

coachRouter.put('/shop-items/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const item = await db.shopItem.findFirst({ where: { id, coachId: coachId(req) } })
  if (!item) return res.status(404).json({ success: false, error: '物品不存在' })
  const { name, description, price, stock, isActive } = req.body
  const updateData: any = {}
  if (name) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (price !== undefined) updateData.price = price
  if (stock !== undefined) updateData.stock = stock
  if (isActive !== undefined) updateData.isActive = isActive
  const updated = await db.shopItem.update({ where: { id }, data: updateData })
  res.json({ success: true, data: { ...updated, effect: JSON.parse(JSON.stringify(updated.effect)) } })
})

// ---------- 数据导入 ----------

coachRouter.post('/import', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { type, data } = req.body
  if (!type || !data) return res.status(400).json({ success: false, error: 'type 和 data 必填' })
  await db.customData.create({ data: { coachId: coachId(req), type, data, importedAt: Date.now() } })
  res.json({ success: true, message: '导入成功' })
})
