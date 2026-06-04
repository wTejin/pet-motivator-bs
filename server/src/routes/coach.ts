import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import path from 'path'
import { hashPassword, verifyPassword, signToken } from '../services/auth'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { config, getDefaultPassword } from '../config'

const db = new PrismaClient()
export const coachRouter = Router()

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = process.env.UPLOAD_DIR || './public/avatars'
    cb(null, dir)
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
    where: { coachId: coachId(req), isActive: true }, orderBy: { createdAt: 'asc' },
    include: { pet: true },
  })
  const data = players.map(p => ({
    id: p.id, name: p.name, avatar: p.avatar,
    currentPoints: p.currentPoints, isActive: p.isActive,
    age: p.age, birthDate: p.birthDate, trainingStartDate: p.trainingStartDate,
    gender: p.gender, fatherHeightCm: p.fatherHeightCm, motherHeightCm: p.motherHeightCm,
    pet: p.pet || null, createdAt: Number(p.createdAt),
  }))
  res.json({ success: true, data })
})

// ── 辅助：从出生日期推算年龄 ──
function computeAgeFromBirthDate(birthDate: string): number | null {
  if (!birthDate) return null
  try {
    const birth = new Date(birthDate)
    if (isNaN(birth.getTime())) return null
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
    return age
  } catch { return null }
}

coachRouter.post('/players', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, avatar, age, birthDate, trainingStartDate, gender, fatherHeightCm, motherHeightCm } = req.body
  const now = Date.now()
  const finalAge = age != null ? Number(age) : computeAgeFromBirthDate(birthDate)
  const player = await db.player.create({
    data: {
      coachId: coachId(req),
      name,
      avatar: avatar || '😊',
      age: finalAge,
      birthDate: birthDate || null,
      trainingStartDate: trainingStartDate || null,
      gender: gender || null,
      fatherHeightCm: fatherHeightCm != null ? parseFloat(fatherHeightCm) : null,
      motherHeightCm: motherHeightCm != null ? parseFloat(motherHeightCm) : null,
      createdAt: now,
      updatedAt: now,
    },
  })
  res.json({ success: true, data: player })
})

coachRouter.put('/players/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const { name, avatar, age, birthDate, trainingStartDate, gender, fatherHeightCm, motherHeightCm, isActive } = req.body
  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  // Auto-compute age from birthDate when age not explicitly provided
  let finalAge: number | null | undefined
  if (age !== undefined) {
    finalAge = age != null ? Number(age) : null
  } else if (birthDate !== undefined) {
    finalAge = computeAgeFromBirthDate(birthDate)
  }
  const updated = await db.player.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(avatar !== undefined && { avatar }),
      ...(finalAge !== undefined && { age: finalAge }),
      ...(birthDate !== undefined && { birthDate: birthDate || null }),
      ...(trainingStartDate !== undefined && { trainingStartDate: trainingStartDate || null }),
      ...(gender !== undefined && { gender: gender || null }),
      ...(fatherHeightCm !== undefined && { fatherHeightCm: fatherHeightCm != null ? parseFloat(fatherHeightCm) : null }),
      ...(motherHeightCm !== undefined && { motherHeightCm: motherHeightCm != null ? parseFloat(motherHeightCm) : null }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: Date.now(),
    },
  })
  res.json({ success: true, data: updated })
})

// ── 球员详情（Bio-Leap 兼容）──
coachRouter.get('/players/:id/detail', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const [pet, snapshot, latestBio] = await Promise.all([
    db.pet.findUnique({ where: { playerId: id } }),
    db.pipelineSnapshot.findFirst({ where: { playerId: id }, orderBy: { computedAt: 'desc' } }),
    db.playerBiometric.findFirst({ where: { playerId: id }, orderBy: { measuredAt: 'desc' } }),
  ])

  res.json({
    success: true,
    data: {
      player,
      pet,
      snapshot: snapshot ? { ...snapshot, computedAt: Number(snapshot.computedAt) } : null,
      latestBiometric: latestBio ? { ...latestBio, measuredAt: Number(latestBio.measuredAt) } : null,
    },
  })
})

coachRouter.delete('/players/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string
  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  // 软删除：保留全部数据供研究分析，仅标记 isActive=false 隐藏
  await db.player.update({
    where: { id },
    data: { isActive: false, updatedAt: Date.now() },
  })

  res.json({ success: true, message: '已停用（数据已保留）' })
})

// ---------- 记分 ----------

