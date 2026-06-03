/**
 * Step 2: 青少年球员 PHV 成熟度修正算法
 *
 * 完整实现"4步成熟度成绩修正算法"：
 *   第一阶段：Mirwald 法测算生物学成熟度 (MO / MS)
 *   第二阶段：4步回归修正
 *     Step 1: 线性回归参数化 → 提取 β₀, β₁
 *     Step 2: 生成预期得分 ERS_i 和群体均值 ESA
 *     Step 3: 计算修正因子 CF_i = RS_i / ERS_i
 *     Step 4: 最终修正得分 CS_i = ESA × CF_i
 *
 * 参考：
 *   - Mirwald RL et al. (2002). MSSE, 34(4), 689-694.
 *   - 现代青训算法管道模型 — PHV 成熟度修正指南
 */

// ── Types ──

export type MaturityCategory = 'early' | 'on_time' | 'late'

export interface MirwaldInput {
  chronologicalAge: number   // 日历年龄 (年)
  heightCm: number
  weightKg: number
  sittingHeightCm: number
  gender?: string | null     // 'male' | 'female' | null — 用于年龄相对成熟度判定
}

export interface MirwaldOutput {
  maturityOffset: number      // MO: 距离 PHV 的年数
  maturityCategory: MaturityCategory
  legLengthCm: number
  pctAdultHeight: number | null  // %PAH: 预测成年身高百分比（如有）
}

export interface PlayerScores {
  playerId: string
  /** 6 维 EMA 去噪后的原始分数 (0-99 标度) */
  scores: Record<string, number>
  maturityStatus: number        // MS: 生物学成熟度（MO 值）
  maturityCategory: MaturityCategory
  chronologicalAge: number
}

export interface CorrectionResult {
  playerId: string
  /** 6 维最终修正得分 (0-99) */
  correctedScores: Record<string, number>
  /** 6 维修正因子 */
  correctionFactors: Record<string, number>
  /** 6 维预期得分 */
  expectedScores: Record<string, number>
  /** 潜能指数（加权调和平均数） */
  potentialIndex: number
  /** 潜能分级 */
  potentialTier: PotentialTier
  /** 该阶段使用的动态权重 */
  weights: Record<string, number>
  maturityCategory: MaturityCategory
  chronologicalAge: number
  ageGroup: number
  isFallback: boolean
  /** 降级/警告原因（供前端展示） */
  fallbackReason?: string
}

// ── Phase 1: Mirwald MO ──

/**
 * 计算 Mirwald 成熟度偏移值 (男性)
 *
 * MO = -9.236
 *    + 0.0002708 × LL × SH
 *    - 0.001663 × CA × LL
 *    + 0.007216 × CA × SH
 *    + 0.02292 × (W/H) × 100
 *
 * 其中 LL = H - SH (腿长)
 */
export function computeMaturityOffset(input: MirwaldInput): MirwaldOutput {
  const { chronologicalAge, heightCm, weightKg, sittingHeightCm } = input
  const legLengthCm = heightCm - sittingHeightCm

  if (legLengthCm <= 0 || heightCm <= 0 || weightKg <= 0) {
    return {
      maturityOffset: 0,
      maturityCategory: 'on_time',
      legLengthCm: 0,
      pctAdultHeight: null,
    }
  }

  // Mirwald 公式验证范围为 9-18 岁。8 岁球员内部用 9 代入
  // （8 岁必然远未到 PHV，公式输出方向正确，对分类无影响）
  const age = Math.max(9, chronologicalAge)
  const offset =
    -9.236 +
    0.0002708 * legLengthCm * sittingHeightCm -
    0.001663 * age * legLengthCm +
    0.007216 * age * sittingHeightCm +
    0.02292 * (weightKg / heightCm) * 100

  // 年龄相对成熟度判定
  // 固定阈值 (-1.0 / +1.0) 对低龄球员过于宽松：12 岁男孩期望 MO≈-2.0
  // 改用"实际 MO 偏离同龄期望 MO 的程度"来判定
  const expectedPhvAge = input.gender === 'female' ? 11.8 : 13.8
  const expectedMO = chronologicalAge - expectedPhvAge
  const moDeviation = offset - expectedMO  // 正值=早熟，负值=晚熟
  // 阈值 0.8（约 0.8 个标准差）：捕捉到更多真实早/晚熟者
  const devThreshold = 0.8
  let category: MaturityCategory = 'on_time'
  if (moDeviation < -devThreshold) category = 'late'
  else if (moDeviation > devThreshold) category = 'early'

  return {
    maturityOffset: Math.round(offset * 100) / 100,
    maturityCategory: category,
    legLengthCm: Math.round(legLengthCm * 10) / 10,
    pctAdultHeight: null,
  }
}

