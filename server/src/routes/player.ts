import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'

const db = new PrismaClient()
export const playerRouter = Router()
export const publicRouter = Router()

// ===== 公开端点 =====
publicRouter.get('/public/players/:phone', async (req, res) => {
  const phone = req.params.phone as string
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })
  const players = await db.player.findMany({
    where: { coachId: coach.id, isActive: true },
    include: { pet: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json({
    success: true,
    data: players.map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, currentPoints: p.currentPoints,
      pet: p.pet ? { stage: p.pet.stage, level: p.pet.level, speciesId: p.pet.speciesId, hunger: p.pet.hunger, mood: p.pet.mood } : null,
    })),
  })
})

publicRouter.get('/public/leaderboard/:phone', async (req, res) => {
  const phone = req.params.phone as string
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })

  const players = await db.player.findMany({
    where: { coachId: coach.id, isActive: true },
    orderBy: { currentPoints: 'desc' },
    select: { id: true, name: true, avatar: true, currentPoints: true },
  })

  const data = players.map((p, index) => ({
    playerId: p.id,
    playerName: p.name,
    playerAvatar: p.avatar,
    currentPoints: p.currentPoints,
    rank: index + 1,
  }))

  res.json({ success: true, data })
})

publicRouter.get('/public/activities/:phone', async (req, res) => {
  const phone = req.params.phone as string
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })

  const records = await db.scoreRecord.findMany({
    where: { coachId: coach.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { player: { select: { name: true, avatar: true } } },
  })

  const data = records.map((r) => {
    let type: string = 'score'
    let description = r.reason || '积分变动'
    if (r.reason?.includes('喂食')) { type = 'feed'; description = '喂食宠物' }
    else if (r.reason?.includes('训练') || r.reason?.includes('玩耍')) { type = 'play'; description = '训练宠物' }
    else if (r.reason?.includes('购买') || r.reason?.includes('进化')) { type = 'evolution'; description = r.reason }
    else if (r.reason?.includes('商店') || r.reason?.includes('购买')) { type = 'purchase'; description = r.reason }

    return {
      id: r.id,
      type,
      playerId: r.playerId,
      playerName: r.player?.name || '未知学员',
      playerAvatar: r.player?.avatar || '😊',
      description,
      points: r.points,
      createdAt: Number(r.createdAt),
    }
  })

  res.json({ success: true, data })
})

// ===== 宠物 =====
playerRouter.get('/:playerId/pet', async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const hours = (Date.now() - Number(pet.lastDecayAt)) / 3600000
  if (hours > 0) {
    pet.hunger = Math.max(0, pet.hunger - Math.floor(hours * 1.2))
    pet.mood = Math.max(0, pet.mood - Math.floor(hours * 0.8))
    pet.lastDecayAt = BigInt(Date.now())
    await db.pet.update({
      where: { playerId },
      data: { hunger: pet.hunger, mood: pet.mood, lastDecayAt: pet.lastDecayAt },
    })
  }

  const speciesDef = await db.petSpeciesDef.findUnique({ where: { id: pet.speciesId } })

  res.json({
    success: true,
    data: {
      ...pet,
      lastDecayAt: Number(pet.lastDecayAt), lastFedAt: Number(pet.lastFedAt),
      lastPlayedAt: Number(pet.lastPlayedAt), createdAt: Number(pet.createdAt),
      evolvedAt: Number(pet.evolvedAt),
      species: speciesDef ? { ...speciesDef, stages: JSON.parse(JSON.stringify(speciesDef.stages)) } : null,
    },
  })
})

// ===== 模式 =====
playerRouter.get('/:playerId/mode', async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { coach: { select: { playerMode: true } } },
  })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  res.json({ success: true, data: { playerMode: player.coach.playerMode } })
})