coachRouter.post('/scores', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { playerId, indicatorId, points, type, reason, sessionId } = req.body
  const player = await db.player.findFirst({ where: { id: playerId, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  if (indicatorId) {
    const customIndicator = await db.customIndicator.findUnique({ where: { id: indicatorId } })
    if (customIndicator) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const todayCount = await db.scoreRecord.aggregate({
        where: { playerId, indicatorId, createdAt: { gte: todayStart.getTime() } },
        _sum: { points: true },
      })
      const todayPoints = todayCount._sum.points || 0
      if (points > 0 && todayPoints + points > customIndicator.dailyLimit) {
        return res.status(400).json({ success: false, error: `今日该指标已达上限 (${todayPoints}/${customIndicator.dailyLimit})` })
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

  // ── 优先使用 Bio-Leap PipelineSnapshot ──
  const pipelineSnapshot = await db.pipelineSnapshot.findFirst({
    where: { playerId },
    orderBy: { computedAt: 'desc' },
  })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0)
  const [todayScores, weekScores] = await Promise.all([
    db.scoreRecord.aggregate({ where: { playerId, type: { in: ['earn', 'penalty'] }, createdAt: { gte: todayStart.getTime() } }, _sum: { points: true } }),
    db.scoreRecord.aggregate({ where: { playerId, type: { in: ['earn', 'penalty'] }, createdAt: { gte: weekStart.getTime() } }, _sum: { points: true } }),
  ])
  const allPlayers = await db.player.findMany({
    where: { coachId: coachId(req) }, select: { id: true, currentPoints: true },
    orderBy: { currentPoints: 'desc' },
  })
  const rank = allPlayers.findIndex(p => p.id === playerId) + 1

  if (pipelineSnapshot) {
    const dimJson = pipelineSnapshot.dimensionJson as Record<string, any>
    const BIO_LEAP_DIM_META = [
      { key: 'spatialIq',  name: '空间觉察',  icon: '🧠' },
      { key: 'techExec',   name: '技术执行',  icon: '⚽' },
      { key: 'engagement', name: '执行饱和度', icon: '💪' },
      { key: 'resilience', name: '挫折复原力', icon: '🛡️' },
      { key: 'altruism',   name: '无私协作性', icon: '🤝' },
      { key: 'envNoise',   name: '环境抗噪度', icon: '🏠' },
    ]
    const dimensions = BIO_LEAP_DIM_META.map(meta => {
      const dim = dimJson[meta.key] || {}
      return {
        dimensionKey: meta.key, dimensionName: meta.name, icon: meta.icon,
        score: dim.final ?? dim.maturityCorrected ?? 50, maxScore: 99,
        details: { raw: dim.raw ?? 0, ema: dim.ema ?? 0, expectedScore: dim.expectedScore ?? 0, correctionFactor: dim.correctionFactor ?? 1.0, final: dim.final ?? 50 },
      }
    })
    let age: number | null = null
    if (player.birthDate) {
      const birth = new Date(player.birthDate)
      age = Math.round(((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000)) * 10) / 10
    } else if (player.age != null) { age = player.age }

    return res.json({
      success: true,
      data: {
        _version: 'bio-leap',
        playerId, playerName: player.name, avatar: player.avatar,
        age, birthDate: player.birthDate, trainingStartDate: player.trainingStartDate, gender: player.gender,
        overall: pipelineSnapshot.overall,
        potentialIndex: pipelineSnapshot.potentialIndex,
        potentialTier: pipelineSnapshot.potentialTier,
        dimensions,
        maturityCategory: pipelineSnapshot.maturityCategory,
        maturityOffset: pipelineSnapshot.maturityOffset,
        envCategory: pipelineSnapshot.envCategory,
        hedgingActive: pipelineSnapshot.hedgingActive,
        totalPoints: player.currentPoints,
        todayPoints: todayScores._sum?.points || 0, weeklyPoints: weekScores._sum?.points || 0, rank,
        computedAt: Number(pipelineSnapshot.computedAt),
      },
    })
  }

  // ── 兜底：无管道数据 —— 诊断缺失原因 ──
  const [hasAssessments, hasBiometric] = await Promise.all([
    db.dailyAssessment.count({ where: { playerId } }).then(c => c > 0),
    db.playerBiometric.count({ where: { playerId } }).then(c => c > 0),
  ])
  let missingReason = ''
  if (!hasAssessments && !hasBiometric) {
    missingReason = '暂无评估记录和身体测量数据，请先录入每日评估和身高体重信息'
  } else if (!hasAssessments) {
    missingReason = '暂无评估记录，请先在记分页完成每日评估'
  } else if (!hasBiometric) {
    missingReason = '缺少身体测量数据（身高/体重/坐高），请在球员详情页录入后方可生成能力雷达'
  }

  res.json({
    success: true,
    data: {
      _version: 'legacy',
      playerId, playerName: player.name, avatar: player.avatar, age: player.age ?? null, overall: 0, dimensions: [],
      missingReason,
      totalPoints: player.currentPoints,
      todayPoints: todayScores._sum?.points || 0, weeklyPoints: weekScores._sum?.points || 0, rank,
    },
  })
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

// ---------- 头像上传 ----------

coachRouter.post('/upload-avatar', authenticate, requireRole('coach'), avatarUpload.single('avatar'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: '未收到文件' })
  const url = `/avatars/${req.file.filename}`
  res.json({ success: true, data: { url } })
})
