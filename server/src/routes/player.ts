import { Router, Response, Request } from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import path from 'path'
import { AuthRequest } from '../middleware/auth'
import { tryLuckyDrop } from '../services/luckyDrop.js'
import { getStageByCarePoints, STAGE_TO_LEVEL, syncLevelWithStage } from '../services/pet.js'

const db = new PrismaClient()
export const playerRouter = Router()
export const publicRouter = Router()

// ── 头像上传配置 ──
const avatarStorage = multer.diskStorage({
  destination: process.env.UPLOAD_DIR || './public/avatars',
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

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

  const speciesIds = [...new Set(players.map(p => p.pet?.speciesId).filter(Boolean) as string[])]
  const speciesDefs = speciesIds.length > 0
    ? await db.petSpeciesDef.findMany({ where: { id: { in: speciesIds } } })
    : []
  const speciesMap = new Map(speciesDefs.map(s => [s.id, s]))

  const allDecorationIds = [...new Set(
    players.flatMap(p => p.pet?.equippedDecorations || [])
  )]
  const accessoryDefs = allDecorationIds.length > 0
    ? await db.accessoryDef.findMany({ where: { id: { in: allDecorationIds } } })
    : []
  const accessoryMap = new Map(accessoryDefs.map(a => [a.id, a]))

  // 批量查询背景信息（优先 PetBackgroundDef，兜底 ShopItem）
  const skinIds = [...new Set(players.map(p => p.pet?.currentSkin).filter(Boolean) as string[])]
  const bgDefs = skinIds.length > 0
    ? await db.petBackgroundDef.findMany({ where: { id: { in: skinIds } } })
    : []
  const bgDefMap = new Map(bgDefs.map(b => [b.id, b]))

  const bgItems = await db.shopItem.findMany({ where: { type: 'background' } })
  const bgItemMap = new Map<string, any>()
  for (const it of bgItems) {
    const eff = typeof it.effect === 'string' ? JSON.parse(it.effect) : it.effect
    const bid = eff?.equip?.backgroundId
    if (bid) bgItemMap.set(bid, it)
    // 更宽松兜底：也按 ShopItem.id 索引
    if (it.id) bgItemMap.set(it.id, it)
  }

  function resolveBackground(currentSkin: string) {
    if (!currentSkin || currentSkin === 'default') return null
    const def = bgDefMap.get(currentSkin)
    const item = bgItemMap.get(currentSkin)
    return {
      cssGradient: def?.cssGradient || item?.imageClass || undefined,
      imageUrl: def?.imageUrl || item?.imageUrl || undefined,
    }
  }

  res.json({
    success: true,
    data: players.map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, currentPoints: p.currentPoints,
      pet: p.pet
        ? {
            stage: p.pet.stage,
            level: p.pet.level,
            speciesId: p.pet.speciesId,
            hunger: p.pet.hunger,
            mood: p.pet.mood,
            species: speciesMap.has(p.pet.speciesId)
              ? { stages: JSON.parse(JSON.stringify(speciesMap.get(p.pet.speciesId)!.stages)) }
              : undefined,
            accessories: (p.pet.equippedDecorations || [])
              .map(id => {
                const def = accessoryMap.get(id)
                return def ? { id: def.id, name: def.name, emoji: def.emoji, imageUrl: def.imageUrl || '', position: def.position } : null
              })
              .filter(Boolean),
            background: resolveBackground(p.pet.currentSkin),
          }
        : null,
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

  const [scoreRecords, transactionRecords] = await Promise.all([
    db.scoreRecord.findMany({
      where: { coachId: coach.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { player: { select: { name: true, avatar: true } } },
    }),
    db.transactionRecord.findMany({
      where: { player: { coachId: coach.id } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  // 获取消费记录对应的学员信息
  const txPlayerIds = [...new Set(transactionRecords.map(t => t.playerId))]
  const txPlayers = txPlayerIds.length > 0
    ? await db.player.findMany({ where: { id: { in: txPlayerIds } }, select: { id: true, name: true, avatar: true } })
    : []
  const playerMap = new Map(txPlayers.map(p => [p.id, p]))

  const scoreData = scoreRecords.map((r) => ({
    id: r.id,
    type: r.type === 'bonus' ? 'bonus' : r.type === 'penalty' ? 'penalty' : 'score',
    playerId: r.playerId,
    playerName: r.player?.name || '未知学员',
    playerAvatar: r.player?.avatar || '😊',
    description: r.reason || '积分变动',
    points: r.points,
    createdAt: Number(r.createdAt),
  }))

  const txData = transactionRecords.map((t) => ({
    id: t.id,
    type: t.type,
    playerId: t.playerId,
    playerName: playerMap.get(t.playerId)?.name || '未知学员',
    playerAvatar: playerMap.get(t.playerId)?.avatar || '😊',
    description: t.reason,
    points: t.amount,
    createdAt: Number(t.createdAt),
  }))

  const merged = [...scoreData, ...txData]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 30)

  res.json({ success: true, data: merged })
})

publicRouter.get('/public/mode/:phone', async (req, res) => {
  const phone = req.params.phone as string
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })
  res.json({ success: true, data: { playerMode: coach.playerMode } })
})

publicRouter.get('/public/coach/:phone', async (req, res) => {
  const phone = req.params.phone as string
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })
  res.json({
    success: true,
    data: {
      phone: coach.phone,
      name: coach.name,
      teamName: coach.teamName,
      teamLogo: coach.teamLogo,
    },
  })
})

publicRouter.get('/public/dimensions/:phone', async (_req, res) => {
  // Bio-Leap 固定6维度
  res.json({
    success: true,
    data: [
      { id: 'spatialIq', name: '空间觉察', icon: '🧠', sortOrder: 1, indicators: [] },
      { id: 'techExec', name: '技术执行', icon: '⚽', sortOrder: 2, indicators: [] },
      { id: 'engagement', name: '执行饱和度', icon: '💪', sortOrder: 3, indicators: [] },
      { id: 'resilience', name: '挫折复原力', icon: '🛡️', sortOrder: 4, indicators: [] },
      { id: 'altruism', name: '无私协作性', icon: '🤝', sortOrder: 5, indicators: [] },
      { id: 'envNoise', name: '环境抗噪度', icon: '🏠', sortOrder: 6, indicators: [] },
    ],
  })
})

publicRouter.get('/public/player-stats/:phone/:playerId', async (req, res) => {
  const phone = req.params.phone as string
  const playerId = req.params.playerId as string

  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })

  const player = await db.player.findFirst({ where: { id: playerId, coachId: coach.id } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  // ── 优先使用 Bio-Leap PipelineSnapshot ──
  const pipelineSnapshot = await db.pipelineSnapshot.findFirst({
    where: { playerId },
    orderBy: { computedAt: 'desc' },
  })

  // 通用聚合数据
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0)
  const [todayScores, weekScores] = await Promise.all([
    db.scoreRecord.aggregate({ where: { playerId, type: { in: ['earn', 'penalty'] }, createdAt: { gte: todayStart.getTime() } }, _sum: { points: true } }),
    db.scoreRecord.aggregate({ where: { playerId, type: { in: ['earn', 'penalty'] }, createdAt: { gte: weekStart.getTime() } }, _sum: { points: true } }),
  ])
  const allPlayers = await db.player.findMany({
    where: { coachId: coach.id }, select: { id: true, currentPoints: true },
    orderBy: { currentPoints: 'desc' },
  })
  const rank = allPlayers.findIndex(p => p.id === playerId) + 1

  if (pipelineSnapshot) {
    // Bio-Leap 模式：返回6维度 + PI + 成熟度
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
        dimensionKey: meta.key,
        dimensionName: meta.name,
        icon: meta.icon,
        score: dim.final ?? dim.maturityCorrected ?? 50,
        maxScore: 99,
        details: {
          raw: dim.raw ?? 0,
          ema: dim.ema ?? 0,
          expectedScore: dim.expectedScore ?? 0,
          correctionFactor: dim.correctionFactor ?? 1.0,
          final: dim.final ?? 50,
        },
      }
    })

    // 计算年龄
    let age: number | null = null
    if (player.birthDate) {
      const birth = new Date(player.birthDate)
      age = Math.round(((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000)) * 10) / 10
    } else if (player.age != null) {
      age = player.age
    }

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
        todayPoints: todayScores._sum?.points || 0,
        weeklyPoints: weekScores._sum?.points || 0,
        rank,
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
    missingReason = '暂无评估记录和身体测量数据，等待教练录入'
  } else if (!hasAssessments) {
    missingReason = '暂无评估记录，等待教练完成每日评估'
  } else if (!hasBiometric) {
    missingReason = '缺少身体测量数据，能力雷达将在教练录入身高/体重/坐高后生成'
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

// ===== 宠物 =====
async function handleGetPet(req: Request, res: Response) {
  const playerId = req.params.playerId as string
  const pet = await db.pet.findUnique({ where: { playerId } })

  // 没有宠物时返回 null，前端引导用户选择宠物
  if (!pet) {
    const player = await db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })
    return res.json({ success: true, data: null, currentPoints: player?.currentPoints || 0 })
  }

  const hours = (Date.now() - Number(pet.lastDecayAt)) / 3600000
  if (hours > 0) {
    pet.hunger = Math.max(0, pet.hunger - Math.floor(hours * 1))
    pet.mood = Math.max(0, pet.mood - Math.floor(hours * 0.5))
    pet.lastDecayAt = BigInt(Date.now())
    await db.pet.update({
      where: { playerId },
      data: { hunger: pet.hunger, mood: pet.mood, lastDecayAt: pet.lastDecayAt },
    })
  }

  // === rent 类型道具过期结算 ===
  const now = Date.now()
  const expiredItems = await db.playerInventory.findMany({
    where: { playerId, isEquipped: true, expiresAt: { lt: now } },
  })
  if (expiredItems.length > 0) {
    // 1. 删除过期记录
    for (const inv of expiredItems) {
      await db.playerInventory.delete({ where: { id: inv.id } })
    }

    // 2. 重新收集已装备物品
    const remainingEquipped = await db.playerInventory.findMany({
      where: { playerId, isEquipped: true },
    })
    const decorationIds: string[] = []
    let currentSkin = 'default'

    for (const e of remainingEquipped) {
      const it = await db.shopItem.findUnique({ where: { id: e.itemId } })
      const eff = it?.effect as any
      if (it?.type === 'accessory' && eff?.equip?.decoration) {
        decorationIds.push(eff.equip.decoration)
      }
      if (it?.type === 'background') {
        currentSkin = eff?.equip?.backgroundId || e.itemId
      }
    }

    // 3. 更新 pet
    pet.mood = Math.max(0, pet.mood - 8 * expiredItems.length)
    pet.equippedDecorations = decorationIds
    pet.currentSkin = currentSkin

    await db.pet.update({
      where: { playerId },
      data: {
        equippedDecorations: decorationIds,
        currentSkin,
        mood: pet.mood,
      },
    })
  }

  const speciesDef = await db.petSpeciesDef.findUnique({ where: { id: pet.speciesId } })

  // 查询宠物背景（优先 PetBackgroundDef，兜底 ShopItem）
  let backgroundDef: { cssGradient?: string; imageUrl?: string } | null = null
  if (pet.currentSkin && pet.currentSkin !== 'default') {
    const bgDef = await db.petBackgroundDef.findUnique({ where: { id: pet.currentSkin } })
    if (bgDef) {
      backgroundDef = { cssGradient: bgDef.cssGradient, imageUrl: bgDef.imageUrl || undefined }
    }
    // 兜底：PetBackgroundDef 没有图片时，从 ShopItem 中找
    if (!backgroundDef?.imageUrl) {
      const bgItems = await db.shopItem.findMany({ where: { type: 'background' } })
      let bgItem = bgItems.find((it: any) => {
        const eff = typeof it.effect === 'string' ? JSON.parse(it.effect) : it.effect
        return eff?.equip?.backgroundId === pet.currentSkin
      })
      // 更宽松兜底：直接按 ShopItem.id 匹配
      if (!bgItem) {
        bgItem = bgItems.find((it: any) => it.id === pet.currentSkin)
      }
      if (bgItem) {
        backgroundDef = {
          cssGradient: backgroundDef?.cssGradient || bgItem.imageClass || undefined,
          imageUrl: bgItem.imageUrl || backgroundDef?.imageUrl || undefined,
        }
      }
    }
  }

  const player = await db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })

  const petStatus: string[] = []
  if (pet.hunger < 20) petStatus.push('weak')
  if (pet.mood < 20) petStatus.push('sad')

  // 查询已装备配饰的完整信息
  const accessoryDefs = pet.equippedDecorations?.length
    ? await db.accessoryDef.findMany({ where: { id: { in: pet.equippedDecorations } } })
    : []
  const accessories = accessoryDefs.map(a => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    imageUrl: a.imageUrl || '',
    position: a.position as any,
  }))

  res.json({
    success: true,
    data: {
      ...pet,
      lastDecayAt: Number(pet.lastDecayAt), lastFedAt: Number(pet.lastFedAt),
      lastPlayedAt: Number(pet.lastPlayedAt), createdAt: Number(pet.createdAt),
      evolvedAt: Number(pet.evolvedAt),
      currentPoints: player?.currentPoints || 0,
      species: speciesDef ? { ...speciesDef, stages: JSON.parse(JSON.stringify(speciesDef.stages)) } : null,
      status: petStatus,
      background: backgroundDef ? {
        cssGradient: backgroundDef.cssGradient,
        imageUrl: backgroundDef.imageUrl,
      } : null,
      accessories,
    },
  })
}
playerRouter.get('/:playerId/pet', handleGetPet)

