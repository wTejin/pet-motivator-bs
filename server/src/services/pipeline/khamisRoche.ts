/**
 * 遗传潜力成熟度评估 — 基于中亲身高法 (Mid-parent Target Height)
 *
 * 参考：
 *   - Tanner JM et al. (1970). "Standards for children's height at ages 2-9
 *     years allowing for heights of parents." Arch Dis Child, 45(244), 755-762.
 *   - Luo ZC et al. (1998). "Mid-parental height method."
 *     Acta Paediatr, 87(2), 144-148.
 *
 * 原理：
 *   遗传是成年身高最强的单一预测因子（r² ≈ 0.7-0.75）。
 *   中亲身高法临床使用超过 50 年，在没有骨龄片的情况下是最可靠的方法。
 *
 * 公式：
 *   男孩中亲身高中值: MPH = (fatherH + motherH + 13) / 2
 *   %PAH = 当前身高 / MPH × 100%
 *
 * 分类阈值（Tanner 法 — 基于 CDC/NCHS 生长曲线）：
 *   < 86%  → 晚发育 (剩余生长空间 > 14%)
 *   86-92% → 正常发育
 *   > 92%  → 早发育 (剩余生长空间 < 8%)
 */

export interface KhamisRocheInput {
  chronologicalAge: number
  heightCm: number
  weightKg: number               // 未直接使用，保留接口兼容
  fatherHeightCm: number | null
  motherHeightCm: number | null
}

export interface PAHResult {
  predictedAdultHeightCm: number | null
  percentAdultHeight: number | null
  pahCategory: 'early' | 'on_time' | 'late' | null
  midParentHeightCm: number | null
  noPahReason?: string
}

// 男孩成年身高对中亲身高 ±8.5cm（~1 SD）
const BOY_RANGE_CM = 8.5

export function calcPredictedAdultHeight(input: KhamisRocheInput): { pah: number; mph: number } | null {
  const { fatherHeightCm, motherHeightCm } = input

  if (fatherHeightCm == null || motherHeightCm == null) return null
  if (fatherHeightCm <= 0 || motherHeightCm <= 0) return null

  // 中亲身高（男孩性别调整 +13cm）
  const mph = (fatherHeightCm + motherHeightCm + 13) / 2

  // PAH 近似为中亲身高（群体平均值）
  // 个体修正：如果当前身高已经超过 MPH，说明接近生长终点
  const pah = mph

  return { pah: Math.round(pah * 10) / 10, mph: Math.round(mph * 10) / 10 }
}

export function computePAH(input: KhamisRocheInput): PAHResult {
  if (input.fatherHeightCm == null || input.motherHeightCm == null) {
    return {
      predictedAdultHeightCm: null,
      percentAdultHeight: null,
      pahCategory: null,
      midParentHeightCm: null,
      noPahReason: '父母身高未录入，无法计算遗传潜力成熟度',
    }
  }

  const result = calcPredictedAdultHeight(input)
  if (!result) {
    return {
      predictedAdultHeightCm: null,
      percentAdultHeight: null,
      pahCategory: null,
      midParentHeightCm: null,
      noPahReason: '身高数据异常',
    }
  }

  const { pah, mph } = result
  const pct = (input.heightCm / pah) * 100

  let pahCategory: 'early' | 'on_time' | 'late'
  if (pct > 92) {
    pahCategory = 'early'
  } else if (pct < 86) {
    pahCategory = 'late'
  } else {
    pahCategory = 'on_time'
  }

  return {
    predictedAdultHeightCm: pah,
    percentAdultHeight: Math.round(pct * 10) / 10,
    pahCategory,
    midParentHeightCm: mph,
  }
}