// ── Utility: chronological age ──

export function calcChronologicalAge(birthDate: string, referenceDate?: Date): number {
  const ref = referenceDate || new Date()
  const birth = new Date(birthDate)
  const diffMs = ref.getTime() - birth.getTime()
  return Math.round((diffMs / (365.25 * 24 * 3600 * 1000)) * 100) / 100
}

// ── Phase 2: 4-step Maturity Correction ──

const DIMENSIONS = ['spatialIq', 'techExec', 'engagement', 'resilience', 'altruism', 'envNoise']

/**
 * 维度分类：PHV修正只作用于体能/技术类维度
 *
 * 原则（来自青训雷达图科学构建规范 & IGPS模型）：
 *   - 体能/技术类：受生理发育影响显著，需要PHV去偏
 *   - 心理/社交类：相对独立于生理发育，不应修正
 *   - env_noise（环境抗噪）：反映的是家长行为，完全与球员生理无关
 */
const PHYSICAL_DIMENSIONS = ['spatialIq', 'techExec', 'engagement']
const STABLE_DIMENSIONS = ['resilience', 'altruism', 'envNoise']

/**
 * IGPS 动态年龄权重
 *
 * 不同发育阶段各维度的重要性截然不同：
 *   - PHV前（基础期：MO < -0.5）：技术权重高，身体权重极低
 *   - PHV中（过渡期：-0.5 ≤ MO ≤ 0.5）：均衡发展
 *   - PHV后（竞赛期：MO > 0.5）：战术和身体权重提升
 *
 * 权重分配（6维标准化到总和=1.0）：
 */
export function getDynamicWeights(maturityOffset: number): Record<string, number> {
  if (maturityOffset < -0.5) {
    // PHV前（基础阶段，U11-）：技术+球商60%，身体10%，心理+环境30%
    // 对齐文档《现代足球青训潜力评估算法体系》IGPS模型
    return {
      spatialIq: 0.28,  techExec: 0.32, engagement: 0.10,
      resilience: 0.12, altruism: 0.10, envNoise: 0.08,
    }
  } else if (maturityOffset <= 0.5) {
    // PHV中（过渡期）：技术/身体/心理均衡过渡
    return {
      spatialIq: 0.22, techExec: 0.20, engagement: 0.18,
      resilience: 0.15, altruism: 0.13, envNoise: 0.12,
    }
  } else {
    // PHV后（竞赛期，U17+）：身体权重升至27%（文档要求25-35%），战术提权
    return {
      spatialIq: 0.22, techExec: 0.16, engagement: 0.27,
      resilience: 0.14, altruism: 0.11, envNoise: 0.10,
    }
  }
}

/**
 * 潜能指数 PI (Potential Index)
 *
 * 使用加权调和平均数替代算术均值：
 *   PI = Σw / Σ(w/s_i)
 *
 * 优点：极低分会被指数级放大拉低总分。即使技术满分，性格出现"零容忍"低分，
 *       整体潜能直接被拉到不及格区间。
 *
 * 参考：职业足球青训潜力评估体系 — "短板惩罚模型"
 */