// ===== 模式 =====
async function handleGetMode(req: Request, res: Response) {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { coach: { select: { playerMode: true } } },
  })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  res.json({ success: true, data: { playerMode: player.coach.playerMode } })
}
playerRouter.get('/:playerId/mode', handleGetMode)

// ===== 喂食 =====
async function handleFeed(req: Request, res: Response) {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { coach: { select: { playerMode: true } } },
  })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  if (pet.hunger >= 90) {
    return res.status(400).json({ success: false, error: '宠物已经吃饱啦 🐾，等它饿了再喂吧~' })
  }

  const FEEDING_COST = 5, FEEDING_CARE_POINTS = 3, HUNGER_GAIN = 25, MOOD_GAIN_FEED = 1
  if (player.currentPoints < FEEDING_COST) {
    return res.status(400).json({ success: false, error: `积分不足，需要 ${FEEDING_COST} 分` })
  }

  const now = Date.now()
  const oldStage = pet.stage
  let newStage = getStageByCarePoints(Math.min(1000, pet.carePoints + FEEDING_CARE_POINTS))
  let evolutionBlocked = false
  const newHunger = Math.min(100, pet.hunger + HUNGER_GAIN)
  const newMood = Math.min(100, pet.mood + MOOD_GAIN_FEED)
  const newCarePoints = Math.min(1000, pet.carePoints + FEEDING_CARE_POINTS)
  let newLevel = pet.level

  if (newStage !== oldStage) {
    if (newHunger >= 50 && newMood >= 50) {
      pet.stage = newStage
      pet.evolvedAt = BigInt(now)
      syncLevelWithStage(pet, newStage)
      newLevel = pet.level
    } else {
      evolutionBlocked = true
      newStage = oldStage
    }
  }

  const expectedBalance = player.currentPoints - FEEDING_COST
  try {
    await db.$transaction([
      db.pet.update({
        where: { playerId },
        data: {
          hunger: newHunger, mood: newMood, carePoints: newCarePoints,
          stage: pet.stage, level: newLevel,
          lastFedAt: BigInt(now), evolvedAt: pet.evolvedAt,
        },
      }),
      db.player.update({
        where: { id: playerId },
        data: { currentPoints: { decrement: FEEDING_COST }, updatedAt: now },
      }),
      db.transactionRecord.create({
        data: {
          playerId, amount: -FEEDING_COST, type: 'feed', reason: '喂食宠物',
          balance: expectedBalance, createdAt: now,
        },
      }),
    ])
  } catch (e) {
    return res.status(500).json({ success: false, error: '操作失败，请重试' })
  }

  const [updatedPlayer, speciesDef] = await Promise.all([
    db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } }),
    db.petSpeciesDef.findUnique({ where: { id: pet.speciesId } }),
  ])
  res.json({
    success: true,
    data: {
      hunger: newHunger, mood: newMood, carePoints: newCarePoints,
      stage: pet.stage, level: newLevel,
      currentPoints: updatedPlayer!.currentPoints,
      evolved: newStage !== oldStage && !evolutionBlocked,
      evolutionBlocked,
      species: serializeSpecies(speciesDef),
    },
  })
}
playerRouter.post('/:playerId/pet/feed', handleFeed)

