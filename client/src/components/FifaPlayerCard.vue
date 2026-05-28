<template>
  <div class="fifa-card" :class="[`rating-${ratingTier}`, { 'on-light': isLight }]" :style="{ borderColor: accentColor }">
    <div class="foil-shine"></div>

    <div class="card-body">
      <!-- Left: Rating + Avatar -->
      <div class="card-left">
        <div class="overall-rating" :style="{ color: accentColor }">
          <span class="rating-number">{{ stats.overall }}</span>
          <span class="rating-label">综合</span>
        </div>
        <div class="player-avatar">{{ stats.avatar }}</div>
        <div class="player-name">{{ stats.playerName }}</div>
      </div>

      <!-- Center: Radar + Dimensions -->
      <div class="card-center">
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

        <div class="dim-list">
          <div v-for="dim in stats.dimensions" :key="dim.dimensionId" class="dim-row">
            <span class="dim-name">{{ dim.icon }} {{ dim.dimensionName }}</span>
            <div class="dim-bar">
              <div
                class="dim-bar-fill"
                :style="{ width: (dim.score / 99) * 100 + '%', background: scoreColor(dim.score) }"
              ></div>
            </div>
            <span class="dim-score" :style="{ color: scoreColor(dim.score) }">{{ dim.score }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Stats -->
    <div class="card-footer">
      <div class="stat-pill">
        <span class="stat-label">今日</span>
        <span class="stat-value" :style="{ color: accentColor }">+{{ stats.todayPoints }}</span>
      </div>
      <div class="stat-pill">
        <span class="stat-label">周排名</span>
        <span class="stat-value">#{{ stats.rank }}</span>
      </div>
      <div class="stat-pill">
        <span class="stat-label">积分</span>
        <span class="stat-value">{{ stats.totalPoints }}⭐</span>
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

.card-body {
  display: flex;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.card-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 80px;
  flex-shrink: 0;
}

.overall-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.rating-number {
  font-size: 56px;
  font-weight: 900;
  font-family: 'Russo One', 'JetBrains Mono', monospace;
  text-shadow: 0 0 20px currentColor;
}

.rating-label {
  font-size: 12px;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 4px;
}

.player-avatar {
  font-size: 48px;
  line-height: 1;
  margin-top: 4px;
}

.player-name {
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  word-break: break-all;
}

.card-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radar-wrap {
  display: flex;
  justify-content: center;
}

.dim-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dim-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.dim-name {
  width: 70px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dim-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.dim-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease-out;
}

.dim-score {
  width: 28px;
  text-align: right;
  font-weight: 700;
  flex-shrink: 0;
}

.card-footer {
  display: flex;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.stat-pill {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 6px 8px;
  gap: 2px;
}

.stat-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
}
</style>
