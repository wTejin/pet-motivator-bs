import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import path from 'path'
import { hashPassword, verifyPassword, signToken } from '../services/auth'
import { refreshPlayerStatsCache } from '../services/stats'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { config, getDefaultPassword } from '../config'

const db = new PrismaClient()
export const coachRouter = Router()

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../public/avatars'))
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `avatar-${unique}${ext}`)
  },
})

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('仅支持 JPG/PNG/GIF/WebP 图片'))
  },
})

function coachId(req: AuthRequest): string { return req.userId! }

// ---------- 注册 & 登录 ----------

coachRouter.post('/register', async (req: AuthRequest, res: Response) => {
  const { phone, password, school } = req.body
  if (!phone || !/^\d{11}$/.test(phone)) {
    return res.status(400).json({ success: false, error: '请输入有效的11位手机号' })
  }
  const existing = await db.coach.findUnique({ where: { phone } })
  if (existing) return res.status(400).json({ success: false, error: '该手机号已注册' })

  const now = Date.now()
  const trialUntil = now + config.trialDays * 24 * 3600 * 1000
  const passwordHash = await hashPassword(password && password.length >= 6 ? password : getDefaultPassword(phone))
  const coach = await db.coach.create({
    data: {
      phone, passwordHash,
      name: phone,
      school: school || '',
      teamName: school ? `${school}球队` : '',
      trialUntil, authorizedUntil: trialUntil,
      createdAt: now, updatedAt: now,
    },
  })

  await seedDefaultTemplate(coach.id, now)

  res.json({ success: true, data: { id: coach.id, phone: coach.phone, name: coach.name } })
})