// ===== 玩耍 =====
async function handlePlay(req: Request, res: Response) {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { coach: { select: { playerMode: true } } },
  })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const PLAY_COST = 5, PLAY_CARE_POINTS_BASE = 5, MOOD_GAIN_PLAY = 3
  if (player.currentPoints < PLAY_COST) {
    return res.status(400).json({ success: false, error: `积分不足，需要 ${PLAY_COST} 分` })
  }

  // 宠物状态惩罚：太虚弱无法训练
  if (pet.hunger < 20) {
    return res.status(400).json({ success: false, error: '宠物太虚弱了，先喂点吃的吧！' })
  }

  const now = Date.now()
  // 宠物状态惩罚：不开心时训练效果减半
  const PLAY_CARE_POINTS = pet.mood < 20 ? Math.floor(PLAY_CARE_POINTS_BASE / 2) : PLAY_CARE_POINTS_BASE

  const oldStage = pet.stage
  let newStage = getStageByCarePoints(Math.min(1000, pet.carePoints + PLAY_CARE_POINTS))
  let evolutionBlocked = false
  const newMood = Math.min(100, pet.mood + MOOD_GAIN_PLAY)
  const newCarePoints = Math.min(1000, pet.carePoints + PLAY_CARE_POINTS)
  let newLevel = pet.level

  if (newStage !== oldStage) {
    if (pet.hunger >= 50 && newMood >= 50) {
      pet.stage = newStage
      pet.evolvedAt = BigInt(now)
      syncLevelWithStage(pet, newStage)
      newLevel = pet.level
    } else {
      evolutionBlocked = true
      newStage = oldStage
    }
  }

  const expectedBalance = player.currentPoints - PLAY_COST
  try {
    await db.$transaction([
      db.pet.update({
        where: { playerId },
        data: {
          mood: newMood, carePoints: newCarePoints,
          stage: pet.stage, level: newLevel,
          lastPlayedAt: BigInt(now), evolvedAt: pet.evolvedAt,
        },
      }),
      db.player.update({
        where: { id: playerId },
        data: { currentPoints: { decrement: PLAY_COST }, updatedAt: now },
      }),
      db.transactionRecord.create({
        data: {
          playerId, amount: -PLAY_COST, type: 'play', reason: '玩耍宠物',
          balance: expectedBalance, createdAt: now,
        },
      }),
    ])
  } catch (e) {
    return res.status(500).json({ success: false, error: '操作失败，请重试' })
  }

  const [updatedPlayer, speciesDef] = await Promise.all([
    db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } }),
    db.petSpeciesDef.findUnique({ where: { id: pet.speciesId } }),
  ])
  res.json({
    success: true,
    data: {
      mood: newMood, carePoints: newCarePoints, stage: pet.stage, level: newLevel,
      currentPoints: updatedPlayer!.currentPoints,
      evolved: newStage !== oldStage && !evolutionBlocked,
      evolutionBlocked,
      species: serializeSpecies(speciesDef),
    },
  })
}
playerRouter.post('/:playerId/pet/play', handlePlay)

