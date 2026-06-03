<template>
  <div class="detail-page p-4 md:p-6 space-y-4">
    <button class="text-emerald-400 text-sm hover:underline" @click="$router.push('/coach/players')">← 返回球员列表</button>

    <div v-if="loading" class="text-center py-8">
      <div class="skeleton h-96 w-full max-w-4xl mx-auto"></div>
    </div>

    <div v-if="!loading && detail" class="space-y-4">
      <!-- Actions -->
      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <button class="btn-primary px-4 py-2 rounded-lg text-sm font-semibold" :disabled="computing" @click="runPipeline">
            {{ computing ? '计算中...' : '🔄 重新计算管道' }}
          </button>
          <router-link :to="`/coach/assess?player=${detail.player.id}`" class="glass-card px-4 py-2 rounded-lg text-sm text-white hover:bg-white/5 transition-colors">
            ⭐ 快速评分
          </router-link>
        </div>
        <div v-if="pipelineBlockedReason" class="text-xs text-amber-300/80 bg-amber-500/10 rounded-lg px-3 py-2">
          💡 {{ pipelineBlockedReason }}
        </div>
      </div>

      <!-- ── 上半部分：左右分栏 ── -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <!-- 左：球员个人卡 + 雷达图 -->
        <BioLeapPlayerCard
          :player="detail.player"
          :snapshot="pipelineSnapshot"
          :prev-snapshot="prevSnapshot"
          :age="detail.player.birthDate ? calcAge(detail.player.birthDate) : null"
          :potential-index="pipelineResult?.potentialIndex ?? null"
          :potential-tier="pipelineResult?.potentialTier ?? null"
          :hedging-multiplier="pipelineSnapshot?.hedgingMultiplier"
          :correction-meta="pipelineResult?.correctionMeta"
        />

        <!-- 右：演化趋势图 -->
        <TrendLineChart :snapshots="snapshots" />
      </div>

      <!-- ── 下半部分：管道调试面板 ── -->
      <PipelineDebugPanel
        v-if="pipelineResult"
        :dimensions="pipelineResult.dimensions"
        :maturity-offset="pipelineResult.maturityOffset"
        :maturity-category="pipelineResult.maturityCategory"
        :env-category="pipelineResult.envCategory"
        :hedging-active="pipelineResult.hedgingActive"
        :hedging-multiplier="pipelineResult.hedgingMultiplier"
        :hedging-description="pipelineResult.hedgingDescription"
        :chronological-age="pipelineResult.chronologicalAge"
        :age-group="pipelineResult.ageGroup"
        :bmi="pipelineResult.bmi"
        :correction-meta="pipelineResult.correctionMeta"
      />

      <!-- 最近评估 -->
      <div class="glass-card p-4">
        <h2 class="text-sm font-semibold text-white mb-3">最近评估记录</h2>
        <div v-if="assessments.length === 0" class="text-slate-400 text-sm">暂无评估记录</div>
        <div v-else class="space-y-1 max-h-48 overflow-y-auto">
          <div v-for="a in assessments" :key="a.id" class="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
            <span class="text-slate-500 w-24">{{ formatDate(a.createdAt) }}</span>
            <span class="text-slate-300 flex-1 text-center">
              👁️{{ a.spatialIq }} ⚽{{ a.techExec }} 💪{{ a.engagement }}
              🛡️{{ a.resilience }} 🤝{{ a.altruism }} 🏠{{ a.envNoise }}
            </span>
            <span class="text-slate-500 w-20 text-right truncate">{{ a.notes || '' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { playerApi, assessmentApi, pipelineApi } from '@/api'
import BioLeapPlayerCard from '@/components/BioLeapPlayerCard.vue'
import PipelineDebugPanel from '@/components/PipelineDebugPanel.vue'
import TrendLineChart from '@/components/TrendLineChart.vue'
import type { PipelineSnapshot } from '@shared/types'

const route = useRoute()
const detail = ref<any>(null)
const assessments = ref<any[]>([])
const pipelineResult = ref<any>(null)
const pipelineSnapshot = ref<PipelineSnapshot | null>(null)
const prevSnapshot = ref<PipelineSnapshot | null>(null)
const snapshots = ref<PipelineSnapshot[]>([])
const loading = ref(true)
const computing = ref(false)

const pipelineBlockedReason = computed(() => {
  if (pipelineSnapshot.value) return ''
  const hasAssessments = assessments.value.length > 0
  const hasBiometric = detail.value?.latestBiometric != null
  if (!hasAssessments && !hasBiometric) return '请先录入每日评估和身体测量数据（身高/体重/坐高），然后点击上方按钮计算能力管道'
  if (!hasAssessments) return '暂无评估记录，请先在记分页完成每日评估'
  if (!hasBiometric) return `已有 ${assessments.value.length} 条评估记录，但缺少身体测量数据。请在下方录入身高/体重/坐高后重算`
  return ''
})

onMounted(async () => {
  const id = route.params.id as string
  try {
    const [dRes, aRes] = await Promise.all([
      playerApi.detail(id),
      assessmentApi.list(id, { limit: 20 }),
    ])
    detail.value = dRes.data.data
    assessments.value = aRes.data.data || []

    try {
      const [snapRes, latestRes] = await Promise.all([
        pipelineApi.snapshots(id),
        pipelineApi.latest(id),
      ])
      snapshots.value = snapRes.data.data || []
      pipelineSnapshot.value = latestRes.data.data || null
      if (snapshots.value.length >= 2) {
        prevSnapshot.value = snapshots.value[snapshots.value.length - 2]
      }
    } catch { /* pipeline not yet computed */ }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function runPipeline() {
  computing.value = true
  try {
    const id = route.params.id as string
    const computeRes = await pipelineApi.compute(id)
    pipelineResult.value = computeRes.data.data || null
    const [latestRes, snapRes] = await Promise.all([
      pipelineApi.latest(id),
      pipelineApi.snapshots(id),
    ])
    pipelineSnapshot.value = latestRes.data.data || null
    snapshots.value = snapRes.data.data || []
    if (snapshots.value.length >= 2) {
      prevSnapshot.value = snapshots.value[snapshots.value.length - 2]
    }
  } catch (e: any) {
    console.error(e)
  } finally {
    computing.value = false
  }
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
/*
 * ════════════════════════════════════════════════════════
 *  响应式布局（补充 Tailwind 断点）
 *  📱 手机 ≤768px     → 单列 + 紧凑
 *  📱➜💻 平板 769-1024 → 单列
 *  💻 桌面 1025-1400  → xl: 双列（Tailwind 默认）
 *  🖥️ 智慧屏 ≥1401    → 双列 + 大字
 * ════════════════════════════════════════════════════════
 */

/* ── 手机优化 ── */
@media (max-width: 768px) {
  .detail-page {
    padding: 8px !important;
  }
  .btn-primary {
    font-size: 12px;
    padding: 6px 12px;
  }
}

/* ── 智慧大屏 ── */
@media (min-width: 1401px) {
  .detail-page {
    max-width: 1600px;
    margin: 0 auto;
    font-size: 16px;
  }
  .btn-primary {
    font-size: 16px;
    padding: 12px 24px;
  }
  .glass-card {
    font-size: 15px;
  }
}

.skeleton {
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