async function seedDefaultTemplate(coachId: string, now: number) {
  const dimensions = [
    { name: '技术能力', icon: '⚽', indicators: [
      { name: '传接球稳定性', criteria: '连续5脚以上不失误', defaultPoints: 5, dailyLimit: 20 },
      { name: '盘带成功率', criteria: '1对1突破成功率', defaultPoints: 5, dailyLimit: 20 },
      { name: '射门精度', criteria: '射门命中目标区域', defaultPoints: 5, dailyLimit: 20 },
      { name: '控球能力', criteria: '狭小空间内护球', defaultPoints: 5, dailyLimit: 20 },
    ]},
    { name: '战术洞察', icon: '👁️', indicators: [
      { name: '抬头观察', criteria: '接球前观察场上局势', defaultPoints: 5, dailyLimit: 20 },
      { name: '关键传球', criteria: '创造得分机会的传球', defaultPoints: 10, dailyLimit: 20 },
      { name: '跑位意识', criteria: '无球跑动制造空间', defaultPoints: 5, dailyLimit: 20 },
      { name: '防守预判', criteria: '提前切断传球线路', defaultPoints: 5, dailyLimit: 20 },
    ]},
    { name: '身体素质', icon: '💪', indicators: [
      { name: '冲刺速度', criteria: '30米冲刺表现', defaultPoints: 5, dailyLimit: 20 },
      { name: '爆发力', criteria: '起步加速能力', defaultPoints: 5, dailyLimit: 20 },
      { name: '耐力', criteria: '全场持续跑动能力', defaultPoints: 5, dailyLimit: 20 },
      { name: '柔韧性', criteria: '拉伸和关节活动度', defaultPoints: 5, dailyLimit: 20 },
    ]},
    { name: '心理素质', icon: '🧠', indicators: [
      { name: '抗压能力', criteria: '落后或失误后的表现', defaultPoints: 5, dailyLimit: 20 },
      { name: '专注力', criteria: '训练中不分心', defaultPoints: 5, dailyLimit: 20 },
      { name: '自信心', criteria: '敢于做动作和决策', defaultPoints: 5, dailyLimit: 20 },
      { name: '情绪管理', criteria: '控制情绪不抱怨', defaultPoints: 5, dailyLimit: 20 },
    ]},
    { name: '团队协作', icon: '🤝', indicators: [
      { name: '沟通配合', criteria: '场上语言和非语言沟通', defaultPoints: 5, dailyLimit: 20 },
      { name: '无私传球', criteria: '为队友创造机会', defaultPoints: 5, dailyLimit: 20 },
      { name: '补位协防', criteria: '队友失位时及时补位', defaultPoints: 5, dailyLimit: 20 },
      { name: '鼓励队友', criteria: '积极正面的团队氛围', defaultPoints: 5, dailyLimit: 20 },
    ]},
    { name: '比赛态度', icon: '🔥', indicators: [
      { name: '拼搏精神', criteria: '不放弃每一个球', defaultPoints: 5, dailyLimit: 20 },
      { name: '遵守纪律', criteria: '服从教练安排', defaultPoints: 5, dailyLimit: 20 },
      { name: '尊重裁判', criteria: '不对判罚抱怨', defaultPoints: 5, dailyLimit: 20 },
      { name: '积极热身', criteria: '热身认真不敷衍', defaultPoints: 5, dailyLimit: 20 },
    ]},
  ]

  for (let di = 0; di < dimensions.length; di++) {
    const dim = dimensions[di]
    const createdDim = await db.scoreDimension.create({
      data: { coachId, name: dim.name, icon: dim.icon, sortOrder: di },
    })
    for (let ii = 0; ii < dim.indicators.length; ii++) {
      const ind = dim.indicators[ii]
      await db.scoreIndicator.create({
        data: {
          dimensionId: createdDim.id,
          name: ind.name,
          criteria: ind.criteria,
          defaultPoints: ind.defaultPoints,
          dailyLimit: ind.dailyLimit,
          sortOrder: ii,
        },
      })
    }
  }

  const bonusRules = [
    { name: '全勤奖', points: 50, frequency: 'weekly', criteria: '本周训练全部到场' },
    { name: '周最佳球员', points: 30, frequency: 'weekly', criteria: '本周综合表现最佳' },
    { name: '月度进步奖', points: 100, frequency: 'monthly', criteria: '本月进步幅度最大' },
    { name: '团队贡献奖', points: 50, frequency: 'weekly', criteria: '为团队做出突出贡献' },
    { name: '拼搏奖', points: 20, frequency: 'weekly', criteria: '训练中表现出顽强拼搏精神' },
  ]

  for (const rule of bonusRules) {
    await db.bonusRule.create({
      data: { coachId, name: rule.name, points: rule.points, frequency: rule.frequency, criteria: rule.criteria },
    })
  }
}

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
        teamName: coach.teamName,
        teamLogo: coach.teamLogo,
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

coachRouter.get('/me', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const coach = await db.coach.findUnique({ where: { id: coachId(req) } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })
  res.json({
    success: true,
    data: {
      id: coach.id,
      phone: coach.phone,
      name: coach.name,
      school: coach.school,
      teamName: coach.teamName,
      teamLogo: coach.teamLogo,
      playerMode: coach.playerMode,
      trialUntil: Number(coach.trialUntil),
      authorizedUntil: Number(coach.authorizedUntil),
    },
  })
})

coachRouter.put('/me', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, school, teamName, teamLogo } = req.body
  const updated = await db.coach.update({
    where: { id: coachId(req) },
    data: {
      ...(name !== undefined && { name }),
      ...(school !== undefined && { school }),
      ...(teamName !== undefined && { teamName }),
      ...(teamLogo !== undefined && { teamLogo }),
      updatedAt: Date.now(),
    },
  })
  res.json({
    success: true,
    data: {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      school: updated.school,
      teamName: updated.teamName,
      teamLogo: updated.teamLogo,
      playerMode: updated.playerMode,
      trialUntil: Number(updated.trialUntil),
      authorizedUntil: Number(updated.authorizedUntil),
    },
  })
})

// ---------- 球员管理 ----------

