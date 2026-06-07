// ── 惊喜掉落引擎 ──
// 核心逻辑：概率判定 → 稀有度分层 → 防重复 → 返回掉落物品

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

export type LuckyTrigger = 'checkin' | 'streak3' | 'streak7' | 'assessment'

export interface LuckyDropItem {
  id: string
  name: string
  emoji: string
  description: string
  type: string
  rarity: string
  imageClass: string
  imageUrl?: string | null
  effect: any
}

export interface LuckyDropResult {
  item: LuckyDropItem
  animation: string // 动画等级：green / blue / purple / orange / golden
}

// 掉落配置：每个触发条件的概率和可选稀有度池
const DROP_CONFIG: Record<LuckyTrigger, { baseChance: number; pool: string[] }> = {
  checkin:    { baseChance: 0.12, pool: ['common', 'uncommon'] },
  streak3:    { baseChance: 0.30, pool: ['uncommon', 'rare'] },
  streak7:    { baseChance: 1.00, pool: ['rare', 'epic', 'legendary'] }, // 必掉
  assessment: { baseChance: 0.20, pool: ['uncommon', 'rare'] },
}

// 稀有度权重（在各池内归一化）
const RARITY_WEIGHTS: Record<string, number> = {
  common:    55,
  uncommon:  28,
  rare:      12,
  epic:       4,
  legendary:  1,
}

// 稀有度 → 前端动画名
const RARITY_ANIMATION: Record<string, string> = {
  common:    'green',
  uncommon:  'blue',
  rare:      'purple',
  epic:      'orange',
  legendary: 'golden',
}

/**
 * 判定一次惊喜掉落
 * @returns LuckyDropResult | null — null 表示本次未掉落
 */
export async function tryLuckyDrop(params: {
  playerId: string
  trigger: LuckyTrigger
}): Promise<LuckyDropResult | null> {
  const { playerId, trigger } = params
  const config = DROP_CONFIG[trigger]

  // 1. 概率判定（streak7 必掉跳过随机）
  if (config.baseChance < 1.0 && Math.random() > config.baseChance) {
    return null
  }

  // 2. 查候选池 + 玩家已拥有物品（用于降权，不排除）
  const [candidates, owned] = await Promise.all([
    db.shopItem.findMany({
      where: { isLuckyDrop: true, rarity: { in: config.pool }, isActive: true },
      select: { id: true, name: true, emoji: true, description: true, type: true, rarity: true, imageClass: true, imageUrl: true, effect: true },
    }),
    db.playerInventory.findMany({
      where: { playerId },
      select: { itemId: true },
    }),
  ])
  const ownedIds = new Set(owned.map(o => o.itemId))

  if (candidates.length === 0) {
    // 候选池为空（无配置物品）
    return null
  }

  // 3. 按稀有度权重加权随机，已拥有物品降权 20%
  const DUP_PENALTY = 0.8
  const weighted: { item: typeof candidates[0]; w: number }[] = []
  for (const item of candidates) {
    let w = RARITY_WEIGHTS[item.rarity] || 1
    if (ownedIds.has(item.id)) w *= DUP_PENALTY
    weighted.push({ item, w })
  }

  const totalWeight = weighted.reduce((s, x) => s + x.w, 0)
  let roll = Math.random() * totalWeight
  let picked: typeof candidates[0] | null = null
  for (const { item, w } of weighted) {
    roll -= w
    if (roll <= 0) {
      picked = item
      break
    }
  }
  if (!picked) picked = candidates[candidates.length - 1] // 保险

  // 4. 写入玩家背包
  const now = Date.now()
  await db.playerInventory.create({
    data: {
      playerId,
      itemId: picked.id,
      quantity: 1,
      isEquipped: false,
      acquiredAt: now,
    },
  })

  return {
    item: {
      id: picked.id,
      name: picked.name,
      emoji: picked.emoji,
      description: picked.description,
      type: picked.type,
      rarity: picked.rarity,
      imageClass: picked.imageClass,
      imageUrl: picked.imageUrl,
      effect: picked.effect,
    },
    animation: RARITY_ANIMATION[picked.rarity] || 'green',
  }
}