export function computePotentialIndex(
  scores: Record<string, number>,
  weights: Record<string, number>,
): number {
  let sumW = 0
  let sumWDividedByS = 0

  for (const dim of DIMENSIONS) {
    const w = weights[dim] || (1 / DIMENSIONS.length)
    // 避免除零：分数最低设为1
    const s = Math.max(1, scores[dim] || 0)
    sumW += w
    sumWDividedByS += w / s
  }

  if (sumWDividedByS === 0) return 0
  // 调和平均数映射回0-99
  const harmonicMean = sumW / sumWDividedByS
  return Math.round(Math.min(99, harmonicMean))
}

/**
 * PI 分级
 *
 * 参考：职业足球青训潜力评估体系
 */
export type PotentialTier = 'elite' | 'development' | 'role' | 'eliminate' | 'insufficient_data'

export function classifyPotential(pi: number): { tier: PotentialTier; label: string; recommendation: string } {
  if (pi < 0) return {
    tier: 'insufficient_data', label: '数据不足',
    recommendation: '评估样本不足（<3人），当前显示为同龄组内相对排名，非绝对能力评分。请积累更多评估数据后再查看潜力分级。',
  }
  if (pi >= 85) return {
    tier: 'elite', label: '精英前景',
    recommendation: '极具职业一线队潜力，技术与战术契合度极高，建议立即签约选拔',
  }
  if (pi >= 70) return {
    tier: 'development', label: '发展前景',
    recommendation: '具备优异的基础能力，发展上限很高，建议重点监控生理发育',
  }
  if (pi >= 50) return {
    tier: 'role', label: '角色球员',
    recommendation: '依赖特定战术体系，身体或技术存在瓶颈，建议视战术环境选择性留用',
  }
  return {
    tier: 'eliminate', label: '建议淘汰',
    recommendation: '经过生理和年龄修正后，绝对能力依然达不到要求，建议放弃',
  }
}

/**
 * 简单线性回归
 * 返回 { beta0 (截距), beta1 (斜率), r2 (决定系数) }
 */
function linearRegression(xs: number[], ys: number[]): { beta0: number; beta1: number; r2: number } | null {
  const n = xs.length
  if (n < 3) return null  // 至少 3 个样本才能做回归

  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n

  let ssXX = 0, ssXY = 0, ssYY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    ssXX += dx * dx
    ssXY += dx * dy
    ssYY += dy * dy
  }

  if (ssXX === 0) return null

  const beta1 = ssXY / ssXX
  const beta0 = meanY - beta1 * meanX
  const r2 = ssYY > 0 ? 1 - (ssYY - (ssXY * ssXY) / ssXX) / ssYY : 0

  return { beta0, beta1, r2 }
}

/**
 * Step 1: 线性回归参数化
 *
 * 对每个维度独立运行一元线性回归：
 *   RS_i = β₀ + β₁ · MS_i + ε_i
 *
 * 自变量 MS（生物学成熟度）使用 MO 值
 * 因变量 RS 使用 EMA 去噪后的分数 (0-99)
 */
function runRegressionPerDimension(players: PlayerScores[]): Record<string, { beta0: number; beta1: number; r2: number } | null> {
  const results: Record<string, { beta0: number; beta1: number; r2: number } | null> = {}

  for (const dim of DIMENSIONS) {
    // 只对体能/技术类维度跑回归（PHV修正有意义）
    if (!PHYSICAL_DIMENSIONS.includes(dim)) {
      continue  // 稳定维度不跑回归，applyCorrection中直接透传
    }
    const xs = players.map((p) => p.maturityStatus)   // MS = MO
    const ys = players.map((p) => p.scores[dim] || 0)  // RS
    results[dim] = linearRegression(xs, ys)
  }

  return results
}