// ===== 商店 =====
async function handleGetShop(req: Request, res: Response) {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const items = await db.shopItem.findMany({
    where: { OR: [{ coachId: player.coachId }, { coachId: null }], isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  const activeItemIds = new Set(items.map(i => i.id))
  const itemTypeMap = new Map(items.map(i => [i.id, i.type]))

  const allInventory = await db.playerInventory.findMany({ where: { playerId } })
  const now = Date.now()
  const THREE_DAYS = 3 * 24 * 3600 * 1000

  const inventory = allInventory.filter(inv => {
    // 下架物品不显示
    if (!activeItemIds.has(inv.itemId)) return false

    // 已装备的物品总是显示
    if (inv.isEquipped) return true

    // 未装备的背景：如果卸下超过三天，不显示
    const itemType = itemTypeMap.get(inv.itemId)
    if (itemType === 'background') {
      if (inv.lastUnequippedAt && now - Number(inv.lastUnequippedAt) > THREE_DAYS) {
        return false
      }
    }

    return true
  })

  res.json({
    success: true,
    data: { items: items.map(i => ({ ...i, effect: JSON.parse(JSON.stringify(i.effect)) })), inventory, currentPoints: player.currentPoints },
  })
}
playerRouter.get('/:playerId/shop', handleGetShop)

async function handleBuy(req: Request, res: Response) {
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
  if (item.stock <= 0) return res.status(400).json({ success: false, error: '库存不足' })
  if (player.currentPoints < item.price) return res.status(400).json({ success: false, error: '积分不足' })

  const now = Date.now()

  const expectedBalance = player.currentPoints - item.price
  try {
    const updatedPlayer = await db.$transaction(async (tx) => {
      // 在事务内重新检查库存，防止并发超卖
      const itemInTx = await tx.shopItem.findUnique({ where: { id: itemId } })
      if (!itemInTx || itemInTx.stock <= 0) {
        throw new Error('OUT_OF_STOCK')
      }

      const itemUsageType = (item.usageType as string) || 'consume'
      const itemUsageCount = item.usageCount ?? null

      if (itemUsageType === 'rent') {
        // 租赁型（配饰/背景）：每次购买新建一条独立记录，不查找 existingInv
        await tx.playerInventory.create({
          data: { playerId, itemId, quantity: 1, acquiredAt: now, expiresAt: null },
        })
      } else if (itemUsageType === 'charge') {
        // 次数型（玩具）：累加 usageCount
        const existingInv = await tx.playerInventory.findFirst({ where: { playerId, itemId } })
        if (existingInv) {
          const addQty = itemUsageCount ?? 1
          await tx.playerInventory.update({
            where: { id: existingInv.id },
            data: { quantity: { increment: addQty } },
          })
        } else {
          await tx.playerInventory.create({
            data: { playerId, itemId, quantity: itemUsageCount ?? 1, acquiredAt: now },
          })
        }
      } else {
        // consume / equip / replace：保持原有逻辑
        const existingInv = await tx.playerInventory.findFirst({ where: { playerId, itemId } })
        if (existingInv) {
          await tx.playerInventory.update({ where: { id: existingInv.id }, data: { quantity: { increment: 1 } } })
        } else {
          await tx.playerInventory.create({ data: { playerId, itemId, quantity: 1, acquiredAt: now } })
        }
      }

      await tx.player.update({ where: { id: playerId }, data: { currentPoints: { decrement: item.price }, updatedAt: now } })
      await tx.shopItem.update({ where: { id: itemId }, data: { stock: { decrement: 1 } } })
      await tx.transactionRecord.create({
        data: {
          playerId, itemId, amount: -item.price, type: 'buy', reason: `购买 ${item.name}`,
          balance: expectedBalance, createdAt: now,
        },
      })

      return tx.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })
    })
    res.json({ success: true, data: { currentPoints: updatedPlayer!.currentPoints } })
  } catch (e: any) {
    if (e.message === 'OUT_OF_STOCK') {
      return res.status(400).json({ success: false, error: '库存不足' })
    }
    return res.status(500).json({ success: false, error: '购买失败，请重试' })
  }
}
playerRouter.post('/:playerId/shop/buy', handleBuy)

async function handleEquip(req: Request, res: Response) {
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
  if (!item) return res.status(404).json({ success: false, error: '商品不存在' })

  const rawUsageType = (item.usageType as string) || 'equip'
  const usageType = (item.type === 'accessory' || item.type === 'background') ? rawUsageType : rawUsageType
  const equipLikeTypes = ['equip', 'replace', 'rent']
  if (!equipLikeTypes.includes(usageType)) {
    return res.status(400).json({ success: false, error: '该物品不可装备' })
  }

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const wasEquipped = inv.isEquipped
  const now = Date.now()

  // rent 类型：首次装备开始计时，过期拒绝装备
  if (usageType === 'rent' && !wasEquipped) {
    if (inv.expiresAt !== null && inv.expiresAt !== undefined) {
      if (Number(inv.expiresAt) < now) {
        return res.status(400).json({ success: false, error: '该配饰已过期，请重新购买' })
      }
    } else {
      // 首次装备，设置过期时间
      const rentDays = item.usageCount ?? 7
      const newExpiresAt = now + rentDays * 24 * 3600 * 1000
      await db.playerInventory.update({
        where: { id: inventoryId },
        data: { expiresAt: newExpiresAt },
      })
    }
  }

  const isBackgroundItem = item.type === 'background' || (usageType === 'replace' && (item.effect as any)?.equip?.backgroundId)

  // 1. 处理当前物品的装备状态
  if (wasEquipped) {
    await db.playerInventory.update({ where: { id: inventoryId }, data: { isEquipped: false, lastUnequippedAt: now } })
    pet.mood = Math.max(0, pet.mood - 8)
  } else {
    await db.playerInventory.update({ where: { id: inventoryId }, data: { isEquipped: true } })
    pet.mood = Math.min(100, pet.mood + 15)
  }

  // 2. 如果是装备背景，自动卸下其他已装备的背景（背景只能同时装备一个）
  if (!wasEquipped && isBackgroundItem) {
    const otherBackgrounds = await db.playerInventory.findMany({
      where: { playerId, isEquipped: true, id: { not: inventoryId } },
    })
    for (const ob of otherBackgrounds) {
      const obItem = await db.shopItem.findUnique({ where: { id: ob.itemId } })
      const obIsBg = obItem?.type === 'background' || ((obItem?.usageType as string) === 'replace')
      if (obIsBg) {
        await db.playerInventory.update({ where: { id: ob.id }, data: { isEquipped: false, lastUnequippedAt: now } })
      }
    }
  }

  // 3. 重新收集已装备的物品
  const equipped = await db.playerInventory.findMany({ where: { playerId, isEquipped: true } })
  const decorationIds: string[] = []
  let currentSkin = pet.currentSkin

  for (const e of equipped) {
    const it = await db.shopItem.findUnique({ where: { id: e.itemId } })
    const eff = it?.effect as any
    const itUsageType = (it?.usageType as string) || 'equip'

    const isAccessory = it?.type === 'accessory' || (itUsageType === 'equip' && eff?.equip?.decoration)
    const isBackground = it?.type === 'background' || (itUsageType === 'replace' && eff?.equip?.backgroundId)

    if (isAccessory && eff?.equip?.decoration) {
      decorationIds.push(eff.equip.decoration)
    }
    if (isBackground) {
      // 优先使用 effect.equip.backgroundId，没有则用 ShopItem.id 兜底
      currentSkin = eff?.equip?.backgroundId || e.itemId
    }
  }

  // 4. 卸下背景时恢复默认背景
  if (wasEquipped && isBackgroundItem) {
    currentSkin = 'default'
  }

  await db.pet.update({
    where: { playerId },
    data: { equippedDecorations: decorationIds, currentSkin, mood: pet.mood },
  })

  const accessoryDefs = decorationIds.length > 0
    ? await db.accessoryDef.findMany({ where: { id: { in: decorationIds } } })
    : []
  const accessories = accessoryDefs.map(a => ({
    id: a.id,
    name: a.name,
    emoji: a.emoji,
    imageUrl: a.imageUrl || '',
    position: a.position as any,
  }))

  // 查询当前背景信息（优先 PetBackgroundDef，兜底 ShopItem）
  let background: { cssGradient?: string; imageUrl?: string } | null = null
  if (currentSkin && currentSkin !== 'default') {
    const bgDef = await db.petBackgroundDef.findUnique({ where: { id: currentSkin } })
    if (bgDef) {
      background = { cssGradient: bgDef.cssGradient, imageUrl: bgDef.imageUrl || undefined }
    }
    if (!background?.imageUrl) {
      const bgItems = await db.shopItem.findMany({ where: { type: 'background' } })
      let bgItem = bgItems.find((it: any) => {
        const eff = typeof it.effect === 'string' ? JSON.parse(it.effect) : it.effect
        return eff?.equip?.backgroundId === currentSkin
      })
      if (!bgItem) {
        bgItem = bgItems.find((it: any) => it.id === currentSkin)
      }
      if (bgItem) {
        background = {
          cssGradient: background?.cssGradient || bgItem.imageClass || undefined,
          imageUrl: bgItem.imageUrl || background?.imageUrl || undefined,
        }
      }
    }
  }

  res.json({
    success: true,
    data: {
      equippedDecorations: decorationIds,
      currentSkin,
      mood: pet.mood,
      moodChange: wasEquipped ? -8 : +15,
      accessories,
      background,
    },
  })
}
playerRouter.put('/:playerId/shop/equip', handleEquip)

async function handleUse(req: Request, res: Response) {
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
  if (!item) return res.status(404).json({ success: false, error: '商品不存在' })

  // 只能使用消耗类物品（food / toy / magic）或次数型玩具（charge）
  const usageType = (item.usageType as string) || 'consume'
  if (usageType !== 'consume' && usageType !== 'charge') {
    return res.status(400).json({ success: false, error: '该物品不可直接使用，请装备或更换' })
  }

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const effect = item.effect as any
  const consumeEff = effect?.consume || effect || {}
  const now = Date.now()

  if (consumeEff?.hunger) pet.hunger = Math.max(0, Math.min(100, pet.hunger + Number(consumeEff.hunger)))
  if (consumeEff?.mood) pet.mood = Math.max(0, Math.min(100, pet.mood + Number(consumeEff.mood)))
  if (consumeEff?.carePoints) pet.carePoints = Math.min(1000, pet.carePoints + Number(consumeEff.carePoints))

  // charge 类型（玩具）每次使用固定 +18 mood
  if (usageType === 'charge') {
    pet.mood = Math.min(100, pet.mood + 18)
    pet.lastPlayedAt = BigInt(now)
  }

  const oldStage = pet.stage
  const newStage = getStageByCarePoints(pet.carePoints)
  let evolved = false
  if (newStage !== oldStage) {
    if (pet.hunger >= 50 && pet.mood >= 50) {
      pet.stage = newStage
      pet.evolvedAt = BigInt(now)
      syncLevelWithStage(pet, newStage)
      evolved = true
    }
  }

  await db.$transaction(async (tx) => {
    await tx.pet.update({
      where: { playerId },
      data: { hunger: pet.hunger, mood: pet.mood, carePoints: pet.carePoints, stage: pet.stage, level: pet.level, evolvedAt: pet.evolvedAt },
    })

    // 处理消耗逻辑
    if (inv.quantity <= 1) {
      await tx.playerInventory.delete({ where: { id: inventoryId } })
    } else {
      await tx.playerInventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } })
    }
  })

  const speciesDef = await db.petSpeciesDef.findUnique({ where: { id: pet.speciesId } })
  res.json({
    success: true,
    data: {
      hunger: pet.hunger, mood: pet.mood, carePoints: pet.carePoints,
      stage: pet.stage, level: pet.level, evolved,
      moodChange: (consumeEff?.mood ?? 0) + (usageType === 'charge' ? 18 : 0),
      ...(usageType === 'charge' ? { destroyed: inv.quantity <= 1 } : {}),
      species: serializeSpecies(speciesDef),
    },
  })
}
playerRouter.post('/:playerId/shop/use', handleUse)