// ===== 喂食 =====
playerRouter.post('/:playerId/pet/feed', async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { coach: { select: { playerMode: true } } },
  })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const FEEDING_COST = 5, FEEDING_CARE_POINTS = 3, HUNGER_GAIN = 25
  if (player.currentPoints < FEEDING_COST) {
    return res.status(400).json({ success: false, error: `积分不足，需要 ${FEEDING_COST} 分` })
  }

  const now = Date.now()
  pet.hunger = Math.min(100, pet.hunger + HUNGER_GAIN)
  pet.carePoints += FEEDING_CARE_POINTS
  pet.lastFedAt = BigInt(now)

  const oldStage = pet.stage
  const newStage = getStageByCarePoints(pet.carePoints)
  if (newStage !== oldStage) { pet.stage = newStage; pet.evolvedAt = BigInt(now) }

  await db.pet.update({
    where: { playerId },
    data: { hunger: pet.hunger, carePoints: pet.carePoints, stage: pet.stage, lastFedAt: pet.lastFedAt, evolvedAt: pet.evolvedAt },
  })
  await db.player.update({ where: { id: playerId }, data: { currentPoints: { decrement: FEEDING_COST }, updatedAt: now } })
  await db.scoreRecord.create({
    data: {
      coachId: player.coachId, playerId, ruleId: null, indicatorId: null,
      points: -FEEDING_COST, type: 'spend', reason: '喂食宠物',
      operatorType: 'system', operatorId: 'system', createdAt: now,
    },
  })

  const updatedPlayer = await db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })
  res.json({
    success: true,
    data: { hunger: pet.hunger, carePoints: pet.carePoints, stage: pet.stage, currentPoints: updatedPlayer!.currentPoints, evolved: newStage !== oldStage },
  })
})

// ===== 玩耍 =====
playerRouter.post('/:playerId/pet/play', async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { coach: { select: { playerMode: true } } },
  })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const PLAY_COST = 5, PLAY_CARE_POINTS = 3, MOOD_GAIN = 20
  if (player.currentPoints < PLAY_COST) {
    return res.status(400).json({ success: false, error: `积分不足，需要 ${PLAY_COST} 分` })
  }

  const now = Date.now()
  pet.mood = Math.min(100, pet.mood + MOOD_GAIN)
  pet.carePoints += PLAY_CARE_POINTS
  pet.lastPlayedAt = BigInt(now)

  const oldStage = pet.stage
  const newStage = getStageByCarePoints(pet.carePoints)
  if (newStage !== oldStage) { pet.stage = newStage; pet.evolvedAt = BigInt(now) }

  await db.pet.update({
    where: { playerId },
    data: { mood: pet.mood, carePoints: pet.carePoints, stage: pet.stage, lastPlayedAt: pet.lastPlayedAt, evolvedAt: pet.evolvedAt },
  })
  await db.player.update({ where: { id: playerId }, data: { currentPoints: { decrement: PLAY_COST }, updatedAt: now } })
  await db.scoreRecord.create({
    data: {
      coachId: player.coachId, playerId, ruleId: null, indicatorId: null,
      points: -PLAY_COST, type: 'spend', reason: '玩耍宠物',
      operatorType: 'system', operatorId: 'system', createdAt: now,
    },
  })

  const updatedPlayer = await db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })
  res.json({
    success: true,
    data: { mood: pet.mood, carePoints: pet.carePoints, stage: pet.stage, currentPoints: updatedPlayer!.currentPoints, evolved: newStage !== oldStage },
  })
})

// ===== 商店 =====
playerRouter.get('/:playerId/shop', async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  const items = await db.shopItem.findMany({
    where: { OR: [{ coachId: player.coachId }, { coachId: null }], isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  const inventory = await db.playerInventory.findMany({ where: { playerId } })
  res.json({
    success: true,
    data: { items: items.map(i => ({ ...i, effect: JSON.parse(JSON.stringify(i.effect)) })), inventory, currentPoints: player.currentPoints },
  })
})

playerRouter.post('/:playerId/shop/buy', async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const { itemId } = req.body
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { coach: { select: { playerMode: true } } },
  })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const item = await db.shopItem.findFirst({ where: { id: itemId, OR: [{ coachId: player.coachId }, { coachId: null }] } })
  if (!item) return res.status(404).json({ success: false, error: '物品不存在' })
  if (player.currentPoints < item.price) return res.status(400).json({ success: false, error: '积分不足' })

  const now = Date.now()
  const existingInv = await db.playerInventory.findFirst({ where: { playerId, itemId } })
  if (existingInv) {
    await db.playerInventory.update({ where: { id: existingInv.id }, data: { quantity: { increment: 1 } } })
  } else {
    await db.playerInventory.create({ data: { playerId, itemId, quantity: 1, acquiredAt: now } })
  }

  await db.player.update({ where: { id: playerId }, data: { currentPoints: { decrement: item.price }, updatedAt: now } })
  await db.scoreRecord.create({
    data: {
      coachId: player.coachId, playerId, ruleId: null, indicatorId: null,
      points: -item.price, type: 'spend', reason: `购买 ${item.name}`,
      operatorType: 'system', operatorId: 'system', createdAt: now,
    },
  })

  const updatedPlayer = await db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })
  res.json({ success: true, data: { currentPoints: updatedPlayer!.currentPoints } })
})