/**
 * Step 2 & 3 & 4: 对每个球员计算 ERS → CF → CS
 *
 * Step 2:
 *   ERS_i = β₀ + β₁ · MS_i          (该球员基于发育程度的预期得分)
 *   ESA   = β₀ + β₁ · μ_MS          (群体平均发育水平的预期得分)
 *
 * Step 3:
 *   CF_i  = RS_i / ERS_i             (修正因子：>1 = 超越发育预期)
 *
 * Step 4:
 *   CS_i  = ESA × CF_i               (最终校准得分)
 */
function applyCorrection(
  players: PlayerScores[],
  regressions: Record<string, { beta0: number; beta1: number; r2: number } | null>,
): CorrectionResult[] {
  const meanMS = players.reduce((s, p) => s + p.maturityStatus, 0) / players.length

  const results: CorrectionResult[] = []

  for (const player of players) {
    const correctedScores: Record<string, number> = {}
    const correctionFactors: Record<string, number> = {}
    const expectedScores: Record<string, number> = {}
    let anyRegressionFailed = false

    for (const dim of DIMENSIONS) {
      const rs = player.scores[dim] || 0

      // 稳定维度（心理/社交/环境）：不参与PHV修正，直接使用EMA值
      if (STABLE_DIMENSIONS.includes(dim)) {
        correctedScores[dim] = Math.round(rs)
        correctionFactors[dim] = 1.0
        expectedScores[dim] = Math.round(rs)
        continue
      }

      // 体能/技术维度：检查回归结果
      const reg = regressions[dim]
      if (!reg) {
        // 回归失败（样本不足）：直接使用原始分数
        correctedScores[dim] = rs
        correctionFactors[dim] = 1.0
        expectedScores[dim] = rs
        anyRegressionFailed = true
        continue
      }

      const { beta0, beta1, r2 } = reg

      // 该维度所有球员的均值（回归线经过此点）
      const meanRS = players.reduce((s, p) => s + (p.scores[dim] || 0), 0) / players.length

      // 保护：β₁ < 0 意味着"越早熟→分数越低"
      // 这在 12-15 岁是生物学上不可能的现象，只能是样本偏差/教练打分偏差
      // 翻转 β₁ 并用 (meanMS, meanRS) 重新计算 β₀' 使回归线保持正确方向
      let effBeta0 = beta0
      let effBeta1 = beta1
      if (beta1 < 0) {
        effBeta1 = -beta1
        effBeta0 = meanRS - effBeta1 * meanMS
      }

      // Step 2: 生成预期得分
      const ers = effBeta0 + effBeta1 * player.maturityStatus
      const esa = effBeta0 + effBeta1 * meanMS

      // Step 3: 修正因子
      let cf: number
      if (Math.abs(ers) < 0.001) {
        cf = 1.0
      } else {
        cf = rs / ers
      }

      // 限制修正因子在合理范围 [0.5, 2.0]
      cf = Math.max(0.5, Math.min(2.0, cf))

      // Step 4: 最终修正得分
      let cs = esa * cf
      cs = Math.max(0, Math.min(99, Math.round(cs)))

      correctedScores[dim] = cs
      correctionFactors[dim] = Math.round(cf * 1000) / 1000
      expectedScores[dim] = Math.round(ers * 100) / 100
    }

    // 动态权重 + 潜能指数 PI
    const weights = getDynamicWeights(player.maturityStatus)
    const pi = computePotentialIndex(correctedScores, weights)
    const tier = classifyPotential(pi)

    results.push({
      playerId: player.playerId,
      correctedScores,
      correctionFactors,
      expectedScores,
      potentialIndex: pi,
      potentialTier: tier.tier,
      weights,
      maturityCategory: player.maturityCategory,
      chronologicalAge: player.chronologicalAge,
      ageGroup: Math.round(player.chronologicalAge),
      isFallback: anyRegressionFailed,
    })
  }

  return results
}

