import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { config } from '../config'
import { computePipeline } from '../services/pipeline'

const db = new PrismaClient()
export const biometricsRouter = Router()

function coachId(req: AuthRequest): string {
  return req.userId!
}

// ── 获取球员所有体测记录 ──
biometricsRouter.get('/players/:playerId/biometrics', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const records = await db.playerBiometric.findMany({
      where: { playerId: req.params.playerId as string, coachId: coachId(req) },
      orderBy: { measuredAt: 'desc' },
    })
    res.json({ success: true, data: records.map((r: any) => ({ ...r, measuredAt: Number(r.measuredAt) })) })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 录入体测 ──
biometricsRouter.post('/players/:playerId/biometrics', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const { heightCm, weightKg, sittingHeightCm, measuredAt } = req.body
    const playerId = req.params.playerId as string

    if (!heightCm || !weightKg || sittingHeightCm == null) {
      return res.status(400).json({ success: false, error: '请填写完整的体测数据' })
    }
    if (heightCm <= 0 || weightKg <= 0 || sittingHeightCm <= 0) {
      return res.status(400).json({ success: false, error: '体测数据必须大于0' })
    }
    if (sittingHeightCm >= heightCm) {
      return res.status(400).json({ success: false, error: '坐高不能大于等于身高' })
    }
    const ratio = sittingHeightCm / heightCm
    if (ratio < 0.45 || ratio > 0.59) {
      return res.status(400).json({ success: false, error: `坐高/身高比异常 (${ratio.toFixed(2)})，正常范围 0.45~0.59，请检查数据` })
    }

    const player = await db.player.findFirst({ where: { id: playerId, coachId: coachId(req) } })
    if (!player) return res.status(404).json({ success: false, error: '球员不存在' })

    const now = Date.now()
    const record = await db.playerBiometric.create({
      data: {
        playerId,
        coachId: coachId(req),
        heightCm: parseFloat(heightCm),
        weightKg: parseFloat(weightKg),
        sittingHeightCm: parseFloat(sittingHeightCm),
        measuredAt: measuredAt ? Number(measuredAt) : now,
      },
    })

    res.json({ success: true, data: { ...record, measuredAt: Number(record.measuredAt) } })

    // 异步触发管道重算（响应优先，管道后台计算）
    computePipeline(playerId).catch((err: any) => console.error('[Pipeline] async compute after biometric:', err.message))
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 删除体测记录 ──
biometricsRouter.delete('/biometrics/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const record = await db.playerBiometric.findFirst({
      where: { id: req.params.id as string, coachId: coachId(req) },
    })
    if (!record) return res.status(404).json({ success: false, error: '记录不存在' })
    await db.playerBiometric.delete({ where: { id: req.params.id as string } })
    res.json({ success: true, message: '已删除' })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 体测过期提醒（Bio-Leap 兼容）──
biometricsRouter.get('/biometrics/alerts', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const cid = coachId(req)
    const cutoff = Date.now() - config.biometricsMaxAgeDays * 24 * 3600 * 1000
    const players = await db.player.findMany({
      where: { coachId: cid, isActive: true },
      include: { biometrics: { orderBy: { measuredAt: 'desc' }, take: 1 } },
    })
    const overdue = (players as any[])
      .filter(p => !p.biometrics?.length || Number(p.biometrics[0].measuredAt) < cutoff)
      .map(p => ({
        playerId: p.id, playerName: p.name,
        lastMeasuredAt: p.biometrics[0] ? Number(p.biometrics[0].measuredAt) : null,
        daysSince: p.biometrics[0] ? Math.floor((Date.now() - Number(p.biometrics[0].measuredAt)) / (24 * 3600 * 1000)) : 999,
      }))
    res.json({ success: true, data: overdue })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})
