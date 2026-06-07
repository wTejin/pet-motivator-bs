import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { computePipeline } from '../services/pipeline'
import { tryLuckyDrop } from '../services/luckyDrop.js'
import { applyCarePoints } from '../services/pet.js'

const db = new PrismaClient()
export const assessmentRouter = Router()

function coachId(req: AuthRequest): string {
  return req.userId!
}

const SUB_INDICATOR_MAP: Record<string, string[]> = {
  spatialIq:  ['subScanRate', 'subDecisionSpeed', 'subOffBallMove'],
  resilience: ['subRecoveryReact', 'subReengageDef', 'subConfToReceive'],
  altruism:   ['subCommunication', 'subCoverTeam', 'subUnfamiliarPos'],
  envNoise:   ['subParentBehavior', 'subAttendance', 'subSelfSufficient'],
}

function computeDimScore(body: any, dimKey: string): number | null {
  const subKeys = SUB_INDICATOR_MAP[dimKey]
  if (!subKeys) return null
  const scores: number[] = []
  for (const key of subKeys) {
    const v = body[key]
    if (typeof v === 'number' && v >= 1 && v <= 5) scores.push(v)
  }
  if (scores.length < 2) return null
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length
  return Math.round(avg)
}

function validateAssessment(body: any): string | null {
  if (!body.playerId) return '请选择球员'
  const DIM_KEYS = Object.keys(SUB_INDICATOR_MAP)
  for (const dim of DIM_KEYS) {
    const directScore = body[dim]
    const hasDirect = typeof directScore === 'number' && directScore >= 1 && directScore <= 5
    const subScore = computeDimScore(body, dim)
    if (!hasDirect && subScore === null) return `${dim} 评分缺失：请直接打分或填写子指标`
  }
  for (const dim of ['techExec', 'engagement']) {
    const v = body[dim]
    if (typeof v !== 'number' || v < 1 || v > 5) return `${dim} 评分缺失（1-5 星）`
  }
  return null
}

// ── 录入评估 ──
assessmentRouter.post('/players/:playerId/assessments', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    req.body.playerId = req.params.playerId as string
    const err = validateAssessment(req.body)
    if (err) return res.status(400).json({ success: false, error: err })

    const { sessionId, notes } = req.body
    const playerId = req.params.playerId as string

    const player = await db.player.findFirst({ where: { id: playerId, coachId: coachId(req) } })
    if (!player) return res.status(404).json({ success: false, error: '球员不存在' })

    // ── 每日上限：同一球员每天只能评估一次 ──
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayExisting = await db.dailyAssessment.findFirst({
      where: { playerId, createdAt: { gte: todayStart.getTime() } },
    })
    if (todayExisting) {
      return res.status(409).json({
        success: false,
        error: '该球员今日已评估，请使用编辑功能修改已有记录',
        existingAssessmentId: todayExisting.id,
      })
    }

    const dimKeys = Object.keys(SUB_INDICATOR_MAP) as Array<keyof typeof SUB_INDICATOR_MAP>
    const dimScores: Record<string, number> = {}
    for (const dim of dimKeys) {
      const fromSubs = computeDimScore(req.body, dim)
      dimScores[dim] = fromSubs ?? (req.body[dim] as number)
    }
    dimScores['techExec'] = req.body.techExec as number
    dimScores['engagement'] = req.body.engagement as number

    const subFields: Record<string, number | null> = {}
    for (const subs of Object.values(SUB_INDICATOR_MAP)) {
      for (const key of subs) {
        const v = req.body[key]
        subFields[key] = typeof v === 'number' && v >= 1 && v <= 5 ? v : null
      }
    }

    const now = Date.now()
    const dimValues = Object.values(dimScores) as number[]
    const avgScore = dimValues.reduce((s, v) => s + v, 0) / dimValues.length

    // 评估折算积分：均星×1.5，最低 1 分（确保参与就有收获）
    const earnPoints = Math.max(1, Math.round(avgScore * 1.5))

    // ── 事务写入：评估 + 积分 + 玩家余额（双重防并发）──
    const assessment = await db.$transaction(async (tx) => {
      // 事务内再次检查，防止并发重复评估
      const dupCheck = await tx.dailyAssessment.findFirst({
        where: { playerId, createdAt: { gte: todayStart.getTime() } },
      })
      if (dupCheck) {
        throw new Error('ALREADY_ASSESSED_TODAY')
      }

      const created = await tx.dailyAssessment.create({
        data: {
          coachId: coachId(req),
          playerId,
          sessionId: sessionId || null,
          ...dimScores,
          ...subFields,
          notes: notes || null,
          createdAt: now,
        } as any,
      })

      // 自动生成积分记录（type=earn → 计入雷达图 / 反映训练能力）
      await tx.scoreRecord.create({
        data: {
          coachId: coachId(req),
          playerId,
          indicatorId: null,
          points: earnPoints,
          type: 'earn',
          reason: `训练评估 · 均${avgScore.toFixed(1)}星`,
          operatorType: 'coach',
          operatorId: coachId(req),
          createdAt: now,
        },
      })

      await tx.player.update({
        where: { id: playerId },
        data: {
          currentPoints: { increment: earnPoints },
          updatedAt: now,
        },
      })

      return created
    })

    // ── 宠物联动：评估 → carePoints ──
    let careBonus = 3 // 基础参与分
    if (avgScore >= 4) careBonus = 10
    else if (avgScore >= 3) careBonus = 6

    const pet = await db.pet.findUnique({ where: { playerId } })
    if (pet) {
      await db.pet.update({ where: { playerId }, data: applyCarePoints(pet, careBonus) })
    }

    // 异步触发管道重算
    computePipeline(playerId).catch((err: any) => console.error('[Pipeline] async compute error:', err.message))

    // 惊喜掉落：评估均星 ≥ 4 有概率触发
    let luckyDrop = null
    if (avgScore >= 4) {
      luckyDrop = await tryLuckyDrop({ playerId, trigger: 'assessment' })
    }

    res.json({
      success: true,
      data: {
        ...assessment,
        createdAt: Number(assessment.createdAt),
        earnPoints,
        petCareBonus: careBonus,
        luckyDrop,
      },
    })
  } catch (e: any) {
    if (e.message === 'ALREADY_ASSESSED_TODAY') {
      return res.status(409).json({ success: false, error: '该球员今日已评估，请使用编辑功能修改已有记录' })
    }
    res.status(500).json({ success: false, error: e.message || '评估录入失败' })
  }
})

