<template>
  <div class="fifa-card" :class="[`rating-${ratingTier}`, { 'on-light': isLight }]" :style="{ borderColor: accentColor }">
    <div class="foil-shine"></div>

    <div class="card-main">
      <!-- Left column: photo frame + radar -->
      <div class="card-left">
        <div class="photo-frame">
          <div class="player-avatar">{{ stats.avatar }}</div>
        </div>
        <div class="radar-wrap">
          <RadarChart
            :dimensions="radarDimensions"
            :size="120"
            :color="accentColor"
            :fill-color="accentFillColor"
            grid-color="rgba(255,255,255,0.08)"
            label-color="rgba(255,255,255,0.5)"
          />
        </div>
      </div>

      <!-- Right column: dimension scores + indicators -->
      <div class="card-right">
        <div class="dim-scores-row">
          <div
            v-for="dim in stats.dimensions"
            :key="dim.dimensionId"
            class="dim-score-pill"
          >
            <span class="dim-score-name">{{ dim.dimensionName }}</span>
            <span class="dim-score-value" :style="{ color: scoreColor(dim.score) }">{{ dim.score }}</span>
          </div>
        </div>

        <div v-if="dimensionDefs && dimensionDefs.length" class="indicators-grid">
          <div
            v-for="ind in flattenedIndicators"
            :key="ind.id"
            class="indicator-row"
          >
            <span class="indicator-name">{{ ind.name }}</span>
            <span class="indicator-dim">{{ ind.dimAbbr }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerStats } from '@shared/types'
import RadarChart from './RadarChart.vue'

const props = defineProps<{
  stats: PlayerStats
  theme?: 'dark' | 'light'
  dimensionDefs?: {
    id: string
    name: string
    icon: string
    indicators: { id: string; name: string }[]
  }[]
}>()

const isLight = computed(() => props.theme === 'light')

const ratingTier = computed<'gold' | 'silver' | 'bronze'>(() => {
  if (props.stats.overall >= 85) return 'gold'
  if (props.stats.overall >= 70) return 'silver'
  return 'bronze'
})

const accentColor = computed(() => {
  switch (ratingTier.value) {
    case 'gold': return '#ffd700'
    case 'silver': return '#c0c0c0'
    case 'bronze': return '#cd7f32'
  }
})

const accentFillColor = computed(() => {
  switch (ratingTier.value) {
    case 'gold': return 'rgba(255, 215, 0, 0.15)'
    case 'silver': return 'rgba(192, 192, 192, 0.12)'
    case 'bronze': return 'rgba(205, 127, 50, 0.12)'
  }
})

const radarDimensions = computed(() =>
  props.stats.dimensions.map((dim) => ({
    label: dim.icon + dim.dimensionName.charAt(0),
    value: dim.score,
    maxValue: 99,
  })),
)

const flattenedIndicators = computed(() => {
  const defs = props.dimensionDefs || []
  const result: { id: string; name: string; dimAbbr: string }[] = []
  for (const dim of defs) {
    const abbr = dim.name.charAt(0)
    for (const ind of dim.indicators || []) {
      result.push({ id: ind.id, name: ind.name, dimAbbr: abbr })
    }
  }
  return result
})

function scoreColor(score: number): string {
  if (score >= 80) return '#ffd700'
  if (score >= 60) return '#ffffff'
  return '#9ca3af'
}
</script>

<style scoped>
.fifa-card {
  position: relative;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid transparent;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fifa-card.on-light {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.rating-gold {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.25), inset 0 0 20px rgba(255, 215, 0, 0.05);
}

.rating-silver {
  border-color: #c0c0c0;
  box-shadow: 0 0 15px rgba(192, 192, 192, 0.18), inset 0 0 15px rgba(192, 192, 192, 0.03);
}

.rating-bronze {
  border-color: #cd7f32;
  box-shadow: 0 0 10px rgba(205, 127, 50, 0.15), inset 0 0 10px rgba(205, 127, 50, 0.03);
}

.foil-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    135deg,
    transparent 40%,
    rgba(255, 255, 255, 0.04) 45%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 55%,
    transparent 60%
  );
  pointer-events: none;
  animation: foil-sweep 4s ease-in-out infinite;
}

@keyframes foil-sweep {
  0% { transform: translateX(-100%) translateY(-100%); }
  100% { transform: translateX(100%) translateY(100%); }
}

.card-main {
  display: flex;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.card-left {
  width: 140px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.photo-frame {
  width: 100%;
  border-radius: 12px;
  padding: 8px;
  border: 2px solid v-bind(accentColor);
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-avatar {
  font-size: 64px;
  line-height: 1;
}

.radar-wrap {
  display: flex;
  justify-content: center;
}

.card-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dim-scores-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dim-score-pill {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dim-score-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.dim-score-value {
  font-size: 14px;
  font-weight: 700;
}

.indicators-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
}

.indicator-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.indicator-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.indicator-dim {
  flex-shrink: 0;
  opacity: 0.5;
}
</style>