playerRouter.put('/:playerId/shop/equip', async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const { inventoryId } = req.body
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { coach: { select: { playerMode: true } } },
  })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const inv = await db.playerInventory.findFirst({ where: { id: inventoryId, playerId } })
  if (!inv) return res.status(404).json({ success: false, error: '背包物品不存在' })

  if (inv.isEquipped) {
    await db.playerInventory.update({ where: { id: inventoryId }, data: { isEquipped: false } })
  } else {
    await db.playerInventory.update({ where: { id: inventoryId }, data: { isEquipped: true } })
  }

  const equipped = await db.playerInventory.findMany({ where: { playerId, isEquipped: true } })
  const decorationIds: string[] = []
  for (const e of equipped) {
    const it = await db.shopItem.findUnique({ where: { id: e.itemId } })
    const eff = it?.effect as any
    if (eff?.decoration) decorationIds.push(eff.decoration)
  }
  await db.pet.update({ where: { playerId }, data: { equippedDecorations: decorationIds } })
  res.json({ success: true, data: { equippedDecorations: decorationIds } })
})

playerRouter.post('/:playerId/shop/use', async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const { inventoryId } = req.body
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { coach: { select: { playerMode: true } } },
  })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const inv = await db.playerInventory.findFirst({ where: { id: inventoryId, playerId } })
  if (!inv) return res.status(404).json({ success: false, error: '背包物品不存在' })
  const item = await db.shopItem.findUnique({ where: { id: inv.itemId } })
  if (!item || item.type !== 'food') return res.status(400).json({ success: false, error: '只能使用食物类物品' })

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const effect = item.effect as any
  const now = Date.now()
  if (effect?.hunger) pet.hunger = Math.min(100, pet.hunger + effect.hunger)
  if (effect?.mood) pet.mood = Math.min(100, pet.mood + effect.mood)
  if (effect?.experience) pet.carePoints += effect.experience

  const newStage = getStageByCarePoints(pet.carePoints)
  if (newStage !== pet.stage) { pet.stage = newStage; pet.evolvedAt = BigInt(now) }

  await db.pet.update({
    where: { playerId },
    data: { hunger: pet.hunger, mood: pet.mood, carePoints: pet.carePoints, stage: pet.stage, evolvedAt: pet.evolvedAt },
  })

  if (inv.quantity <= 1) {
    await db.playerInventory.delete({ where: { id: inventoryId } })
  } else {
    await db.playerInventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } })
  }

  res.json({ success: true, data: { hunger: pet.hunger, mood: pet.mood, carePoints: pet.carePoints, stage: pet.stage } })
})

// ===== 排行榜 =====
playerRouter.get('/:playerId/leaderboard', async (req: AuthRequest, res: Response) => {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  const players = await db.player.findMany({
    where: { coachId: player.coachId },
    orderBy: { currentPoints: 'desc' },
    select: { id: true, name: true, avatar: true, currentPoints: true },
  })
  res.json({ success: true, data: players })
})

// ===== 辅助 =====
function getStageByCarePoints(carePoints: number): string {
  if (carePoints >= 300) return 'rare'
  if (carePoints >= 150) return 'adult'
  if (carePoints >= 60) return 'teen'
  if (carePoints >= 20) return 'baby'
  return 'egg'
}