// ── 获取球员评估列表 ──
assessmentRouter.get('/players/:playerId/assessments', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const { from, to, limit } = req.query
    const where: any = { playerId: req.params.playerId as string, coachId: coachId(req) }
    if (from) where.createdAt = { gte: Number(from) }
    if (to) where.createdAt = { ...where.createdAt, lte: Number(to) }

    const assessments = await db.dailyAssessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? Math.min(Number(limit), 200) : 50,
    })

    res.json({ success: true, data: assessments.map((a: any) => ({ ...a, createdAt: Number(a.createdAt) })) })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 最近评估摘要（Bio-Leap 兼容）──
assessmentRouter.get('/assessments/recent', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000
    const assessments = await db.dailyAssessment.findMany({
      where: { coachId: coachId(req), createdAt: { gte: sevenDaysAgo } },
      include: { player: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const byPlayer: Record<string, any> = {}
    for (const a of assessments) {
      if (!byPlayer[a.playerId]) {
        byPlayer[a.playerId] = { playerId: a.playerId, playerName: a.player.name, playerAvatar: a.player.avatar, count: 0, lastAssessedAt: Number(a.createdAt) }
      }
      byPlayer[a.playerId].count++
    }
    res.json({ success: true, data: Object.values(byPlayer) })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 批量获取多球员最新评估（Bio-Leap 兼容）──
assessmentRouter.get('/assessments/batch', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const idsParam = req.query.playerIds as string
    if (!idsParam) return res.status(400).json({ success: false, error: '请提供 playerIds' })
    const playerIds = idsParam.split(',').filter(Boolean)
    if (playerIds.length === 0) return res.json({ success: true, data: [] })
    const results: any[] = []
    for (const pid of playerIds) {
      const latest = await db.dailyAssessment.findFirst({
        where: { playerId: pid, coachId: coachId(req) },
        orderBy: { createdAt: 'desc' },
      })
      results.push({ playerId: pid, latest: latest ? { ...latest, createdAt: Number(latest.createdAt) } : null })
    }
    res.json({ success: true, data: results })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})
