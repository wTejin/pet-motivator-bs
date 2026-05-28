<template>
  <div
    class="fifa-card"
    :class="[`rating-${ratingTier}`, { light: isLight }]"
    :style="{ background: cardBg, color: textColor }"
  >
    <div class="foil-shine"></div>

    <div class="card-top">
      <div class="overall-rating" :style="{ color: accentColor }">
        <span class="rating-number">{{ stats.overall }}</span>
        <span class="rating-label">综合</span>
      </div>
      <div class="player-info">
        <span class="player-name">{{ stats.playerName }}</span>
        <span class="player-points" :style="{ color: subTextColor }">积分 {{ stats.totalPoints }}</span>
      </div>
    </div>

    <div class="radar-wrap">
      <RadarChart
        :dimensions="radarDimensions"
        :size="140"
        :color="accentColor"
        :fill-color="accentFillColor"
        :grid-color="isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'"
        :label-color="isLight ? '#666666' : '#9ca3af'"
      />
    </div>

    <div class="dim-bars">
      <div class="dim-bar" v-for="dim in stats.dimensions" :key="dim.dimensionId">
        <span class="dim-icon">{{ dim.icon }}</span>
        <span class="dim-name">{{ dim.dimensionName }}</span>
        <div class="bar-track" :style="{ background: trackBg }">
          <div
            class="bar-fill"
            :style="{
              width: (dim.score / dim.maxScore) * 100 + '%',
              background: progressColor(dim.score),
            }"
          ></div>
        </div>
        <span class="dim-score" :style="{ color: subTextColor }">{{ dim.score }}</span>
      </div>
    </div>

    <div class="card-stats">
      <div class="stat" :style="{ background: statBoxBg }">
        <label :style="{ color: subTextColor }">今日</label>
        <span class="stat-value">+{{ stats.todayPoints }}</span>
      </div>
      <div class="stat" :style="{ background: statBoxBg }">
        <label :style="{ color: subTextColor }">周排名</label>
        <span class="stat-value">#{{ stats.rank }}</span>
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
}>()

const ratingTier = computed<'gold' | 'silver' | 'bronze'>(() => {
  if (props.stats.overall >= 85) return 'gold'
  if (props.stats.overall >= 70) return 'silver'
  return 'bronze'
})

const isLight = computed(() => props.theme === 'light')

const cardBg = computed(() => {
  if (isLight.value) return '#FFFFFF'
  switch (ratingTier.value) {
    case 'gold': return 'linear-gradient(135deg, #1a1a2e 0%, #2d1f0a 100%)'
    case 'silver': return 'linear-gradient(135deg, #1a1a2e 0%, #1f2937 100%)'
    case 'bronze': return 'linear-gradient(135deg, #1a1a2e 0%, #2a1f0f 100%)'
  }
})

const textColor = computed(() => isLight.value ? '#333333' : '#FFFFFF')
const subTextColor = computed(() => isLight.value ? '#666666' : '#9ca3af')
const trackBg = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)')
const statBoxBg = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)')

const accentColor = computed(() => {
  switch (ratingTier.value) {
    case 'gold':
      return '#FFD700'
    case 'silver':
      return '#C0C0C0'
    case 'bronze':
      return '#CD7F32'
  }
})

const accentFillColor = computed(() => {
  switch (ratingTier.value) {
    case 'gold':
      return 'rgba(255, 215, 0, 0.2)'
    case 'silver':
      return 'rgba(192, 192, 192, 0.2)'
    case 'bronze':
      return 'rgba(205, 127, 50, 0.2)'
  }
})

const radarDimensions = computed(() =>
  props.stats.dimensions.map((dim) => ({
    label: dim.icon + dim.dimensionName.charAt(0),
    value: dim.score,
    maxValue: 99,
  })),
)

function progressColor(score: number): string {
  if (isLight.value) {
    if (score >= 80) return 'linear-gradient(90deg, #4caf50, #66bb6a)'
    if (score >= 60) return 'linear-gradient(90deg, #ff9800, #ffb74d)'
    return 'linear-gradient(90deg, #f44336, #ef5350)'
  }
  if (score >= 80) return 'linear-gradient(90deg, #FFD700, #FFA500)'
  if (score >= 60) return 'linear-gradient(90deg, #22c55e, #16a34a)'
  return 'linear-gradient(90deg, #3b82f6, #2563eb)'
}
</script>

<style scoped>
.fifa-card {
  position: relative;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid transparent;
  overflow: hidden;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rating-gold {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
}

.rating-silver {
  border-color: #c0c0c0;
  box-shadow: 0 0 15px rgba(192, 192, 192, 0.2);
}

.rating-bronze {
  border-color: #cd7f32;
  box-shadow: 0 0 10px rgba(205, 127, 50, 0.2);
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
    rgba(255, 255, 255, 0.05) 45%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 55%,
    transparent 60%
  );
  pointer-events: none;
  animation: foil-sweep 3s ease-in-out infinite;
}

@keyframes foil-sweep {
  0% {
    transform: translateX(-100%) translateY(-100%);
  }
  100% {
    transform: translateX(100%) translateY(100%);
  }
}

.card-top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.overall-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.rating-number {
  font-size: 48px;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  text-shadow: 0 0 20px currentColor;
}

.rating-label {
  font-size: 12px;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-name {
  font-size: 18px;
  font-weight: 700;
}

.player-points {
  font-size: 12px;
  color: #9ca3af;
}

.radar-wrap {
  display: flex;
  justify-content: center;
}

.dim-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dim-bar {
  display: flex;
  gap: 6px;
  font-size: 12px;
  align-items: center;
}

.dim-icon {
  width: 20px;
  text-align: center;
}

.dim-name {
  width: 36px;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease-out;
}

.dim-score {
  width: 24px;
  text-align: right;
  font-weight: 600;
  color: #d1d5db;
}

.card-stats {
  display: flex;
  gap: 12px;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 8px 12px;
}

.stat label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #9ca3af;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  margin-top: 2px;
}

.fifa-card.light {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
