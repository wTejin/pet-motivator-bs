/**
 * PhysicalTest → Pipeline 维度分数转换
 *
 * 将定期体测的原始测量值（秒数/cm/1-5评分）转换为 0-99 标度，
 * 并聚合为 techExec 和 engagement 两个维度的"客观锚点"分数。
 *
 * 阈值按 U8-U15 年龄分组，默认值基于青少年体能发育曲线估算。
 * ⚠️ 标注 [估算] 的阈值为推算值，非权威常模数据。
 *    教练可根据本队历史体测数据校准，修改 AGE_THRESHOLDS 常量即可。
 *    未来接入权威常模（如 FIFA TMS、足协青训体测标准）时直接替换。
 *
 * 数据来源参考：
 *   - Mirwald et al. (2002) 青少年发育曲线
 *   - 中国足协青训大纲体能测试指南
 *   - UEFA 青少年精英球员体能发展模型
 */

import { PhysicalTest } from '@prisma/client'
import { starToScale } from './ema'

// ── 年龄组阈值表类型 ──

/**
 * 一个年龄组的 6 个分数档位阈值
 * 索引 0-5 分别对应 95, 85, 75, 65, 55, 45 分
 * - 速度/敏捷类（越低越好）：高于阈值[5] → 35, 低于阈值[0] → 95+
 * - 弹跳/耐力类（越高越好）：低于阈值[5] → 35, 高于阈值[0] → 95+
 */
interface AgeThresholds {
  sprint10m: number[]     // 秒
  sprint30m: number[]     // 秒
  verticalJump: number[]  // cm
  agility: number[]       // 秒 (Illinois/505)
  endurance: number[]     // 级 (Yo-Yo IR1)
}

// ── 年龄分组阈值表 ──
//
// 每行 6 个值对应分数档位: [95分线, 85分线, 75分线, 65分线, 55分线, 45分线]
// 低于 45 分线统一映射到 25-44 区间
//
// U15 基准值沿用 v1 原有单一阈值（原代码校准对象为 15-16 岁球员）
// U8-U14 按青少年发育曲线逐岁外推，均标注为 [估算]

const AGE_THRESHOLDS: Record<string, AgeThresholds> = {
  // ═══ U8 (7-8岁) [估算] — PHV前，身体控制优先 ═══
  U8: {
    sprint10m:    [2.15, 2.28, 2.42, 2.58, 2.74, 2.90],
    sprint30m:    [3.60, 3.78, 3.96, 4.14, 4.36, 4.58],
    verticalJump: [28,   25,   22,   19,   17,   15],
    agility:      [18.0, 18.5, 19.0, 19.5, 20.5, 21.5],
    endurance:    [7,    6,    5,    4,    3,    2],
  },
  // ═══ U9 (8-9岁) [估算] ═══
  U9: {
    sprint10m:    [2.08, 2.20, 2.34, 2.48, 2.64, 2.80],
    sprint30m:    [3.45, 3.62, 3.80, 3.98, 4.20, 4.40],
    verticalJump: [31,   28,   25,   22,   19,   16],
    agility:      [17.5, 18.0, 18.5, 19.0, 20.0, 21.0],
    endurance:    [9,    7,    6,    5,    4,    3],
  },
  // ═══ U10 (9-10岁) [估算] ═══
  U10: {
    sprint10m:    [2.00, 2.12, 2.25, 2.38, 2.54, 2.70],
    sprint30m:    [3.30, 3.47, 3.64, 3.82, 4.02, 4.22],
    verticalJump: [34,   31,   28,   25,   22,   19],
    agility:      [17.0, 17.5, 18.0, 18.5, 19.5, 20.5],
    endurance:    [10,   8,    7,    6,    5,    4],
  },
  // ═══ U11 (10-11岁) [估算] ═══
  U11: {
    sprint10m:    [1.94, 2.05, 2.18, 2.31, 2.46, 2.60],
    sprint30m:    [3.18, 3.34, 3.50, 3.68, 3.88, 4.08],
    verticalJump: [38,   34,   31,   28,   25,   22],
    agility:      [16.5, 17.0, 17.5, 18.0, 19.0, 20.0],
    endurance:    [12,   10,   8,    7,    6,    5],
  },
  // ═══ U12 (11-12岁) [估算] — PHV窗口开启 ═══
  U12: {
    sprint10m:    [1.88, 1.98, 2.10, 2.22, 2.36, 2.50],
    sprint30m:    [3.05, 3.20, 3.36, 3.52, 3.72, 3.92],
    verticalJump: [42,   38,   34,   30,   27,   24],
    agility:      [16.0, 16.5, 17.0, 17.5, 18.5, 19.5],
    endurance:    [13,   11,   9,    8,    7,    6],
  },
  // ═══ U13 (12-13岁) [估算] — PHV高峰期 ═══
  U13: {
    sprint10m:    [1.82, 1.92, 2.02, 2.14, 2.26, 2.40],
    sprint30m:    [2.92, 3.06, 3.22, 3.38, 3.56, 3.76],
    verticalJump: [46,   42,   38,   34,   30,   27],
    agility:      [15.6, 16.1, 16.6, 17.1, 18.1, 19.1],
    endurance:    [15,   13,   11,   9,    8,    7],
  },
  // ═══ U14 (13-14岁) [估算] — PHV后期 ═══
  U14: {
    sprint10m:    [1.80, 1.88, 1.98, 2.08, 2.20, 2.32],
    sprint30m:    [2.85, 2.98, 3.12, 3.28, 3.44, 3.62],
    verticalJump: [50,   46,   42,   38,   34,   30],
    agility:      [15.2, 15.7, 16.2, 16.7, 17.7, 18.7],
    endurance:    [16,   14,   12,   10,   9,    8],
  },
  // ═══ U15 (14-15岁) — 基准组，沿用 v1 原始阈值 ═══
  U15: {
    sprint10m:    [1.80, 1.90, 2.00, 2.10, 2.20, 2.30],
    sprint30m:    [2.80, 2.95, 3.10, 3.25, 3.40, 3.60],
    verticalJump: [55,   50,   45,   40,   35,   30],
    agility:      [14.5, 15.0, 15.5, 16.0, 16.5, 17.5],
    endurance:    [19,   17,   15,   13,   11,   9],
  },
}

