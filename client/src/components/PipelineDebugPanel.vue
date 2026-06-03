<template>
  <div class="glass-card p-4">
    <div class="flex items-center justify-between cursor-pointer" @click="expanded = !expanded">
      <h2 class="text-sm font-semibold text-white">🔬 管道调试面板</h2>
      <span class="text-slate-400 text-xs">{{ expanded ? '收起 ▲' : '展开 ▼' }}</span>
    </div>

    <div v-if="expanded" class="mt-4 space-y-4">
      <!-- Algorithm indicator -->
      <div class="flex items-center gap-2 text-xs">
        <span class="text-slate-400">修正算法：</span>
        <span v-if="correctionMeta?.isFallback" class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">降级模式（样本不足，使用百分位排名）</span>
        <span v-else class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">PHV 4步回归修正（仅体能维度：{{ correctionMeta?.correctedDimensions?.join(', ') ?? '' }}）</span>
        <span class="text-slate-500">| 样本量: {{ correctionMeta?.sampleSize ?? 0 }}人</span>
      </div>

      <!-- Pipeline Steps -->
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <div class="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">1. EMA 去噪</div>
        <span>→</span>
        <div class="px-2 py-1 rounded bg-blue-500/10 text-blue-400">2. 线性回归 (β₀+β₁·MS)</div>
        <span>→</span>
        <div class="px-2 py-1 rounded bg-purple-500/10 text-purple-400">3. CF=RS/ERS</div>
        <span>→</span>
        <div class="px-2 py-1 rounded bg-amber-500/10 text-amber-400">4. 环境对冲</div>
        <span>→</span>
        <div class="px-2 py-1 rounded bg-white/10 text-white">Final</div>
      </div>

      <!-- Dimension Detail Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-slate-400 border-b border-white/5">
              <th class="text-left py-1 px-2">维度</th>
              <th class="text-right py-1 px-2">原始值</th>
              <th class="text-right py-1 px-2">EMA</th>
              <th class="text-right py-1 px-2">预期得分<br/><span class="text-xs">ERS</span></th>
              <th class="text-right py-1 px-2 text-purple-400">
                修正因子<br/><span class="text-xs">CF=RS/ERS</span>
              </th>
              <th class="text-right py-1 px-2 text-blue-400">
                成熟度修正<br/><span class="text-xs">CS=ESA·CF</span>
              </th>
              <th class="text-right py-1 px-2 text-amber-400">
                环境对冲
                <span v-if="hedgingActive" class="text-xs">(×{{ hedgingMultiplier }})</span>
              </th>
              <th class="text-right py-1 px-2 font-bold text-white">最终</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="dim in dimRows" :key="dim.key" class="border-b border-white/5 hover:bg-white/5">
              <td class="py-1.5 px-2 text-white">
                <span class="mr-1">{{ dim.icon }}</span>{{ dim.name }}
              </td>
              <td class="text-right py-1.5 px-2 text-slate-300">{{ dim.raw }}</td>
              <td class="text-right py-1.5 px-2 text-emerald-400">{{ dim.ema }}</td>
              <td class="text-right py-1.5 px-2 text-slate-400">{{ dim.expectedScore }}</td>
              <td class="text-right py-1.5 px-2 font-mono"
                :class="dim.cf > 1 ? 'text-emerald-400' : dim.cf < 1 ? 'text-red-400' : 'text-slate-400'">
                {{ dim.cf > 1 ? '+' : '' }}{{ ((dim.cf - 1) * 100).toFixed(1) }}%
              </td>
              <td class="text-right py-1.5 px-2 text-blue-400">{{ dim.maturityCorrected }}</td>
              <td class="text-right py-1.5 px-2" :class="hedgingActive ? 'text-amber-400' : 'text-slate-300'">{{ dim.maturityCorrected }}</td>
              <td class="text-right py-1.5 px-2 font-bold" :style="{ color: scoreColor(dim.final) }">{{ dim.final }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Regression R² info -->
      <div v-if="regressionR2Entries.length > 0 && !correctionMeta?.isFallback" class="bg-slate-800/30 rounded-lg p-3">
        <div class="text-xs text-slate-500 mb-2">📐 各维度回归 R²（拟合优度）</div>
        <div class="flex flex-wrap gap-3">
          <span v-for="dim in regressionR2Entries" :key="dim.dim" class="text-xs">
            <span class="text-slate-400">{{ dim.icon }}</span>
            <span class="text-white font-mono" :class="dim.r2 >= 0.3 ? 'text-emerald-400' : dim.r2 >= 0.1 ? 'text-amber-400' : 'text-red-400'">
              R²={{ dim.r2.toFixed(3) }}
            </span>
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-1">
          R² ≥ 0.3: 成熟度与该项能力有显著线性关系 |
          R² &lt; 0.1: 发育程度对该项能力影响很小，修正因子接近 1.0
        </p>
      </div>

      <!-- Metadata -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div class="bg-slate-800/50 rounded-lg p-2">
          <div class="text-slate-500">实际年龄</div>
          <div class="text-white font-mono">{{ chronologicalAge != null ? chronologicalAge + '岁' : '-' }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-2">
          <div class="text-slate-500">年龄组</div>
          <div class="text-white font-mono">{{ ageGroup != null ? ageGroup + '岁组' : '-' }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-2">
          <div class="text-slate-500">BMI</div>
          <div class="text-white font-mono">{{ bmi != null ? bmi : '-' }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-2">
          <div class="text-slate-500">成熟度偏移 (MO)</div>
          <div class="text-white font-mono">{{ maturityOffset }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-2">
          <div class="text-slate-500">成熟度分类</div>
          <div :class="maturityColor" class="font-semibold">{{ maturityCategory }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-2">
          <div class="text-slate-500">环境分类</div>
          <div class="text-white">{{ envCategory }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-2">
          <div class="text-slate-500">对冲系数</div>
          <div class="text-white font-mono" :class="hedgingActive ? 'text-amber-400' : ''">×{{ hedgingMultiplier }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-2">
          <div class="text-slate-500">回归样本</div>
          <div class="text-white font-mono">{{ correctionMeta?.sampleSize ?? 0 }}人</div>
        </div>
      </div>

      <div class="bg-slate-800/30 rounded-lg p-3 space-y-2">
        <p class="text-sm text-slate-400">📝 {{ hedgingDescription }}</p>
        <div class="text-xs text-slate-500 border-t border-white/5 pt-2 mt-2">
          <p><strong>潜能指数 PI</strong> = 加权调和平均数 Σw/Σ(w/sᵢ)</p>
          <p>极低分会被指数级放大拉低总分（短板惩罚模型）。心理/社交维度(resilience, altruism, envNoise)不参与PHV修正。</p>
          <p>分级：≥85精英 | 70-84发展 | 50-69角色 | &lt;50淘汰</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { BIO_LEAP_DIMENSIONS } from '@shared/types'

const props = defineProps<{
  dimensions: Record<string, { raw: number; ema: number; expectedScore?: number; correctionFactor?: number; maturityCorrected?: number; final: number }> | null
  maturityOffset: number | null
  maturityCategory: string
  envCategory: string
  hedgingActive: boolean
  hedgingMultiplier: number
  hedgingDescription: string
  chronologicalAge?: number | null
  ageGroup?: number | null
  bmi?: number | null
  correctionMeta?: {
    isFallback: boolean
    sampleSize: number
    regressionR2: Record<string, number>
    correctedDimensions?: string[]
  } | null
}>()

const expanded = ref(true)

const dimRows = computed(() => {
  if (!props.dimensions) return []
  return BIO_LEAP_DIMENSIONS.map((d) => {
    const data = props.dimensions![d.key]
    return {
      ...d,
      raw: data?.raw ?? '-',
      ema: data?.ema ?? '-',
      expectedScore: data?.expectedScore ?? '-',
      cf: data?.correctionFactor ?? 1.0,
      maturityCorrected: data?.maturityCorrected ?? '-',
      final: data?.final ?? '-',
    }
  })
})

const regressionR2Entries = computed(() => {
  const r2 = props.correctionMeta?.regressionR2
  if (!r2) return []
  return BIO_LEAP_DIMENSIONS.map((d) => ({ dim: d.key, icon: d.icon, r2: r2[d.key] ?? 0 }))
})

const maturityColor = computed(() => {
  switch (props.maturityCategory) {
    case 'early': return 'text-amber-400'
    case 'late': return 'text-blue-400'
    default: return 'text-emerald-400'
  }
})

function scoreColor(v: number | string) {
  if (typeof v !== 'number') return '#94a3b8'
  if (v >= 80) return '#10b981'
  if (v >= 50) return '#f59e0b'
  return '#ef4444'
}
</script>
