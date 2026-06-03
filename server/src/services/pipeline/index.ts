/**
 * Pipeline Orchestrator
 *
 * 3 步管道：
 *   1. EMA 指数去噪
 *   2. PHV 成熟度修正（4步回归算法）
 *   3. 环境对冲
 *
 * 输出：0-99 标度的 6 维分数 + 综合评分 + 修正因子
 */

import { PrismaClient } from '@prisma/client'
import { computeEma, starToScale, EmaInput } from './ema'
import { computeMaturityOffset, calcChronologicalAge, correctForMaturity, getRegressionDebug, PlayerScores, resolveMaturityCategory } from './mirwald'
import { applyHedging, isHedgingActive } from './environment'
import { computePhysicalTestDimensionScore, computeFusionWeight } from './physicalTest'
import { computePAH } from './khamisRoche'
import { computeTrainingExperience } from './trainingExperience'

const db = new PrismaClient()

const DIMENSIONS = ['spatialIq', 'techExec', 'engagement', 'resilience', 'altruism', 'envNoise']
// 稳定维度：不受身体成熟度和环境影响的心理/社交/环境指标
const STABLE_DIMENSIONS = ['resilience', 'altruism', 'envNoise']

export interface PipelineResult {
  playerId: string
  overall: number
  potentialIndex: number           // PI 潜能指数（加权调和平均数）
  potentialTier: string            // 潜能分级
  dimensions: Record<string, {
    raw: number
    ema: number
    expectedScore: number
    correctionFactor: number
    maturityCorrected: number
    final: number
  }>
  chronologicalAge: number
  ageGroup: number
  maturityOffset: number
  maturityCategory: string
  legLengthCm: number
  bmi: number
  // PAH 遗传潜力
  predictedAdultHeightCm: number | null
  midParentHeightCm: number | null
  percentAdultHeight: number | null
  pahCategory: string | null
  mirwaldCategory: string
  maturityConsensus: boolean
  maturityNote: string
  // 训练年限
  trainingYears: number | null
  trainingExperienceMultiplier: number
  trainingExperienceNote: string
  envCategory: string
  envNoiseEma30d: number
  hedgingActive: boolean
  hedgingMultiplier: number
  hedgingPerDimMultipliers: Record<string, number>
  hedgingDescription: string
  correctionMeta: {
    isFallback: boolean
    fallbackReason?: string
    sampleSize: number
    regressionR2: Record<string, number>
    /** 哪些维度参与了PHV回归修正 */
    correctedDimensions: string[]
  }
  dynamicWeights: Record<string, number>
  physicalTestAnchor?: {
    measuredAt: number
    daysSince: number
    fusionWeight: number
    techExecPtScore: number | null
    engagementPtScore: number | null
  }
}

/**
 * 对单个球员执行完整管道计算
 */
