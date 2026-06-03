/**
 * Step 3: 环境对冲
 *
 * 根据球员的家庭环境噪音水平（教练场边观测）和生理成熟度类别，
 * 对能力评分进行环境因素修正。
 *
 * 对冲规则（v2 — 差异化维度敏感度）：
 * - 晚熟 + 高压环境 → 潜能补偿，基础乘数 1.12
 * - 早熟 + 完美家庭 → 去偏，基础乘数 0.90
 * - 其他组合 → ×1.00 (不调整)
 *
 * 维度敏感系数（环境 → 球场表现的因果强度）：
 *   engagement : 1.0  — 训练投入度受心理状态直接驱动（物理维度）
 *   spatialIq  : 0.5  — 球商受训练质量间接影响
 *   techExec   : 0.5  — 技术受训练投入间接影响
 *   resilience : 0    — 心理韧性是人格特质，与物理环境对冲相互独立
 *   altruism   : 0    — 协作意愿是人格特质，不受物理对冲
 *   envNoise   : 0    — 对冲输入信号，修正自身会造成闭环污染
 */

export type MaturityCategory = 'early' | 'on_time' | 'late'
export type EnvCategory = 'high_pressure' | 'normal' | 'perfect_family'

export interface EnvironmentInput {
  envNoiseEma30d: number       // 近 30 天 env_noise EMA 均值 (0-99 标度)
  maturityCategory: MaturityCategory
  scores: Record<string, number> // 6 维 Mirwald 调整后的分数 (0-99)
}

export interface EnvironmentOutput {
  scores: Record<string, number>  // 对冲后的最终分数 (0-99)
  envCategory: EnvCategory
  hedgingMultiplier: number       // 基础乘数（未乘维度系数前）
  hedgingDescription: string
  /** 各维度实际应用的对冲乘数 */
  perDimensionMultipliers: Record<string, number>
}

// ── 维度敏感系数 ──
// 环境对冲对每维度施加的有效乘数 = 1 + (baseMultiplier - 1) × sensitivity
// 稳定维度(心理/社交/环境)不受物理环境对冲影响 — 它们衡量的是人格特质而非运动表现
const DIMENSION_SENSITIVITY: Record<string, number> = {
  resilience: 0,    // 心理韧性与环境噪音相互独立
  engagement: 1.0,  // 训练投入度受心理状态直接驱动（物理维度）
  altruism:   0,    // 协作意愿是人格特质，不受物理对冲
  spatialIq:  0.5,  // 球商受训练质量间接影响
  techExec:   0.5,  // 技术受训练投入间接影响
  envNoise:   0,    // 输入信号，不修正自身
}

// ── 基础对冲乘数 ──
const LATE_HIGH_PRESSURE_MULTIPLIER = 1.12   // 晚熟 + 高压 → 补偿
const EARLY_PERFECT_MULTIPLIER     = 0.90   // 早熟 + 完美 → 去偏

/**
 * 将 0-99 标度的 env_noise EMA 值映射为环境类别
 * 注：env_noise 越高表示家庭环境越健康（噪音越小）
 * < 40 → high_pressure (高压)
 * 40-80 → normal
 * > 80 → perfect_family
 */
export function classifyEnv(envNoiseEma30d: number): EnvCategory {
  if (envNoiseEma30d > 80) return 'perfect_family'
  if (envNoiseEma30d < 40) return 'high_pressure'
  return 'normal'
}

/**
 * 应用环境对冲（差异化维度敏感度版本）
 */
export function applyHedging(input: EnvironmentInput): EnvironmentOutput {
  const envCategory = classifyEnv(input.envNoiseEma30d)
  let baseMultiplier = 1.0
  let baseDescription = '标准环境，未触发对冲调整'

  // 晚熟 + 高压环境 → 潜能补偿
  if (input.maturityCategory === 'late' && envCategory === 'high_pressure') {
    baseMultiplier = LATE_HIGH_PRESSURE_MULTIPLIER
    baseDescription = '晚熟型球员处于高压家庭环境，基础乘数 ×1.12（差异化敏感度）'
  }
  // 早熟 + 完美家庭 → 去偏
  else if (input.maturityCategory === 'early' && envCategory === 'perfect_family') {
    baseMultiplier = EARLY_PERFECT_MULTIPLIER
    baseDescription = '早熟型球员家庭环境完美，基础乘数 ×0.90（差异化敏感度）'
  }

  // 对每个维度按敏感系数施加差异化对冲
  const hedgedScores: Record<string, number> = {}
  const perDimMultipliers: Record<string, number> = {}

  for (const [dim, score] of Object.entries(input.scores)) {
    const sensitivity = DIMENSION_SENSITIVITY[dim] ?? 0.5
    // 有效乘数 = 1 + (基础乘数 - 1) × 敏感系数
    const effectiveMultiplier = 1 + (baseMultiplier - 1) * sensitivity
    perDimMultipliers[dim] = Math.round(effectiveMultiplier * 1000) / 1000

    hedgedScores[dim] = Math.max(0, Math.min(99, Math.round(score * effectiveMultiplier)))
  }

  // 描述中追加敏感度信息
  let description = baseDescription
  if (baseMultiplier !== 1.0) {
    description += ` (resilience/engagement ×${perDimMultipliers['resilience']}, altruism ×${perDimMultipliers['altruism']}, spatialIq/techExec ×${perDimMultipliers['spatialIq']}, envNoise 不修正)`
  }

  return {
    scores: hedgedScores,
    envCategory,
    hedgingMultiplier: baseMultiplier,
    hedgingDescription: description,
    perDimensionMultipliers: perDimMultipliers,
  }
}

/**
 * 判断是否触发了环境对冲
 */
export function isHedgingActive(envCategory: EnvCategory, maturityCategory: MaturityCategory): boolean {
  return (
    (maturityCategory === 'late' && envCategory === 'high_pressure') ||
    (maturityCategory === 'early' && envCategory === 'perfect_family')
  )
}