// 16 岁及以上统一使用 U15 阈值（PHV 后身体发育趋于平稳）
const MAX_AGE_GROUP = 'U15'

// ── 年龄分组工具 ──

/**
 * 根据实足年龄（岁）返回年龄组标签
 * U8=7-8, U9=8-9, ..., U15=14-15, 16+→U15
 */
export function getAgeGroup(chronologicalAge: number): string {
  const base = Math.floor(chronologicalAge)  // 7 → U8, 8 → U9
  const clamped = Math.max(8, Math.min(15, base))
  return `U${clamped}`
}

// ── 通用阈值映射 ──

/** 分数档位，对应阈值数组的 6 个索引 */
const SCORE_LEVELS = [95, 85, 75, 65, 55, 45]

/**
 * 根据阈值表将原始测量值映射到 0-99 标度
 * @param value     原始测量值
 * @param thresholds 该年龄组阈值数组 [95线, 85线, 75线, 65线, 55线, 45线]
 * @param lowerIsBetter true=速度/敏捷类（越低越好），false=弹跳/耐力类（越高越好）
 */
function mapWithThresholds(
  value: number,
  thresholds: number[],
  lowerIsBetter: boolean,
): number {
  // 先判断是否超出最优/最差阈值
  if (lowerIsBetter) {
    if (value <= thresholds[0]) {
      // 优于95分线：线性外推到 99
      const ratio = (thresholds[0] - value) / (thresholds[0] - thresholds[1] + 0.001)
      return Math.min(99, Math.round(95 + ratio * 4))
    }
    if (value >= thresholds[5]) {
      // 差于45分线：线性衰减到 25
      const ratio = (value - thresholds[5]) / (thresholds[4] - thresholds[5] + 0.001)
      return Math.max(25, Math.round(45 - ratio * 20))
    }
  } else {
    if (value >= thresholds[0]) {
      const ratio = (value - thresholds[0]) / (thresholds[1] - thresholds[0] + 0.001)
      return Math.min(99, Math.round(95 + ratio * 4))
    }
    if (value <= thresholds[5]) {
      const ratio = (thresholds[5] - value) / (thresholds[5] - thresholds[4] + 0.001)
      return Math.max(25, Math.round(45 - ratio * 20))
    }
  }

  // 在 6 个阈值之间：线性插值
  for (let i = 0; i < thresholds.length - 1; i++) {
    const tHigh = thresholds[i]
    const tLow = thresholds[i + 1]
    const scoreHigh = SCORE_LEVELS[i]
    const scoreLow = SCORE_LEVELS[i + 1]

    const inRange = lowerIsBetter
      ? value >= tHigh && value <= tLow
      : value <= tHigh && value >= tLow

    if (inRange) {
      const ratio = (value - tHigh) / (tLow - tHigh + 0.001)
      return Math.round(scoreHigh + ratio * (scoreLow - scoreHigh))
    }
  }

  // 兜底（理论上不会到这里）
  return 50
}

