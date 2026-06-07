import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { computePipeline } from '../services/pipeline'
import { computeMaturityOffset, calcChronologicalAge } from '../services/pipeline/mirwald'
import { getStageByCarePoints, syncLevelWithStage } from '../services/pet.js'

const db = new PrismaClient()
export const pipelineRouter = Router()

function coachId(req: AuthRequest): string {
  return req.userId!
}

// ── 触发管道计算 ──
pipelineRouter.post('/players/:playerId/compute', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const player = await db.player.findFirst({
      where: { id: req.params.playerId as string, coachId: coachId(req) },
    })
    if (!player) return res.status(404).json({ success: false, error: '球员不存在' })

    const result = await computePipeline(req.params.playerId as string)
    if (!result) {
      return res.status(400).json({
        success: false,
        error: '数据不足：需要至少一次体测记录和评估记录才能运行管道',
      })
    }

    // ── 宠物联动：管道分数 → carePoints ──
    let pipelineCareBonus = 0
    if (result.overall >= 80) pipelineCareBonus = 30
    else if (result.overall >= 60) pipelineCareBonus = 20
    else if (result.overall >= 40) pipelineCareBonus = 10

    if (pipelineCareBonus > 0) {
      const pet = await db.pet.findUnique({ where: { playerId: req.params.playerId as string } })
      if (pet) {
        const newCarePoints = Math.min(1000, pet.carePoints + pipelineCareBonus)
        const newStage = getStageByCarePoints(newCarePoints)
        const shouldEvolve = newStage !== pet.stage && pet.hunger >= 50 && pet.mood >= 50
        const updateData: any = { carePoints: newCarePoints }
        if (shouldEvolve) {
          updateData.stage = newStage
          updateData.evolvedAt = BigInt(Date.now())
          syncLevelWithStage(pet, newStage)
          updateData.level = pet.level
        }
        await db.pet.update({
          where: { playerId: req.params.playerId as string },
          data: updateData,
        })
      }
    }

    // ── 积分奖励：管道综合分 → bonus 积分（7 天冷却）──
    let pipelinePointBonus = 0
    if (result.overall >= 80) pipelinePointBonus = 15
    else if (result.overall >= 60) pipelinePointBonus = 10
    else if (result.overall >= 40) pipelinePointBonus = 5

    if (pipelinePointBonus > 0) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000
      const recentBonus = await db.scoreRecord.findFirst({
        where: {
          playerId: req.params.playerId as string,
          type: 'bonus',
          reason: { startsWith: '能力成长奖励' },
          createdAt: { gte: sevenDaysAgo },
        },
      })
      if (!recentBonus) {
        const now = Date.now()
        const updatedPlayer = await db.$transaction(async (tx) => {
          await tx.scoreRecord.create({
            data: {
              coachId: player.coachId,
              playerId: req.params.playerId as string,
              indicatorId: null,
              points: pipelinePointBonus,
              type: 'bonus',
              reason: `能力成长奖励 · overall ${result.overall} 分`,
              operatorType: 'system',
              operatorId: 'pipeline',
              createdAt: now,
            },
          })
          return tx.player.update({
            where: { id: req.params.playerId as string },
            data: { currentPoints: { increment: pipelinePointBonus }, updatedAt: now },
            select: { currentPoints: true },
          })
        })
        res.json({
          success: true,
          data: {
            ...result,
            petCareBonus: pipelineCareBonus,
            pointBonus: pipelinePointBonus,
            currentPoints: updatedPlayer.currentPoints,
          },
        })
        return
      }
    }

    res.json({ success: true, data: { ...result, petCareBonus: pipelineCareBonus } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '管道计算失败' })
  }
})

// ── 获取最新管道结果 ──
pipelineRouter.get('/players/:playerId/snapshot', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await db.pipelineSnapshot.findFirst({
      where: { playerId: req.params.playerId as string },
      orderBy: { computedAt: 'desc' },
    })
    if (!snapshot) return res.status(404).json({ success: false, error: '暂无管道数据' })

    res.json({ success: true, data: { ...snapshot, computedAt: Number(snapshot.computedAt) } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 获取历史快照（趋势图数据） ──
pipelineRouter.get('/players/:playerId/snapshots', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query
    const where: any = { playerId: req.params.playerId as string }
    if (from) where.computedAt = { gte: Number(from) }
    if (to) where.computedAt = { ...where.computedAt, lte: Number(to) }

    const snapshots = await db.pipelineSnapshot.findMany({
      where,
      orderBy: { computedAt: 'asc' },
    })

    res.json({ success: true, data: snapshots.map((s: any) => ({ ...s, computedAt: Number(s.computedAt) })) })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 调试面板数据 ──
pipelineRouter.get('/players/:playerId/debug', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await db.pipelineSnapshot.findFirst({
      where: { playerId: req.params.playerId as string },
      orderBy: { computedAt: 'desc' },
    })
    const player = await db.player.findUnique({ where: { id: req.params.playerId as string } })
    if (!player) return res.status(404).json({ success: false, error: '球员不存在' })

    const latestBio = await db.playerBiometric.findFirst({
      where: { playerId: req.params.playerId as string },
      orderBy: { measuredAt: 'desc' },
    })

    let mirwaldDebug = null
    if (latestBio && player.birthDate) {
      const age = calcChronologicalAge(player.birthDate)
      mirwaldDebug = computeMaturityOffset({
        chronologicalAge: age,
        heightCm: latestBio.heightCm,
        weightKg: latestBio.weightKg,
        sittingHeightCm: latestBio.sittingHeightCm,
        gender: player.gender ?? null,
      })
    }

    res.json({
      success: true,
      data: {
        player: { name: player.name, birthDate: player.birthDate, chronologicalAge: player.birthDate ? calcChronologicalAge(player.birthDate) : null },
        biometric: latestBio ? { ...latestBio, measuredAt: Number(latestBio.measuredAt) } : null,
        mirwald: mirwaldDebug,
        snapshot: snapshot ? { ...snapshot, computedAt: Number(snapshot.computedAt) } : null,
      },
    })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})