// ===== 头像 =====

// 玩家上传头像文件
publicRouter.post('/public/player/:playerId/avatar', avatarUpload.single('avatar'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: '未收到文件' })
  const url = `/avatars/${req.file.filename}`
  res.json({ success: true, data: { url } })
})

// 玩家更新头像（emoji 或 URL）— 每周限1次，消耗10积分
publicRouter.put('/public/player/:playerId/avatar', async (req: Request, res: Response) => {
  const playerId = req.params.playerId as string
  const { avatar } = req.body
  if (!avatar || typeof avatar !== 'string') return res.status(400).json({ success: false, error: '缺少头像值' })

  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const now = Date.now()
  const SEVEN_DAYS = 7 * 24 * 3600 * 1000
  const AVATAR_COST = 10

  // 检查冷却时间
  if (player.lastAvatarChangeAt) {
    const elapsed = now - Number(player.lastAvatarChangeAt)
    if (elapsed < SEVEN_DAYS) {
      const remainingDays = Math.ceil((SEVEN_DAYS - elapsed) / (24 * 3600 * 1000))
      return res.status(400).json({ success: false, error: `每7天只能更换一次头像，还剩 ${remainingDays} 天` })
    }
  }

  // 检查积分
  if (player.currentPoints < AVATAR_COST) {
    return res.status(400).json({ success: false, error: `积分不足，更换头像需要 ${AVATAR_COST} 积分` })
  }

  await db.player.update({
    where: { id: playerId },
    data: {
      avatar,
      currentPoints: { decrement: AVATAR_COST },
      lastAvatarChangeAt: now,
      updatedAt: now,
    },
  })

  res.json({ success: true, data: { avatar } })
})

