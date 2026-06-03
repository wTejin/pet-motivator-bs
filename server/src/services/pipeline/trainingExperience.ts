/**
 * 训练经验修正层
 *
 * 训练年限是区分"天赋驱动"和"训练驱动"表现的关键信号：
 *   - 短期训练 + 高分 → 更可能是天赋型球员
 *   - 长期训练 + 中等分数 → 能力瓶颈已到，上限有限
 *   - 短期训练 + 低分 → 数据不足以判断（训练量不够）
 *
 * 作用位置：Mirwald 修正后、环境对冲前
 * 作用于：修正因子 CF，乘以训练经验乘数
 */

export interface TrainingExperienceInput {
  trainingStartDate: string | null  // ISO date
}

export interface TrainingExperienceOutput {
  /** 训练年限（年），null 表示未录入 */
  trainingYears: number | null
  /** 对修正因子 CF 的调节乘数 (>1 补偿训练不足，<1 扣除训练红利) */
  experienceMultiplier: number
  /** 说明 */
  note: string
}

/**
 * 计算训练年限和对应的修正因子调节乘数
 *
 * 调节逻辑（基于 EXS-5 训练年限分组）：
 *   < 1 年: ×1.12 — 刚起步，现有表现低估真实潜力
 *   1-2 年: ×1.06 — 基础期，尚在积累
 *   2-4 年: ×1.00 — 中性区间
 *   4-6 年: ×0.95 — 长期训练，表现应已达稳定水平
 *   ≥ 6 年: ×0.90 — 训练红利已充分兑现
 */
export function computeTrainingExperience(input: TrainingExperienceInput): TrainingExperienceOutput {
  if (!input.trainingStartDate) {
    return {
      trainingYears: null,
      experienceMultiplier: 1.0,
      note: '未录入训练起始日期，不施加训练年限修正',
    }
  }

  const start = new Date(input.trainingStartDate)
  const now = new Date()
  const years = (now.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000)

  if (years < 0) {
    return {
      trainingYears: 0,
      experienceMultiplier: 1.0,
      note: '训练起始日期异常（晚于今天），不施加修正',
    }
  }

  let multiplier: number
  let note: string

  if (years < 1) {
    multiplier = 1.12
    note = `训练仅 ${formatYears(years)}，现有表现可能低估真实潜力，CF ×${multiplier}`
  } else if (years < 2) {
    multiplier = 1.06
    note = `训练 ${formatYears(years)}，基础积累期，CF ×${multiplier}`
  } else if (years < 4) {
    multiplier = 1.00
    note = `训练 ${formatYears(years)}，进入中性观察期`
  } else if (years < 6) {
    multiplier = 0.95
    note = `训练 ${formatYears(years)}，表现应已达稳定水平，CF ×${multiplier}`
  } else {
    multiplier = 0.90
    note = `训练 ${formatYears(years)}，训练红利已充分兑现，CF ×${multiplier}`
  }

  return {
    trainingYears: Math.round(years * 10) / 10,
    experienceMultiplier: Math.round(multiplier * 1000) / 1000,
    note,
  }
}

function formatYears(y: number): string {
  if (y < 1) return `${Math.round(y * 12)}个月`
  return `${Math.round(y * 10) / 10}年`
}
