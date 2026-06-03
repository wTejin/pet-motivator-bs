import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { config } from '../config'

const db = new PrismaClient()
export const physicalTestRouter = Router()

function coachId(req: AuthRequest): string {
  return req.userId!
}

// ── 获取球员所有体测记录 ──
physicalTestRouter.get('/players/:playerId/physical-tests', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const records = await db.physicalTest.findMany({
      where: { playerId: req.params.playerId as string, coachId: coachId(req) },
      orderBy: { measuredAt: 'desc' },
    })
    res.json({ success: true, data: records.map((r: any) => ({ ...r, measuredAt: Number(r.measuredAt) })) })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 录入运动表现体测 ──
physicalTestRouter.post('/players/:playerId/physical-tests', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const playerId = req.params.playerId as string
    const { sprint10m, sprint30m, verticalJump, firstTouch, weakFoot, shootingPower, workRate, agility, endurance, passingAccuracy, measuredAt, notes } = req.body

    const player = await db.player.findFirst({ where: { id: playerId, coachId: coachId(req) } })
    if (!player) return res.status(404).json({ success: false, error: '球员不存在' })

    const now = Date.now()
    const record = await db.physicalTest.create({
      data: {
        playerId,
        coachId: coachId(req),
        sprint10m: sprint10m != null ? parseFloat(sprint10m) : null,
        sprint30m: sprint30m != null ? parseFloat(sprint30m) : null,
        verticalJump: verticalJump != null ? parseFloat(verticalJump) : null,
        firstTouch: firstTouch != null ? parseInt(String(firstTouch)) : null,
        weakFoot: weakFoot != null ? parseInt(String(weakFoot)) : null,
        shootingPower: shootingPower != null ? parseInt(String(shootingPower)) : null,
        workRate: workRate != null ? parseInt(String(workRate)) : null,
        agility: agility != null ? parseFloat(agility) : null,
        endurance: endurance != null ? parseFloat(endurance) : null,
        passingAccuracy: passingAccuracy != null ? parseInt(String(passingAccuracy)) : null,
        measuredAt: measuredAt ? Number(measuredAt) : now,
        notes: notes || null,
      },
    })

    res.json({ success: true, data: { ...record, measuredAt: Number(record.measuredAt) } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 删除体测记录 ──
physicalTestRouter.delete('/physical-tests/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const record = await db.physicalTest.findFirst({
      where: { id: req.params.id as string, coachId: coachId(req) },
    })
    if (!record) return res.status(404).json({ success: false, error: '记录不存在' })
    await db.physicalTest.delete({ where: { id: req.params.id as string } })
    res.json({ success: true, message: '已删除' })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ── 体测过期提醒（Bio-Leap 兼容）──
physicalTestRouter.get('/physical-tests/alerts', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  try {
    const cid = coachId(req)
    const cutoff = Date.now() - config.physicalTestMaxAgeDays * 24 * 3600 * 1000
    const players = await db.player.findMany({
      where: { coachId: cid, isActive: true },
      include: { physicalTests: { orderBy: { measuredAt: 'desc' }, take: 1 } },
    })
    const overdue = (players as any[])
      .filter(p => !p.physicalTests?.length || Number(p.physicalTests[0].measuredAt) < cutoff)
      .map(p => ({
        playerId: p.id, playerName: p.name,
        lastMeasuredAt: p.physicalTests[0] ? Number(p.physicalTests[0].measuredAt) : null,
        daysSince: p.physicalTests[0] ? Math.floor((Date.now() - Number(p.physicalTests[0].measuredAt)) / (24 * 3600 * 1000)) : 999,
      }))
    res.json({ success: true, data: overdue })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})
