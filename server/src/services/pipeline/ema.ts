/**
 * Step 1: EMA 指数去噪
 *
 * 核心公式: EMA_today = Raw × α + EMA_yesterday × (1-α)
 * α = 0.2 (平滑因子)
 *
 * 对每项指标独立计算 EMA，消除教练评分情绪波动。
 * env_noise 维度额外输出 30 天 EMA 均值供 Step 3 使用。
 */

export interface EmaInput {
  dimension: string // spatialIq | techExec | engagement | resilience | altruism | envNoise
  rawValue: number  // 1-5 星级（已转换为0-99标度或保持原始标度）
  date: number      // timestamp ms
}

export interface EmaOutput {
  dimension: string
  rawValue: number   // 原始值
  emaValue: number   // EMA 去噪值
  date: number
}

/**
 * 对一组按时间排序的评估记录计算 EMA
 */
export function computeEma(history: EmaInput[], alpha: number = 0.2): EmaOutput[] {
  if (history.length === 0) return []

  // 按维度分组
  const byDim = new Map<string, EmaInput[]>()
  for (const item of history) {
    if (!byDim.has(item.dimension)) byDim.set(item.dimension, [])
    byDim.get(item.dimension)!.push(item)
  }

  const results: EmaOutput[] = []

  for (const [dim, items] of byDim) {
    // 按时间排序
    items.sort((a, b) => a.date - b.date)

    let prevEma = items[0].rawValue // 第一条用原始值作为 EMA 初值
    for (let i = 0; i < items.length; i++) {
      const raw = items[i].rawValue
      if (i === 0) {
        results.push({ dimension: dim, rawValue: raw, emaValue: raw, date: items[i].date })
      } else {
        const ema = raw * alpha + prevEma * (1 - alpha)
        results.push({ dimension: dim, rawValue: raw, emaValue: Math.round(ema * 100) / 100, date: items[i].date })
        prevEma = ema
      }
    }
  }

  return results
}

/**
 * 计算单个维度的最新 EMA
 */
export function computeSingleEma(todayRaw: number, yesterdayEma: number | null, alpha: number = 0.2): number {
  if (yesterdayEma === null) return todayRaw
  return todayRaw * alpha + yesterdayEma * (1 - alpha)
}

/**
 * 计算 env_noise 的 30 天 EMA 均值
 * 输入：按时间排序的 env_noise EMA 值
 */
export function computeEnvNoiseEma30d(emaValues: number[]): number {
  // 取最近 30 天的 EMA 值（如果有的话），计算均值
  const recent = emaValues.slice(-30) // 假设每天一条，取最多 30 条
  if (recent.length === 0) return 3 // 默认中性值
  return Math.round((recent.reduce((s, v) => s + v, 0) / recent.length) * 100) / 100
}

/**
 * 将 1-5 星级评分转换为 0-99 标度
 */
export function starToScale(star: number): number {
  return ((star - 1) / 4) * 99
}

/**
 * 将 0-99 标度转换回 1-5 星级（用于显示）
 */
export function scaleToStar(scale: number): number {
  return Math.round((scale / 99) * 4 + 1)
}
