<template>
  <div class="bio-leap-card" :class="[`tier-${tier}`]">
    <div class="card-shine"></div>

    <!-- Header -->
    <div class="card-header">
      <div class="header-left">
        <img
          v-if="isImageAvatar(player.avatar) && !brokenAvatars.has(player.avatar)"
          :src="player.avatar"
          class="card-avatar-img"
          @error="onAvatarError(player.avatar)"
        />
        <span v-else class="header-avatar-emoji">{{ isImageAvatar(player.avatar) ? '🙂' : player.avatar }}</span>
        <div class="header-info">
          <div class="header-name">{{ player.name }}</div>
          <div class="header-meta">
            <span v-if="genderLabel">{{ genderLabel }}</span>
            <span v-if="genderLabel && age != null" class="meta-sep">|</span>
            <span v-if="age != null">{{ age }}岁</span>
            <span v-if="birthDateDisplay" class="meta-sep">|</span>
            <span v-if="birthDateDisplay">🎂 {{ birthDateDisplay }}</span>
            <span v-if="trainingMonths != null" class="meta-sep">|</span>
            <span v-if="trainingMonths != null">⏱ {{ trainingMonths }}个月</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="overall-score" :style="{ color: tierColor }">{{ overall }}</div>
        <div class="overall-label">综合评分</div>
        <div v-if="piTierLabel" class="pi-tier" :class="piTierColor">{{ piTierLabel }}</div>
      </div>
    </div>

    <!-- Body: Bars (left) + Radar (right) — stacks on mobile -->
    <div class="card-body">
      <div class="card-bars">
        <div v-for="dim in dimDisplay" :key="dim.key" class="dim-row">
          <div class="dim-label">
            <span class="dim-icon">{{ dim.icon }}</span>
            <span class="dim-name">{{ dim.name }}</span>
          </div>
          <div class="dim-bar-wrap">
            <div class="dim-bar-bg">
              <div class="dim-bar" :style="{ width: dim.value + '%', background: dim.barColor }"></div>
            </div>
          </div>
          <span class="dim-val" :style="{ color: dim.barColor }">{{ dim.value }}</span>
        </div>

        <div class="info-row">
          <div class="info-item" :class="maturityBadgeClass">
            <span class="info-dot"></span>
            <span>{{ maturityLabel }}</span>
            <span class="info-val">{{ maturityOffset != null ? (maturityOffset > 0 ? '+' : '') + maturityOffset : '' }}</span>
          </div>
          <div class="info-item" :class="envBadgeClass">
            <span class="info-dot"></span>
            <span>🏠 {{ envLabel }}</span>
          </div>
          <div v-if="hedgingActive" class="info-item info-hedge">
            ⚡ 环境对冲 ×{{ hedgingMultiplier }}
          </div>
          <div class="info-item info-correction">
            {{ correctionMeta?.isFallback ? '🔸 百分位排名' : '🔹 PHV回归修正' }}
          </div>
        </div>
      </div>

      <div class="card-radar">
        <RadarChart
          :dimensions="radarData"
          :dimensions2="prevRadarData"
          :size="radarSize"
          :color="tierColor"
          :fill-color="tierFillColor"
          color2="#818cf8"
          fill-color2="rgba(129, 140, 248, 0.08)"
          legend1-label="观察值"
          legend2-label="修正值"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import RadarChart from './RadarChart.vue'
import { BIO_LEAP_DIMENSIONS, type PipelineSnapshotData } from '@shared/types'

const brokenAvatars = ref(new Set<string>())
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)

function isImageAvatar(avatar: string): boolean {
  return avatar?.startsWith('/') ?? false
}

function onAvatarError(url: string) {
  brokenAvatars.value = new Set([...brokenAvatars.value, url])
}