// ===== 排行榜 =====
async function handleLeaderboard(req: Request, res: Response) {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  const players = await db.player.findMany({
    where: { coachId: player.coachId },
    orderBy: { currentPoints: 'desc' },
    select: { id: true, name: true, avatar: true, currentPoints: true },
  })
  res.json({ success: true, data: players })
}
playerRouter.get('/:playerId/leaderboard', handleLeaderboard)

// ===== 公开队员端点 =====
publicRouter.get('/public/player/:playerId/pet', handleGetPet)
publicRouter.get('/public/player/:playerId/mode', handleGetMode)
publicRouter.post('/public/player/:playerId/pet/feed', handleFeed)
publicRouter.post('/public/player/:playerId/pet/play', handlePlay)
publicRouter.get('/public/player/:playerId/shop', handleGetShop)
publicRouter.post('/public/player/:playerId/shop/buy', handleBuy)
publicRouter.put('/public/player/:playerId/shop/equip', handleEquip)
publicRouter.post('/public/player/:playerId/shop/use', handleUse)
publicRouter.get('/public/player/:playerId/records', async (req, res) => {
  const playerId = req.params.playerId as string
  const [scoreRecords, transactions] = await Promise.all([
    db.scoreRecord.findMany({
      where: { playerId, type: { in: ['earn', 'penalty', 'bonus'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.transactionRecord.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  // 合并并统一格式
  const merged = [
    ...scoreRecords.map(r => ({
      id: r.id,
      reason: r.reason,
      points: r.points,
      type: r.type,
      createdAt: Number(r.createdAt),
    })),
    ...transactions.map(t => ({
      id: t.id,
      reason: t.reason,
      points: t.amount, // amount 为负数表示支出
      type: 'spend',
      createdAt: Number(t.createdAt),
    })),
  ]

  // 按时间倒序排序，取前50条
  merged.sort((a, b) => b.createdAt - a.createdAt)
  const data = merged.slice(0, 50)

  res.json({ success: true, data })
})

publicRouter.get('/public/player/:playerId/leaderboard', handleLeaderboard)

// ===== 宠物物种 =====
publicRouter.get('/public/pet-species', async (_req, res) => {
  const species = await db.petSpeciesDef.findMany({ orderBy: { name: 'asc' } })
  res.json({
    success: true,
    data: species.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      emoji: s.emoji,
      backgroundColor: s.backgroundColor,
      accentColor: s.accentColor,
      stages: JSON.parse(JSON.stringify(s.stages)),
    })),
  })
})

// ===== 每日签到 =====
publicRouter.post('/public/player/:playerId/checkin', async (req, res) => {
  const playerId = req.params.playerId as string
  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // 检查今日是否已签到
  const existing = await db.scoreRecord.findFirst({
    where: {
      playerId,
      type: 'bonus',
      reason: '每日签到',
      createdAt: { gte: todayStart.getTime() },
    },
  })
  if (existing) {
    return res.status(400).json({ success: false, error: '今日已签到' })
  }

  const now = Date.now()
  const CHECKIN_POINTS = 8

  try {
    const updatedPlayer = await db.$transaction(async (tx) => {
      // 在事务内重新检查，防止并发重复签到
      const existing = await tx.scoreRecord.findFirst({
        where: {
          playerId,
          type: 'bonus',
          reason: '每日签到',
          createdAt: { gte: todayStart.getTime() },
        },
      })
      if (existing) {
        throw new Error('ALREADY_CHECKED_IN')
      }

      await tx.scoreRecord.create({
        data: {
          coachId: player.coachId,
          playerId,
          ruleId: null,
          indicatorId: null,
          points: CHECKIN_POINTS,
          type: 'bonus',
          reason: '每日签到',
          operatorType: 'system',
          operatorId: 'system',
          createdAt: now,
        },
      })

      return tx.player.update({
        where: { id: playerId },
        data: {
          currentPoints: { increment: CHECKIN_POINTS },
          updatedAt: now,
        },
        select: { currentPoints: true },
      })
    })

    // 检查连续训练奖励 + 惊喜掉落（在事务外，失败不影响签到成功）
    let luckyDrop = null
    let bonusEvents: { days: number; points: number; label: string }[] = []
    try {
      const streakResult = await calculateStreakBonus(playerId, player.coachId, now)
      bonusEvents = streakResult.bonusEvents
      luckyDrop = streakResult.luckyDrop
      if (!luckyDrop) {
        luckyDrop = await tryLuckyDrop({ playerId, trigger: 'checkin' })
      }
    } catch (e: any) {
      console.error('[Signin] streak/drop error:', e.message)
    }

    res.json({
      success: true,
      data: {
        checkinPoints: CHECKIN_POINTS,
        streakBonus: bonusEvents,
        currentPoints: updatedPlayer.currentPoints,
        luckyDrop,
      },
    })
  } catch (e: any) {
    if (e.message === 'ALREADY_CHECKED_IN') {
      return res.status(400).json({ success: false, error: '今日已签到' })
    }
    return res.status(500).json({ success: false, error: '操作失败，请重试' })
  }
})

async function calculateStreakBonus(playerId: string, coachId: string, now: number) {
  const bonusEvents: { days: number; points: number; label: string }[] = []
  let luckyDrop = null

  // 基于签到记录计算连续活跃天数
  const checkins = await db.scoreRecord.findMany({
    where: { playerId, type: 'bonus', reason: '每日签到' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  const activeDays = new Set<string>()
  for (const c of checkins) {
    const d = new Date(Number(c.createdAt))
    d.setHours(0, 0, 0, 0)
    activeDays.add(d.getTime().toString())
  }

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const check = new Date(today)
    check.setDate(check.getDate() - i)
    if (activeDays.has(check.getTime().toString())) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  // 3 天奖励（限制最近 7 天内只能获得一次，支持每周重复获得）
  if (streak >= 3) {
    const sevenDaysAgo = now - 7 * 24 * 3600 * 1000
    const hasBonus3 = await db.scoreRecord.findFirst({
      where: { playerId, type: 'bonus', reason: '连续3天活跃奖励', createdAt: { gte: sevenDaysAgo } },
    })
    if (!hasBonus3) {
      await db.scoreRecord.create({
        data: {
          coachId, playerId, ruleId: null, indicatorId: null,
          points: 15, type: 'bonus', reason: '连续3天活跃奖励',
          operatorType: 'system', operatorId: 'system', createdAt: now,
        },
      })
      await db.player.update({
        where: { id: playerId },
        data: { currentPoints: { increment: 15 }, updatedAt: now },
      })
      bonusEvents.push({ days: 3, points: 15, label: '连续3天活跃奖励' })
      // 惊喜掉落：连续3天签到
      try { luckyDrop = await tryLuckyDrop({ playerId, trigger: 'streak3' }) } catch (e: any) { console.error('[LuckyDrop] streak3 error:', e.message) }
    }
  }

  // 7 天奖励（限制最近 30 天内只能获得一次，支持每月重复获得）
  if (streak >= 7) {
    const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000
    const hasBonus7 = await db.scoreRecord.findFirst({
      where: { playerId, type: 'bonus', reason: '连续7天活跃奖励', createdAt: { gte: thirtyDaysAgo } },
    })
    if (!hasBonus7) {
      await db.scoreRecord.create({
        data: {
          coachId, playerId, ruleId: null, indicatorId: null,
          points: 50, type: 'bonus', reason: '连续7天活跃奖励',
          operatorType: 'system', operatorId: 'system', createdAt: now,
        },
      })
      await db.player.update({
        where: { id: playerId },
        data: { currentPoints: { increment: 50 }, updatedAt: now },
      })
      bonusEvents.push({ days: 7, points: 50, label: '连续7天活跃奖励' })
      // 惊喜掉落：连续7天签到必掉；全收集时给积分补偿
      try {
        luckyDrop = await tryLuckyDrop({ playerId, trigger: 'streak7' })
        if (!luckyDrop) {
          await db.scoreRecord.create({
            data: { coachId, playerId, ruleId: null, indicatorId: null, points: 30, type: 'bonus',
              reason: '全收集奖励 · 7天连续活跃', operatorType: 'system', operatorId: 'system', createdAt: now },
          })
          await db.player.update({ where: { id: playerId }, data: { currentPoints: { increment: 30 }, updatedAt: now } })
          bonusEvents.push({ days: 7, points: 30, label: '全收集奖励（稀有池已集齐）' })
        }
      } catch (e: any) { console.error('[LuckyDrop] streak7 error:', e.message) }
    }
  }

  return { bonusEvents, luckyDrop }
}

// ===== 创建宠物 =====
publicRouter.post('/public/player/:playerId/pet/create', async (req, res) => {
  const playerId = req.params.playerId as string
  const { speciesId } = req.body

  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const species = await db.petSpeciesDef.findUnique({ where: { id: speciesId } })
  if (!species) return res.status(404).json({ success: false, error: '物种不存在' })

  const existingPet = await db.pet.findUnique({ where: { playerId } })
  if (existingPet) return res.status(400).json({ success: false, error: '该学生已有宠物' })

  const now = Date.now()
  const pet = await db.pet.create({
    data: {
      playerId,
      speciesId,
      name: species.name,
      stage: 'egg',
      carePoints: 0,
      level: 1,
      hunger: 100,
      mood: 100,
      lastDecayAt: BigInt(now),
      lastFedAt: BigInt(0),
      lastPlayedAt: BigInt(0),
      createdAt: BigInt(now),
      evolvedAt: BigInt(0),
    },
  })

  res.json({
    success: true,
    data: {
      id: pet.id,
      playerId: pet.playerId,
      speciesId: pet.speciesId,
      name: pet.name,
      stage: pet.stage,
      carePoints: pet.carePoints,
      level: pet.level,
      hunger: pet.hunger,
      mood: pet.mood,
    },
  })
})

function serializeSpecies(speciesDef: any) {
  if (!speciesDef) return null
  return {
    ...speciesDef,
    stages: JSON.parse(JSON.stringify(speciesDef.stages)),
  }
}