/**
 * 主入口：对一批球员执行完整的 4 步 PHV 成熟度修正
 *
 * @param players — 球员列表（含 EMA 分数和成熟度状态）
 * @returns 修正结果列表
 */
export function correctForMaturity(players: PlayerScores[]): CorrectionResult[] {
  // 只有1-2个球员时无法做回归，走降级逻辑
  if (players.length < 3) {
    return fallbackPercentileRanking(players)
  }

  // Step 1: 线性回归参数化
  const regressions = runRegressionPerDimension(players)

  // 检查物理维度回归是否失败（稳定维度永远不跑回归，不需要检查）
  const anyPhysicalRegressionFailed = PHYSICAL_DIMENSIONS.some((d) => !regressions[d])
  if (anyPhysicalRegressionFailed) {
    return fallbackPercentileRanking(players)
  }

  // Step 2-4: 应用修正
  const results = applyCorrection(players, regressions as Record<string, { beta0: number; beta1: number; r2: number }>)

  // 样本 3-4 人：回归可运行但极不稳定，追加警告
  if (players.length < 5) {
    const warning = `样本偏少（仅${players.length}人），回归修正仅供参考，建议积累更多评估数据`
    for (const r of results) {
      r.fallbackReason = warning
    }
  }

  return results
}

/**
 * 降级方案：样本不足时使用百分位排名
 * 成熟度组内排名 (60%) + 年龄组内排名 (40%)
 */
function fallbackPercentileRanking(players: PlayerScores[]): CorrectionResult[] {
  const results: CorrectionResult[] = []

  for (const player of players) {
    const maturityGroup = players.filter((p) => p.maturityCategory === player.maturityCategory)
    const maturityPct = computePercentiles(player, maturityGroup)

    const ageGroup = Math.round(player.chronologicalAge)
    const agePeers = players.filter((p) => Math.round(p.chronologicalAge) === ageGroup)
    const agePct = computePercentiles(player, agePeers)

    const correctedScores: Record<string, number> = {}
    const correctionFactors: Record<string, number> = {}
    const expectedScores: Record<string, number> = {}

    for (const dim of DIMENSIONS) {
      const m = maturityPct[dim] ?? 50
      const a = agePct[dim] ?? 50
      correctedScores[dim] = Math.round(m * 0.6 + a * 0.4)
      correctionFactors[dim] = 1.0
      expectedScores[dim] = player.scores[dim] || 0
    }

    // 小样本降级：不计算 PI（百分位排名不代表绝对能力）
    const weights = getDynamicWeights(player.maturityStatus)
    // PI = -1 表示"数据不足"，前端应展示"相对排名"而非潜力分级
    const fallbackReason = `样本不足（仅${players.length}人），当前显示为同龄组内相对排名，非绝对能力评分`

    results.push({
      playerId: player.playerId,
      correctedScores,
      correctionFactors,
      expectedScores,
      potentialIndex: -1,
      potentialTier: 'insufficient_data' as PotentialTier,
      weights,
      maturityCategory: player.maturityCategory,
      chronologicalAge: player.chronologicalAge,
      ageGroup,
      isFallback: true,
      fallbackReason,
    })
  }

  return results
}

function computePercentiles(player: PlayerScores, group: PlayerScores[]): Record<string, number> {
  const result: Record<string, number> = {}
  if (group.length <= 1) {
    for (const dim of DIMENSIONS) result[dim] = 50
    return result
  }

  for (const dim of DIMENSIONS) {
    const sorted = group.map((p) => p.scores[dim] || 0).sort((a, b) => a - b)
    const score = player.scores[dim] || 0
    const lower = sorted.filter((s) => s < score).length
    const equal = sorted.filter((s) => s === score).length
    result[dim] = Math.round(((lower + equal / 2) / sorted.length) * 99)
  }
  return result
}

/**
 * 导出回归信息用于调试面板展示
 */
export interface RegressionDebug {
  dimension: string
  beta0: number
  beta1: number
  r2: number
  meanMS: number
  sampleSize: number
}