export async function computePipeline(playerId: string): Promise<PipelineResult | null> {
  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return null

  // ── 加载数据 ──

  const ninetyDaysAgo = Date.now() - 90 * 24 * 3600 * 1000
  const assessments = await db.dailyAssessment.findMany({
    where: { playerId, createdAt: { gte: ninetyDaysAgo } },
    orderBy: { createdAt: 'asc' },
  })

  const latestBiometric = await db.playerBiometric.findFirst({
    where: { playerId },
    orderBy: { measuredAt: 'desc' },
  })

  // 加载最新运动表现体测（可选 — 用于校准 techExec/engagement）
  const latestPhysicalTest = await db.physicalTest.findFirst({
    where: { playerId },
    orderBy: { measuredAt: 'desc' },
  })

  if (!latestBiometric || assessments.length === 0) {
    return null
  }

  // ── Step 1: EMA 去噪 ──

  const emaInputs: EmaInput[] = []
  for (const a of assessments) {
    for (const dim of DIMENSIONS) {
      const raw = (a as any)[dim] as number
      emaInputs.push({ dimension: dim, rawValue: starToScale(raw), date: Number(a.createdAt) })
    }
  }

  const emaResults = computeEma(emaInputs)
  const latestEma: Record<string, number> = {}
  const latestRaw: Record<string, number> = {}
  const envNoiseEmaHistory: number[] = []

  for (const dim of DIMENSIONS) {
    const dimResults = emaResults.filter((r) => r.dimension === dim)
    if (dimResults.length > 0) {
      const latest = dimResults[dimResults.length - 1]
      latestEma[dim] = latest.emaValue
      latestRaw[dim] = latest.rawValue
      if (dim === 'envNoise') {
        envNoiseEmaHistory.push(...dimResults.map((r) => r.emaValue))
      }
    }
  }

  const envNoiseEma30d = envNoiseEmaHistory.length > 0
    ? Math.round((envNoiseEmaHistory.slice(-30).reduce((s, v) => s + v, 0) / Math.min(envNoiseEmaHistory.length, 30)) * 100) / 100
    : 50

  // ── 基础参数（Step 1.5 和 Step 2 都需要） ──
  const chronologicalAge = player.birthDate
    ? calcChronologicalAge(player.birthDate)
    : 12

  // ── Step 1.5: PhysicalTest 锚点融合 (校准 techExec/engagement) ──
  let physicalTestAnchor: {
    measuredAt: number
    daysSince: number
    fusionWeight: number
    techExecPtScore: number | null
    engagementPtScore: number | null
  } | null = null

  if (latestPhysicalTest) {
    const daysSince = (Date.now() - Number(latestPhysicalTest.measuredAt)) / (24 * 3600 * 1000)
    const { wPt, wEma } = computeFusionWeight(daysSince)

    const techExecPtScore = computePhysicalTestDimensionScore(latestPhysicalTest, 'techExec', chronologicalAge)
    const engagementPtScore = computePhysicalTestDimensionScore(latestPhysicalTest, 'engagement', chronologicalAge)

    for (const [dim, ptScore] of [['techExec', techExecPtScore], ['engagement', engagementPtScore]] as const) {
      if (ptScore !== null && wPt > 0) {
        const emaScore = latestEma[dim] || 50
        latestEma[dim] = Math.round(emaScore * wEma + ptScore * wPt)
      }
    }

    physicalTestAnchor = {
      measuredAt: Number(latestPhysicalTest.measuredAt),
      daysSince: Math.round(daysSince * 10) / 10,
      fusionWeight: wPt,
      techExecPtScore,
      engagementPtScore,
    }
  }

  // ── Step 2: PHV 成熟度修正 (4-step regression) ──

  const mirwaldResult = computeMaturityOffset({
    chronologicalAge,
    heightCm: latestBiometric.heightCm,
    weightKg: latestBiometric.weightKg,
    sittingHeightCm: latestBiometric.sittingHeightCm,
    gender: player.gender,
  })

  // ── Step 2a: %PAH 计算 (Khamis-Roche) + 交叉验证 ──
  const pahResult = computePAH({
    chronologicalAge,
    heightCm: latestBiometric.heightCm,
    weightKg: latestBiometric.weightKg,
    fatherHeightCm: player.fatherHeightCm ?? null,
    motherHeightCm: player.motherHeightCm ?? null,
  })

  const maturityConsensus = resolveMaturityCategory(
    mirwaldResult.maturityOffset,
    mirwaldResult.maturityCategory,
    pahResult.pahCategory,
    pahResult.percentAdultHeight,
    pahResult.predictedAdultHeightCm,
  )

  // 加载全部活跃球员（不限教练），±2 岁同龄段过滤
  // 跨教练的更大样本量使 4 步回归具备统计意义
  const allPlayers = await db.player.findMany({
    where: { isActive: true },
  })

  // ── 教练评分归一化 ──
  // 不同教练评分标准差异很大（张教练的3★ ≈ 李教练的4★）
  // 在跑回归前先按教练做 z-score 归一化，消除教练偏差
  const coachNorms = new Map<string, { sums: Record<string, number>; counts: number }>()
  const cohortRaw: { player: any; age: number; bio: any; mResult: any; coachId: string }[] = []

  for (const p of allPlayers) {
    const age = calcChronologicalAge(p.birthDate!)
    if (Math.abs(age - chronologicalAge) > 2) continue

    const bio = await db.playerBiometric.findFirst({
      where: { playerId: p.id },
      orderBy: { measuredAt: 'desc' },
    })
    if (!bio || !p.birthDate) continue

    const mResult = computeMaturityOffset({
      chronologicalAge: age,
      heightCm: bio.heightCm,
      weightKg: bio.weightKg,
      sittingHeightCm: bio.sittingHeightCm,
      gender: p.gender,
    })

    let scores: Record<string, number>
    if (p.id === playerId) {
      scores = latestEma
    } else {
      scores = await getPlayerAverageScores(p.id)
    }

    // 累计各教练平均分
    if (!coachNorms.has(p.coachId)) {
      coachNorms.set(p.coachId, {
        sums: Object.fromEntries(DIMENSIONS.map((d) => [d, 0])),
        counts: 0,
      })
    }
    const cn = coachNorms.get(p.coachId)!
    for (const dim of DIMENSIONS) cn.sums[dim] += scores[dim] || 50
    cn.counts++

    cohortRaw.push({ player: p, age, bio, mResult, coachId: p.coachId })
  }

  // 全局均值（用于教练归一化后的还原目标）
  const globalMeans: Record<string, number> = {}
  for (const dim of DIMENSIONS) {
    let total = 0; let count = 0
    for (const [, cn] of coachNorms) { total += cn.sums[dim]; count += cn.counts }
    globalMeans[dim] = count > 0 ? total / count : 50
  }

  const cohortPlayers: PlayerScores[] = []
  for (const item of cohortRaw) {
    const cn = coachNorms.get(item.coachId)!
    const coachMean: Record<string, number> = {}
    for (const dim of DIMENSIONS) coachMean[dim] = cn.sums[dim] / cn.counts

    // 教练归一化：将每人分数拉到全局均值基准
    const scores: Record<string, number> = {}
    let normScores: Record<string, number>
    if (item.player.id === playerId) {
      normScores = latestEma
    } else {
      normScores = await getPlayerAverageScores(item.player.id)
    }

    for (const dim of DIMENSIONS) {
      // 稳定维度：教练评分偏差不反映真实人格差异，不做归一化，直接使用 EMA
      if (STABLE_DIMENSIONS.includes(dim)) {
        scores[dim] = Math.round(Math.max(0, Math.min(99, normScores[dim])))
      } else {
        scores[dim] = Math.round(normScores[dim] - coachMean[dim] + globalMeans[dim])
        scores[dim] = Math.max(0, Math.min(99, scores[dim]))
      }
    }

    cohortPlayers.push({
      playerId: item.player.id,
      scores,
      maturityStatus: item.mResult.maturityOffset,
      maturityCategory: item.mResult.maturityCategory,
      chronologicalAge: item.age,
    })
  }

  // 执行 4 步修正
  const corrections = correctForMaturity(cohortPlayers)
  const myCorrection = corrections.find((c) => c.playerId === playerId)
  const maturityCorrected = myCorrection?.correctedScores || latestEma
  const correctionFactors = myCorrection?.correctionFactors || {}
  const expectedScores = myCorrection?.expectedScores || {}

  // ── PT 融合后的 Mirwald 修正说明 ──
  // PhysicalTest 分数按年龄组（U8-U15）归一化，Mirwald 按生物成熟度修正。
  // 两条路径维度不同：年龄归一化消除同岁比较偏差，Mirwald 消除早/晚发育偏差。
  // 例：两个 13 岁孩子 30m 跑一样快 → 年龄归一化给相同分 → Mirwald 给晚熟者加分（因为他在生物学更年轻时达到同等表现）。
  // 故两条路径应叠加使用，不存在"双重修正"。

  // 回归调试信息
  const regDebug = getRegressionDebug(cohortPlayers)

  // ── Step 2b: 训练年限修正 ──
  // 区分"天赋驱动"和"训练驱动"的表现差异
  const trainingExp = computeTrainingExperience({
    trainingStartDate: player.trainingStartDate ?? null,
  })

  const TRAINING_SENSITIVITY: Record<string, number> = {
    spatialIq: 1.0,   // 球商随训练提升显著
    techExec: 1.0,    // 技术最依赖训练
    engagement: 0.7,  // 投入度部分先天
    resilience: 0.5,  // 韧性部分性格
    altruism: 0.3,    // 协作主要性格
    envNoise: 0.0,    // 外部环境，不修正
  }

  if (trainingExp.experienceMultiplier !== 1.0) {
    for (const dim of DIMENSIONS) {
      if (STABLE_DIMENSIONS.includes(dim)) continue  // 稳定维度不修正
      const sensitivity = TRAINING_SENSITIVITY[dim] || 0.5
      const effectiveMult = 1 + (trainingExp.experienceMultiplier - 1) * sensitivity
      maturityCorrected[dim] = Math.round(
        Math.max(0, Math.min(99, maturityCorrected[dim] * effectiveMult))
      )
      // 同步更新 CF 记录供前端展示
      correctionFactors[dim] = Math.round((correctionFactors[dim] || 1.0) * effectiveMult * 1000) / 1000
    }
  }

  // ── Step 3: 环境对冲 ──

  const hedgingResult = applyHedging({
    envNoiseEma30d,
    maturityCategory: maturityConsensus.finalCategory,
    scores: maturityCorrected,
  })

  // ── 计算 Overall + PI ──
  const finalScores = hedgingResult.scores
  const overall = Math.round(
    Object.values(finalScores).reduce((s, v) => s + v, 0) / DIMENSIONS.length,
  )
  const potentialIndex = myCorrection?.potentialIndex ?? overall
  const potentialTier = myCorrection?.potentialTier ?? (potentialIndex < 0 ? 'insufficient_data' : 'role')
  const dynamicWeights = myCorrection?.weights ?? {}

  // ── 构建维度详情 ──
  const dimensions: Record<string, any> = {}
  for (const dim of DIMENSIONS) {
    dimensions[dim] = {
      raw: Math.round(latestRaw[dim] || 0),
      ema: Math.round(latestEma[dim] || 0),
      expectedScore: Math.round(expectedScores[dim] || 0),
      correctionFactor: correctionFactors[dim] || 1.0,
      maturityCorrected: Math.round(maturityCorrected[dim] || 0),
      final: finalScores[dim] || 0,
    }
  }

  const bmi = Math.round((latestBiometric.weightKg / Math.pow(latestBiometric.heightCm / 100, 2)) * 10) / 10

  // 回归 R² 汇总
  const regressionR2: Record<string, number> = {}
  for (const rd of regDebug) {
    regressionR2[rd.dimension] = Math.round(rd.r2 * 1000) / 1000
  }

  // ── 写入快照 ──
  const now = Date.now()
  await db.pipelineSnapshot.create({
    data: {
      playerId,
      overall,
      dimensionJson: {
        ...dimensions,
        _ageGroup: myCorrection?.ageGroup ?? Math.round(chronologicalAge),
        _chronologicalAge: chronologicalAge,
        _isFallback: myCorrection?.isFallback ?? true,
        _fallbackReason: myCorrection?.fallbackReason ?? null,
      } as any,
      maturityOffset: mirwaldResult.maturityOffset,
      maturityCategory: maturityConsensus.finalCategory,
      envCategory: hedgingResult.envCategory,
      envNoiseEma30d,
      hedgingActive: isHedgingActive(hedgingResult.envCategory, maturityConsensus.finalCategory),
      hedgingMultiplier: hedgingResult.hedgingMultiplier,
      computedAt: now,
    },
  })

  return {
    playerId,
    overall,
    potentialIndex,
    potentialTier,
    dimensions,
    chronologicalAge,
    ageGroup: myCorrection?.ageGroup ?? Math.round(chronologicalAge),
    maturityOffset: mirwaldResult.maturityOffset,
    maturityCategory: maturityConsensus.finalCategory,
    legLengthCm: mirwaldResult.legLengthCm,
    bmi,
    // ── PAH 遗传潜力 ──
    predictedAdultHeightCm: pahResult.predictedAdultHeightCm,
    midParentHeightCm: pahResult.midParentHeightCm,
    percentAdultHeight: pahResult.percentAdultHeight,
    pahCategory: pahResult.pahCategory,
    mirwaldCategory: mirwaldResult.maturityCategory,
    maturityConsensus: maturityConsensus.consensus,
    maturityNote: maturityConsensus.note,
    // ── 训练年限 ──
    trainingYears: trainingExp.trainingYears,
    trainingExperienceMultiplier: trainingExp.experienceMultiplier,
    trainingExperienceNote: trainingExp.note,
    // ── 环境对冲 ──
    envCategory: hedgingResult.envCategory,
    envNoiseEma30d,
    hedgingActive: isHedgingActive(hedgingResult.envCategory, maturityConsensus.finalCategory),
    hedgingMultiplier: hedgingResult.hedgingMultiplier,
    hedgingPerDimMultipliers: hedgingResult.perDimensionMultipliers,
    hedgingDescription: hedgingResult.hedgingDescription,
    correctionMeta: {
      isFallback: myCorrection?.isFallback ?? true,
      fallbackReason: myCorrection?.fallbackReason,
      sampleSize: cohortPlayers.length,
      regressionR2,
      correctedDimensions: ['spatialIq', 'techExec', 'engagement'],
    },
    dynamicWeights,
    physicalTestAnchor: physicalTestAnchor || undefined,
  }
}

/**
 * 获取球员最近 30 天评估的各维度平均分（快速近似）
 */
async function getPlayerAverageScores(playerId: string): Promise<Record<string, number>> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000
  const assessments = await db.dailyAssessment.findMany({
    where: { playerId, createdAt: { gte: thirtyDaysAgo } },
  })

  if (assessments.length === 0) {
    return {
      spatialIq: 50, techExec: 50, engagement: 50,
      resilience: 50, altruism: 50, envNoise: 50,
    }
  }

  const sums: Record<string, number> = {}
  for (const dim of DIMENSIONS) sums[dim] = 0
  for (const a of assessments) {
    for (const dim of DIMENSIONS) {
      sums[dim] += starToScale((a as any)[dim] as number)
    }
  }
  const count = assessments.length
  const result: Record<string, number> = {}
  for (const dim of DIMENSIONS) {
    result[dim] = Math.round(sums[dim] / count)
  }
  return result
}
