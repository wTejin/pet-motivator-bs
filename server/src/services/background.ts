/**
 * 背景皮肤服务 — 背景图查询、解析、同步的统一入口
 *
 * 所有背景相关逻辑集中在这里，player.ts / admin.ts 不再各自实现。
 */

import { PrismaClient } from '@prisma/client'
import { parseEffect, isBackgroundItem, getBackgroundId } from '../utils/effect'

const db = new PrismaClient()

// ── 类型 ──

export interface BackgroundInfo {
  cssGradient?: string
  imageUrl?: string
}

// ── 查询 ──

/**
 * 查询所有背景类商品（不限 type，只要 effect 中有 backgroundId 就算）
 */
export async function getBackgroundShopItems() {
  const allItems = await db.shopItem.findMany()
  return allItems.filter((it) => isBackgroundItem(it.effect))
}

/**
 * 构建 backgroundId → ShopItem 的索引 Map
 * 同时按 backgroundId 和 ShopItem.id 两个维度索引（兜底）
 */
export async function buildBackgroundItemMap(): Promise<Map<string, any>> {
  const bgItems = await getBackgroundShopItems()
  const map = new Map<string, any>()
  for (const it of bgItems) {
    const bid = getBackgroundId(it.effect)
    if (bid) map.set(bid, it)
    // 兜底：也按 ShopItem.id 索引
    if (it.id) map.set(it.id, it)
  }
  return map
}

/**
 * 解析宠物当前皮肤的背景信息
 * 优先 PetBackgroundDef，图片缺失时兜底 ShopItem
 */
export async function resolveBackground(currentSkin: string): Promise<BackgroundInfo | null> {
  if (!currentSkin || currentSkin === 'default') return null

  const bgDef = await db.petBackgroundDef.findUnique({ where: { id: currentSkin } })
  let result: BackgroundInfo = {
    cssGradient: bgDef?.cssGradient || undefined,
    imageUrl: bgDef?.imageUrl || undefined,
  }

  // 兜底：PetBackgroundDef 没有图片时，从 ShopItem 中找
  if (!result.imageUrl) {
    const bgItemMap = await buildBackgroundItemMap()
    let bgItem = bgItemMap.get(currentSkin)
    // 更宽松兜底：直接按 ShopItem.id 匹配
    if (!bgItem) {
      bgItem = bgItemMap.get(currentSkin)
    }
    if (bgItem) {
      result = {
        cssGradient: result.cssGradient || bgItem.imageClass || undefined,
        imageUrl: bgItem.imageUrl || result.imageUrl || undefined,
      }
    }
  }

  return result
}

/**
 * 批量解析多个 skinId 的背景信息
 * 用于学员列表页等需要批量查询的场景
 */
export async function resolveBackgroundsForSkins(skinIds: string[]) {
  const uniqueIds = [...new Set(skinIds.filter(Boolean))]
  if (uniqueIds.length === 0) return { bgDefMap: new Map<string, any>(), bgItemMap: new Map<string, any>() }

  const bgDefs = await db.petBackgroundDef.findMany({ where: { id: { in: uniqueIds } } })
  const bgDefMap = new Map(bgDefs.map((b) => [b.id, b]))
  const bgItemMap = await buildBackgroundItemMap()

  return { bgDefMap, bgItemMap }
}

export function resolveBackgroundFromMaps(
  currentSkin: string,
  bgDefMap: Map<string, any>,
  bgItemMap: Map<string, any>,
): BackgroundInfo | null {
  if (!currentSkin || currentSkin === 'default') return null

  const def = bgDefMap.get(currentSkin)
  const item = bgItemMap.get(currentSkin)

  return {
    cssGradient: def?.cssGradient || item?.imageClass || undefined,
    imageUrl: def?.imageUrl || item?.imageUrl || undefined,
  }
}

// ── 同步 ──

/**
 * 背景类商品有图片时自动同步到 PetBackgroundDef
 */
export async function syncBackgroundDef(
  type: string,
  imageUrl?: string | null,
  effect?: any,
  name?: string,
) {
  if (type !== 'background' || !imageUrl) return
  const bgId = getBackgroundId(effect)
  if (!bgId) return
  await db.petBackgroundDef.upsert({
    where: { id: bgId },
    create: {
      id: bgId,
      name: name || bgId,
      imageUrl,
      cssGradient: '',
      thumbnailColor: '#333333',
    },
    update: { imageUrl },
  })
  console.log(`[PetBackgroundDef] synced "${bgId}" with image ${imageUrl}`)
}