export function getRegressionDebug(
  players: PlayerScores[],
): RegressionDebug[] {
  const regs = runRegressionPerDimension(players)
  const meanMS = players.reduce((s, p) => s + p.maturityStatus, 0) / players.length

  return DIMENSIONS.map((dim) => {
    const reg = regs[dim]
    return {
      dimension: dim,
      beta0: reg?.beta0 ?? 0,
      beta1: reg?.beta1 ?? 0,
      r2: reg?.r2 ?? 0,
      meanMS: Math.round(meanMS * 100) / 100,
      sampleSize: players.length,
    }
  })
}

// ── Mirwald + %PAH 交叉验证 ──

/**
 * 交叉验证成熟度分类结果
 *
 * 两个独立信号：
 *   - Mirwald MO：基于当前身体测量值估计距离 PHV 的年数
 *   - %PAH：基于遗传潜力判断已达成成年身高的百分比
 *
 * 原则：
 *   当两条路径一致时 → 高置信度
 *   当两条路径冲突时 → %PAH 优先（遗传潜力是更稳定的长周期信号）
 *
 * 典型冲突案例：
 *   - Mirwald="early", %PAH="late"  → 高个家庭的正常孩子被体型误导
 *   - Mirwald="late", %PAH="early"  → 矮个家庭的早熟孩子被体型迷惑
 */
export interface MaturityConsensus {
  mirwaldCategory: MaturityCategory
  mirwaldOffset: number
  pahCategory: MaturityCategory | null
  percentAdultHeight: number | null
  predictedAdultHeightCm: number | null
  /** 最终判定 */
  finalCategory: MaturityCategory
  /** 是否两个路径一致 */
  consensus: boolean
  /** 说明文字 */
  note: string
}

export function resolveMaturityCategory(
  mirwaldOffset: number,
  mirwaldCategory: MaturityCategory,
  pahCategory: MaturityCategory | null,
  percentAdultHeight: number | null,
  predictedAdultHeightCm: number | null,
): MaturityConsensus {
  // 无 %PAH → 纯 Mirwald
  if (!pahCategory) {
    return {
      mirwaldCategory,
      mirwaldOffset,
      pahCategory: null,
      percentAdultHeight: null,
      predictedAdultHeightCm: null,
      finalCategory: mirwaldCategory,
      consensus: false,
      note: '父母身高未录入，仅使用 Mirwald 公式判断成熟度。录入父母身高可开启遗传潜力交叉验证。',
    }
  }

  // 一致 → 高置信度
  if (mirwaldCategory === pahCategory) {
    const confidence = mirwaldCategory === 'on_time' ? '中' : '高'
    return {
      mirwaldCategory,
      mirwaldOffset,
      pahCategory,
      percentAdultHeight,
      predictedAdultHeightCm,
      finalCategory: mirwaldCategory,
      consensus: true,
      note: `Mirwald 与 %PAH 一致 (${confidence}置信度)：${categoryLabel(mirwaldCategory)}。`,
    }
  }

  // 冲突 → %PAH 优先
  const note = [
    `⚠ Mirwald (${categoryLabel(mirwaldCategory)}) 与 %PAH (${categoryLabel(pahCategory)}) 冲突。`,
    `采用 %PAH 判定：${categoryLabel(pahCategory)}。`,
    `预测成年身高 ${predictedAdultHeightCm}cm，当前已达 ${percentAdultHeight}%。`,
  ].join(' ')

  return {
    mirwaldCategory,
    mirwaldOffset,
    pahCategory,
    percentAdultHeight,
    predictedAdultHeightCm,
    finalCategory: pahCategory,
    consensus: false,
    note,
  }
}

function categoryLabel(cat: MaturityCategory): string {
  switch (cat) {
    case 'early': return '早发育'
    case 'late': return '晚发育'
    default: return '发育准时'
  }
}