coachRouter.get('/players', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const players = await db.player.findMany({
    where: { coachId: coachId(req) }, orderBy: { createdAt: 'asc' },
    include: { pet: true },
  })
  const data = players.map(p => ({
    id: p.id, name: p.name, avatar: p.avatar,
    currentPoints: p.currentPoints,
    isActive: p.isActive, pet: p.pet || null, createdAt: Number(p.createdAt),
  }))
  res.json({ success: true, data })
})

coachRouter.post('/players', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, avatar, age } = req.body
  const now = Date.now()
  const player = await db.player.create({
    data: { coachId: coachId(req), name, avatar: avatar || '😊', age: age != null ? Number(age) : null, createdAt: now, updatedAt: now },
  })
  res.json({ success: true, data: player })
})

coachRouter.put('/players/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, avatar, age, isActive } = req.body
  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  const updated = await db.player.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(avatar !== undefined && { avatar }),
      ...(age !== undefined && { age: age != null ? Number(age) : null }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: Date.now(),
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
  await db.transactionRecord.deleteMany({ where: { playerId: id } })
  await db.playerInventory.deleteMany({ where: { playerId: id } })
  await db.playerStatsCache.deleteMany({ where: { playerId: id } })
  await db.attendance.deleteMany({ where: { playerId: id } })
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
    const customIndicator = indicator ? null : await db.customIndicator.findUnique({ where: { id: indicatorId } })
    const limitSource = indicator || customIndicator
    if (limitSource) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const todayCount = await db.scoreRecord.aggregate({
        where: { playerId, indicatorId, createdAt: { gte: todayStart.getTime() } },
        _sum: { points: true },
      })
      const todayPoints = todayCount._sum.points || 0
      if (points > 0 && todayPoints + points > limitSource.dailyLimit) {
        return res.status(400).json({ success: false, error: `今日该指标已达上限 (${todayPoints}/${limitSource.dailyLimit})` })
      }
    }
  }

  const now = Date.now()
  try {
    const record = await db.$transaction(async (tx) => {
      const created = await tx.scoreRecord.create({
        data: {
          coachId: coachId(req), playerId, ruleId: null, indicatorId: indicatorId || null,
          sessionId: sessionId || null, points, type, reason,
          operatorType: 'coach', operatorId: coachId(req), createdAt: now,
        },
      })
      await tx.player.update({
        where: { id: playerId },
        data: {
          currentPoints: { increment: points },
          updatedAt: now,
        },
      })
      return created
    })

    // 异步刷新学员能力数据缓存（不阻塞响应）
    refreshPlayerStatsCache(playerId, coachId(req)).catch(() => {})

    res.json({ success: true, data: record })
  } catch (e) {
    return res.status(500).json({ success: false, error: '操作失败，请重试' })
  }
})

coachRouter.get('/scores/:playerId', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const records = await db.scoreRecord.findMany({
    where: { playerId, coachId: coachId(req) },
    orderBy: { createdAt: 'desc' }, take: 50,
  })
  res.json({ success: true, data: records.map(r => ({ ...r, createdAt: Number(r.createdAt) })) })
})

// ---------- 仪表盘聚合数据 ----------