function onResize() {
  windowWidth.value = window.innerWidth
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const props = defineProps<{
  player: { id: string; name: string; avatar: string; birthDate: string | null; trainingStartDate?: string | null; gender?: string | null }
  snapshot: PipelineSnapshotData | null
  prevSnapshot?: PipelineSnapshotData | null
  age?: number | null
  potentialIndex?: number | null
  potentialTier?: string | null
  hedgingMultiplier?: number | null
  correctionMeta?: { isFallback?: boolean; sampleSize?: number } | null
}>()

const genderLabel = computed(() => {
  if (props.player.gender === 'male') return '♂️ 男'
  if (props.player.gender === 'female') return '♀️ 女'
  return null
})

const birthDateDisplay = computed(() => {
  const bd = props.player.birthDate
  if (!bd) return null
  try {
    const d = new Date(bd)
    if (isNaN(d.getTime())) return bd
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch { return bd }
})

const trainingMonths = computed(() => {
  if (!props.player.trainingStartDate) return null
  const start = new Date(props.player.trainingStartDate)
  const now = new Date()
  const months = (now.getTime() - start.getTime()) / (30.4375 * 24 * 3600 * 1000)
  return Math.round(months)
})

const overall = computed(() => props.potentialIndex ?? props.snapshot?.overall ?? 0)
const maturityCategory = computed(() => (props.snapshot?.maturityCategory as any) || 'on_time')
const maturityOffset = computed(() => props.snapshot?.maturityOffset ?? null)
const envCategory = computed(() => (props.snapshot?.envCategory as any) || 'normal')
const hedgingActive = computed(() => props.snapshot?.hedgingActive ?? false)

const dimDisplay = computed(() => {
  const dims = props.snapshot?.dimensionJson as Record<string, any> | undefined
  return BIO_LEAP_DIMENSIONS.map((d) => {
    const dimData = dims?.[d.key]
    const value = dimData?.final ?? dimData?.maturityCorrected ?? 0
    return { ...d, value, barColor: value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444' }
  })
})

const observedDisplay = computed(() => {
  const dims = props.snapshot?.dimensionJson as Record<string, any> | undefined
  return BIO_LEAP_DIMENSIONS.map((d) => {
    const dimData = dims?.[d.key]
    const value = dimData?.ema ?? dimData?.raw ?? 0
    return { ...d, value }
  })
})

const radarData = computed(() =>
  observedDisplay.value.map((d) => ({ label: d.icon + d.name.charAt(0), value: d.value, maxValue: 99 })),
)

const finalDisplay = computed(() => {
  const dims = props.snapshot?.dimensionJson as Record<string, any> | undefined
  if (!dims) return null
  return BIO_LEAP_DIMENSIONS.map((d) => {
    const dimData = dims[d.key]
    const value = dimData?.final ?? dimData?.maturityCorrected ?? 0
    return { ...d, value }
  })
})

const prevRadarData = computed(() => {
  if (!finalDisplay.value) return undefined
  return finalDisplay.value.map((d) => ({ label: d.icon + d.name.charAt(0), value: d.value, maxValue: 99 }))
})

const maturityLabel = computed(() => {
  switch (maturityCategory.value) {
    case 'early': return '🔼 早熟型'
    case 'late': return '🔽 晚熟型'
    default: return '✅ 正熟型'
  }
})

const maturityBadgeClass = computed(() => {
  switch (maturityCategory.value) {
    case 'early': return 'maturity-early'
    case 'late': return 'maturity-late'
    default: return 'maturity-on-time'
  }
})

const envLabel = computed(() => {
  if (envCategory.value === 'high_pressure') return '高压环境'
  if (envCategory.value === 'perfect_family') return '完美家庭'
  return '环境正常'
})

const envBadgeClass = computed(() => {
  if (envCategory.value === 'high_pressure') return 'env-high'
  if (envCategory.value === 'perfect_family') return 'env-perfect'
  return 'env-normal'
})

const tier = computed(() => {
  if (overall.value >= 80) return 'emerald'
  if (overall.value >= 50) return 'gold'
  if (overall.value >= 30) return 'silver'
  return 'bronze'
})

const tierColor = computed(() => {
  switch (tier.value) {
    case 'emerald': return '#10b981'
    case 'gold': return '#f59e0b'
    case 'silver': return '#c0c0c0'
    default: return '#cd7f32'
  }
})

const tierFillColor = computed(() => {
  switch (tier.value) {
    case 'emerald': return 'rgba(16, 185, 129, 0.12)'
    case 'gold': return 'rgba(245, 158, 11, 0.1)'
    case 'silver': return 'rgba(192, 192, 192, 0.08)'
    default: return 'rgba(205, 127, 50, 0.08)'
  }
})

const piTierLabel = computed(() => {
  if (props.potentialTier === 'elite') return '🔥 精英前景'
  if (props.potentialTier === 'development') return '📈 发展前景'
  if (props.potentialTier === 'role') return '🎯 角色球员'
  if (props.potentialTier === 'eliminate') return '⚠ 建议淘汰'
  return ''
})

const piTierColor = computed(() => {
  if (props.potentialTier === 'elite') return 'pi-elite'
  if (props.potentialTier === 'development') return 'pi-dev'
  if (props.potentialTier === 'role') return 'pi-role'
  return 'pi-elim'
})

// 响应式雷达图尺寸
const radarSize = computed(() => {
  const w = windowWidth.value
  if (w < 640) return 200
  if (w < 1024) return 260
  return 280
})
</script>

<style scoped>
/* ── Card Shell ── */
.bio-leap-card {
  position: relative;
  border-radius: 16px;
  padding: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #0f2a1e 50%, #16213e 100%);
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* 手机端整个卡片缩小 */
  font-size: 14px;
}
.tier-emerald { border-color: #10b981; box-shadow: 0 0 20px rgba(16,185,129,0.2); }
.tier-gold    { border-color: #f59e0b; box-shadow: 0 0 15px rgba(245,158,11,0.15); }
.tier-silver  { border-color: #c0c0c0; box-shadow: 0 0 10px rgba(192,192,192,0.1); }
.tier-bronze  { border-color: #cd7f32; box-shadow: 0 0 8px rgba(205,127,50,0.08); }

.card-shine {
  position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
  background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 55%, transparent 60%);
  pointer-events: none;
  animation: shine 4s ease-in-out infinite;
}
@keyframes shine {
  0% { transform: translateX(-100%) translateY(-100%); }
  100% { transform: translateX(100%) translateY(100%); }
}

/* ── Header ── */
.card-header {
  display: flex; align-items: center; justify-content: space-between;
  position: relative; z-index: 1;
  gap: 8px;
}
.header-left {
  display: flex; align-items: center; gap: 8px;
  min-width: 0; flex: 1;
}
.card-avatar-img {
  width: 36px; height: 36px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.2);
  flex-shrink: 0;
}
.header-avatar-emoji {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}
.header-info {
  min-width: 0;
}
.header-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-meta {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta-sep { margin: 0 2px; opacity: 0.4; }

.header-right {
  text-align: right;
  flex-shrink: 0;
}
.overall-score {
  font-size: 28px;
  font-weight: 800;
  font-family: monospace;
  line-height: 1;
}
.overall-label {
  font-size: 10px;
  color: #64748b;
}
.pi-tier { font-size: 10px; font-weight: 700; margin-top: 2px; }
.pi-elite  { color: #fbbf24; }
.pi-dev    { color: #34d399; }
.pi-role   { color: #94a3b8; }
.pi-elim   { color: #f87171; }

/* ── Body ── */
.card-body {
  display: flex;
  gap: 10px;
  position: relative;
  z-index: 1;
  align-items: center;
}

/* ── Bars (左/上) ── */
.card-bars {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}
.dim-row {
  display: flex; align-items: center; gap: 5px;
}
.dim-label {
  width: 78px; flex-shrink: 0;
  display: flex; align-items: center; gap: 3px;
}
.dim-icon { font-size: 13px; flex-shrink: 0; }
.dim-name {
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
  font-size: 12px;
}
.dim-bar-wrap { flex: 1; min-width: 0; }
.dim-bar-bg { height: 7px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
.dim-bar { height: 100%; border-radius: 4px; transition: width 0.6s; min-width: 2px; }
.dim-val {
  width: 28px; text-align: right;
  font-size: 13px; font-weight: 700;
  font-family: monospace; flex-shrink: 0;
}

/* ── Radar (右/下) ── */
.card-radar {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ── Info Badges ── */
.info-row {
  display: flex; flex-wrap: wrap; gap: 3px;
  position: relative; z-index: 1;
  margin-top: 2px;
}
.info-item {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 5px; border-radius: 4px; font-size: 10px;
  border: 1px solid transparent;
  white-space: nowrap;
}
.info-dot {
  width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0;
}
.info-val { font-family: monospace; font-size: 9px; opacity: 0.8; }
.info-hedge { color: #fbbf24; }
.info-correction { color: #94a3b8; }

.maturity-on-time { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.15); color: #10b981; }
.maturity-early   { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.15); color: #f59e0b; }
.maturity-late    { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.15); color: #3b82f6; }
.env-high    { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.15); color: #ef4444; }
.env-normal  { background: rgba(148,163,184,0.08); border-color: rgba(148,163,184,0.15); color: #94a3b8; }
.env-perfect { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.15); color: #10b981; }

/* ════════════════════════════════════
   平板：缩小间距，雷达图自适应
   ════════════════════════════════════ */
@media (max-width: 1024px) {
  .bio-leap-card { padding: 12px; gap: 8px; }
  .overall-score { font-size: 24px; }
  .dim-label { width: 68px; }
  .dim-name { font-size: 11px; }
  .dim-icon { font-size: 12px; }
  .dim-val { width: 24px; font-size: 12px; }
  .header-name { font-size: 14px; }
}

/* ════════════════════════════════════
   手机：上下堆叠 — 雷达在上、指标条在下
   ════════════════════════════════════ */
@media (max-width: 640px) {
  .bio-leap-card { padding: 10px; gap: 8px; }
  .card-header { gap: 4px; }
  .header-name { font-size: 13px; }
  .header-meta { font-size: 10px; white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.4; }
  .overall-score { font-size: 22px; }
  .card-avatar-img { width: 30px; height: 30px; }

  /* 上下布局：雷达 → 指标条 */
  .card-body {
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
  }
  .card-radar {
    display: flex;
    justify-content: center;
    padding: 0;
  }
  .card-bars { gap: 4px; }
  .dim-label { width: auto; flex: 0 0 auto; }
  .dim-name { font-size: 11px; }
  .dim-icon { font-size: 12px; }
  .dim-val { width: 24px; font-size: 11px; }
}
</style>