// ── 各测试项映射（按年龄分组） ──

function mapSprint10m(seconds: number, age: number): number {
  const ag = getAgeGroup(age)
  const t = AGE_THRESHOLDS[ag] || AGE_THRESHOLDS[MAX_AGE_GROUP]
  return mapWithThresholds(seconds, t.sprint10m, true)
}

function mapSprint30m(seconds: number, age: number): number {
  const ag = getAgeGroup(age)
  const t = AGE_THRESHOLDS[ag] || AGE_THRESHOLDS[MAX_AGE_GROUP]
  return mapWithThresholds(seconds, t.sprint30m, true)
}

function mapVerticalJump(cm: number, age: number): number {
  const ag = getAgeGroup(age)
  const t = AGE_THRESHOLDS[ag] || AGE_THRESHOLDS[MAX_AGE_GROUP]
  return mapWithThresholds(cm, t.verticalJump, false)
}

function mapAgility(seconds: number, age: number): number {
  const ag = getAgeGroup(age)
  const t = AGE_THRESHOLDS[ag] || AGE_THRESHOLDS[MAX_AGE_GROUP]
  return mapWithThresholds(seconds, t.agility, true)
}

function mapEndurance(level: number, age: number): number {
  const ag = getAgeGroup(age)
  const t = AGE_THRESHOLDS[ag] || AGE_THRESHOLDS[MAX_AGE_GROUP]
  return mapWithThresholds(level, t.endurance, false)
}

// ── 维度聚合 ──

/**
 * 从 PhysicalTest 计算指定维度的锚点分数 (0-99)
 * @param pt PhysicalTest 记录
 * @param dimension 'techExec' | 'engagement'
 * @param chronologicalAge 球员实足年龄（岁），用于年龄分组阈值
 * @returns null 如果该维度没有任何可用测量数据
 */
export function computePhysicalTestDimensionScore(
  pt: PhysicalTest,
  dimension: 'techExec' | 'engagement',
  chronologicalAge: number,
): number | null {
  if (dimension === 'techExec') {
    const scores: number[] = []
    // 技术评分 (1-5 教练主观评分)
    if (pt.firstTouch != null) scores.push(starToScale(pt.firstTouch))
    if (pt.weakFoot != null) scores.push(starToScale(pt.weakFoot))
    if (pt.shootingPower != null) scores.push(starToScale(pt.shootingPower))
    if (pt.passingAccuracy != null) scores.push(starToScale(pt.passingAccuracy))
    // 体能实测 (身体对技术的支撑 — 年龄归一化)
    if (pt.sprint10m != null) scores.push(mapSprint10m(pt.sprint10m, chronologicalAge))
    if (pt.sprint30m != null) scores.push(mapSprint30m(pt.sprint30m, chronologicalAge))
    if (pt.verticalJump != null) scores.push(mapVerticalJump(pt.verticalJump, chronologicalAge))
    if (pt.agility != null) scores.push(mapAgility(pt.agility, chronologicalAge))
    if (pt.endurance != null) scores.push(mapEndurance(pt.endurance, chronologicalAge))
    if (scores.length === 0) return null
    return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
  }

  if (dimension === 'engagement') {
    // engagement = 训练投入度，仅跑动覆盖 (workRate) 能反映努力程度
    // 速度/弹跳/敏捷/耐力已归入 techExec（身体对技术的支撑）
    if (pt.workRate != null) return starToScale(pt.workRate)
    return null
  }

  return null
}

/**
 * 计算融合权重（体测新鲜度线性衰减，90天后权重归零）
 * @param daysSince 距上次体测的天数
 * @returns { wPt: 体测权重, wEma: EMA 权重 }
 */
export function computeFusionWeight(daysSince: number): { wPt: number; wEma: number } {
  if (daysSince < 0) return { wPt: 0, wEma: 1 }

  // 线性衰减：30天内体测权重最高 0.4，90天后归零
  const maxWeight = 0.4
  const decayDays = 90
  const wPt = Math.round(Math.max(0, maxWeight * (1 - daysSince / decayDays)) * 1000) / 1000

  return { wPt, wEma: Math.round((1 - wPt) * 1000) / 1000 }
}