coachRouter.get('/dashboard-stats', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const cid = coachId(req)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  const [players, todayAgg, totalAgg, recentRecords] = await Promise.all([
    db.player.findMany({ where: { coachId: cid }, include: { pet: true } }),
    db.scoreRecord.aggregate({
      where: { coachId: cid, type: { in: ['earn', 'penalty'] }, createdAt: { gte: todayStart.getTime() } },
      _sum: { points: true }, _count: { points: true },
    }),
    db.scoreRecord.aggregate({
      where: { coachId: cid, type: { in: ['earn', 'penalty'] } },
      _sum: { points: true }, _count: { points: true },
    }),
    db.scoreRecord.findMany({
      where: { coachId: cid },
      orderBy: { createdAt: 'desc' }, take: 10,
      include: { player: { select: { name: true, avatar: true } } },
    }),
  ])

  const playerCount = players.filter(p => p.isActive).length
  const petCount = players.filter(p => p.pet).length

  res.json({
    success: true,
    data: {
      playerCount,
      petCount,
      todayScores: todayAgg._sum?.points || 0,
      todayCount: todayAgg._count?.points || 0,
      totalScores: totalAgg._sum?.points || 0,
      totalCount: totalAgg._count?.points || 0,
      recentRecords: recentRecords.map(r => ({
        id: r.id,
        reason: r.reason,
        points: r.points,
        playerName: r.player?.name || '',
        playerAvatar: r.player?.avatar || '',
        type: r.type,
        createdAt: Number(r.createdAt),
      })),
    },
  })
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
    db.scoreRecord.aggregate({ where: { playerId, type: { in: ['earn', 'penalty'] }, createdAt: { gte: todayStart.getTime() } }, _sum: { points: true } }),
    db.scoreRecord.aggregate({ where: { playerId, type: { in: ['earn', 'penalty'] }, createdAt: { gte: weekStart.getTime() } }, _sum: { points: true } }),
  ])

  // 优先读取预计算缓存
  let dimStats: any[] = []
  let overall = 0

  const cache = await db.playerStatsCache.findUnique({ where: { playerId } })
  if (cache && Number(cache.updatedAt) > Date.now() - 24 * 3600 * 1000) {
    dimStats = Array.isArray(cache.dimensionJson) ? cache.dimensionJson : []
    overall = cache.overall
  } else {
    const indicatorScores = await db.scoreRecord.groupBy({
      by: ['indicatorId'],
      where: { playerId, indicatorId: { not: null }, type: { in: ['earn', 'penalty'] } },
      _sum: { points: true },
    })
    const scoreMap = new Map(indicatorScores.map(s => [s.indicatorId, s._sum.points || 0]))

    dimStats = dimensions.map((dim) => {
      const maxScore = dim.indicators.reduce((sum, i) => sum + i.dailyLimit * 7, 0)
      const dimTotal = dim.indicators.reduce((sum, ind) => sum + (scoreMap.get(ind.id) || 0), 0)
      const indicators = dim.indicators.map(ind => ({
        indicatorId: ind.id,
        indicatorName: ind.name,
        score: scoreMap.get(ind.id) || 0,
      }))
      return {
        dimensionId: dim.id, dimensionName: dim.name, icon: dim.icon,
        score: Math.min(99, Math.round((dimTotal / Math.max(1, maxScore)) * 99)), maxScore,
        indicators,
      }
    })

    overall = dimStats.length > 0 ? Math.round(dimStats.reduce((s, d) => s + d.score, 0) / dimStats.length) : 0

    // 写入缓存
    await db.playerStatsCache.upsert({
      where: { playerId },
      create: { playerId, overall, dimensionJson: dimStats as any, updatedAt: Date.now() },
      update: { overall, dimensionJson: dimStats as any, updatedAt: Date.now() },
    })
  }
  const allPlayers = await db.player.findMany({
    where: { coachId: coachId(req) }, select: { id: true, currentPoints: true },
    orderBy: { currentPoints: 'desc' },
  })
  const rank = allPlayers.findIndex(p => p.id === playerId) + 1

  res.json({
    success: true,
    data: {
      playerId, playerName: player.name, avatar: player.avatar, age: player.age ?? null, overall, dimensions: dimStats,
      totalPoints: player.currentPoints,
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

// ---------- 自定义指标 ----------

coachRouter.get('/custom-indicators', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const indicators = await db.customIndicator.findMany({
    where: { coachId: coachId(req) },
    orderBy: { sortOrder: 'asc' },
  })
  res.json({ success: true, data: indicators })
})

coachRouter.post('/custom-indicators', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, defaultPoints, dailyLimit, sortOrder } = req.body
  if (!name) return res.status(400).json({ success: false, error: '指标名称必填' })
  const indicator = await db.customIndicator.create({
    data: {
      coachId: coachId(req),
      name,
      defaultPoints: defaultPoints || 5,
      dailyLimit: dailyLimit || 20,
      sortOrder: sortOrder || 0,
    },
  })
  res.json({ success: true, data: indicator })
})

