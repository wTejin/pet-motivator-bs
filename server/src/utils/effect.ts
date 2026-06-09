/**
 * effect 字段统一解析工具
 *
 * ShopItem.effect 在数据库中存储为 JSON 字符串或已解析对象，
 * 各处路由文件不应各自 JSON.parse，统一走这个入口。
 *
 * 注意：effect 是动态 JSON 结构，字段随物品类型变化，
 * 所以类型使用 any 而非 unknown，允许调用方直接访问子属性。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParsedEffect = Record<string, any>

/**
 * 安全解析 ShopItem.effect，统一返回对象。
 * 兼容 string（JSON）和已解析的 object 两种形态。
 */
export function parseEffect(raw: unknown): ParsedEffect {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return (raw as ParsedEffect) ?? {}
}

/**
 * 判断一个 ShopItem 是否为背景类商品（effect 中包含 backgroundId）
 */
export function isBackgroundItem(raw: unknown): boolean {
  const eff = parseEffect(raw)
  return !!eff?.equip?.backgroundId
}

/**
 * 从 effect 中提取 backgroundId
 */
export function getBackgroundId(raw: unknown): string | undefined {
  const eff = parseEffect(raw)
  return eff?.equip?.backgroundId
}