coachRouter.put('/custom-indicators/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, defaultPoints, dailyLimit, isActive, sortOrder } = req.body
  const indicator = await db.customIndicator.findFirst({ where: { id, coachId: coachId(req) } })
  if (!indicator) return res.status(404).json({ success: false, error: '自定义指标不存在' })
  const updated = await db.customIndicator.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(defaultPoints !== undefined && { defaultPoints }),
      ...(dailyLimit !== undefined && { dailyLimit }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  })
  res.json({ success: true, data: updated })
})

coachRouter.delete('/custom-indicators/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  await db.customIndicator.deleteMany({ where: { id, coachId: coachId(req) } })
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


// ---------- 数据导入 ----------

coachRouter.post('/import', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { type, data } = req.body
  if (!type || !data) return res.status(400).json({ success: false, error: 'type 和 data 必填' })
  await db.customData.create({ data: { coachId: coachId(req), type, data, importedAt: Date.now() } })
  res.json({ success: true, message: '导入成功' })
})

// ---------- 训练课次 ----------

coachRouter.get('/sessions', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const sessions = await db.session.findMany({
    where: { coachId: coachId(req) },
    orderBy: { date: 'desc' },
    include: { attendances: { include: { player: { select: { id: true, name: true, avatar: true } } } } },
  })
  res.json({ success: true, data: sessions.map(s => ({ ...s, date: Number(s.date), createdAt: Number(s.createdAt) })) })
})

coachRouter.post('/sessions', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, date } = req.body
  if (!name || !date) return res.status(400).json({ success: false, error: '名称和日期必填' })
  const session = await db.session.create({
    data: { coachId: coachId(req), name, date: Number(date), createdAt: Date.now() },
  })
  res.json({ success: true, data: { ...session, date: Number(session.date) } })
})

coachRouter.put('/sessions/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, date, status } = req.body
  const existing = await db.session.findFirst({ where: { id, coachId: coachId(req) } })
  if (!existing) return res.status(404).json({ success: false, error: '课次不存在' })
  const updated = await db.session.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(date && { date: Number(date) }),
      ...(status && { status }),
    },
  })
  res.json({ success: true, data: { ...updated, date: Number(updated.date) } })
})

coachRouter.delete('/sessions/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const existing = await db.session.findFirst({ where: { id, coachId: coachId(req) } })
  if (!existing) return res.status(404).json({ success: false, error: '课次不存在' })
  await db.attendance.deleteMany({ where: { sessionId: id } })
  await db.session.delete({ where: { id } })
  res.json({ success: true, message: '删除成功' })
})

// ---------- 出勤记录 ----------

coachRouter.post('/attendance', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { sessionId, records } = req.body
  if (!sessionId || !Array.isArray(records)) {
    return res.status(400).json({ success: false, error: 'sessionId 和 records 必填' })
  }
  const session = await db.session.findFirst({ where: { id: sessionId, coachId: coachId(req) } })
  if (!session) return res.status(404).json({ success: false, error: '课次不存在' })

  const now = Date.now()
  await db.attendance.deleteMany({ where: { sessionId } })
  await db.attendance.createMany({
    data: records.map((r: any) => ({
      sessionId,
      playerId: r.playerId,
      status: r.status || 'present',
      createdAt: now,
    })),
  })
  res.json({ success: true, message: '出勤记录已保存' })
})

// ---------- 头像上传 ----------

coachRouter.post('/upload-avatar', authenticate, requireRole('coach'), avatarUpload.single('avatar'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: '未收到文件' })
  const url = `/avatars/${req.file.filename}`
  res.json({ success: true, data: { url } })
})
