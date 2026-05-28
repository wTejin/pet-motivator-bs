<template>
  <div class="fifa-card" :class="[`rating-${ratingTier}`, { 'on-light': isLight }]" :style="{ borderColor: accentColor }">
    <div class="foil-shine"></div>

    <div class="card-header">
      <div class="header-name">{{ stats.playerName }}</div>
      <div class="header-meta">
        <span v-if="stats.age != null" class="meta-age">{{ stats.age }}岁</span>
        <span class="meta-overall" :style="{ color: accentColor }">{{ stats.overall }}</span>
      </div>
    </div>

    <div class="card-main">
      <!-- Left column: photo frame + radar -->
      <div class="card-left">
        <div class="photo-frame" :style="{ background: frameGradient }">
          <div class="frame-inner">
            <img
              v-if="isImageAvatar(stats.avatar)"
              :src="stats.avatar"
              class="player-avatar-img"
              alt="avatar"
            />
            <div v-else class="player-avatar">{{ stats.avatar }}</div>
          </div>
          <div class="frame-stud top"></div>
          <div class="frame-stud bottom"></div>
          <div class="frame-shine"></div>
        </div>
        <div class="radar-wrap">
          <RadarChart
            :dimensions="radarDimensions"
            :size="130"
            :color="accentColor"
            :fill-color="accentFillColor"
            grid-color="rgba(255,255,255,0.08)"
            label-color="rgba(255,255,255,0.5)"
          />
        </div>
      </div>

      <!-- Right column: 3x2 dimension grid with indicators -->
      <div class="card-right">
        <div class="dimensions-grid">
          <div
            v-for="dim in stats.dimensions"
            :key="dim.dimensionId"
            class="dimension-block"
          >
            <div class="dimension-header">
              <span class="dim-icon">{{ dim.icon }}</span>
              <span class="dim-name">{{ dim.dimensionName }}</span>
              <span class="dim-score" :style="{ color: scoreColor(dim.score) }">{{ dim.score }}</span>
            </div>
            <div class="indicators-list">
              <div
                v-for="ind in dim.indicators"
                :key="ind.indicatorId"
                class="indicator-row"
              >
                <span class="indicator-name">{{ ind.indicatorName }}</span>
                <span class="indicator-score">{{ ind.score }}</span>
              </div>
            </div>
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

const frameGradient = computed(() => {
  switch (ratingTier.value) {
    case 'gold': return 'linear-gradient(145deg, #ffd700, #b8860b, #daa520)'
    case 'silver': return 'linear-gradient(145deg, #e8e8e8, #a0a0a0, #d0d0d0)'
    case 'bronze': return 'linear-gradient(145deg, #cd7f32, #8b4513, #d2691e)'
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

function isImageAvatar(avatar: string): boolean {
  return avatar.startsWith('/')
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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.header-name {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.meta-age {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 10px;
}

.meta-overall {
  font-family: 'Russo One', sans-serif;
  font-size: 22px;
  line-height: 1;
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
  width: 150px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  height: 100%;
}

.photo-frame {
  flex: 1;
  width: 100%;
  min-height: 0;
  max-width: 140px;
  position: relative;
  clip-path: polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%);
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 10px v-bind(accentFillColor));
}

/* 内框 */
.frame-inner {
  width: 86%;
  height: 86%;
  background: linear-gradient(180deg, #252545 0%, #151530 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

/* 铆钉装饰 */
.frame-stud {
  position: absolute;
  width: 7px;
  height: 7px;
  background: radial-gradient(circle at 30% 30%, #fff 0%, v-bind(accentColor) 40%, #000 100%);
  border-radius: 50%;
  box-shadow: 0 0 5px v-bind(accentColor);
  z-index: 3;
  pointer-events: none;
}
.frame-stud.top {
  top: 3%;
  left: 50%;
  transform: translateX(-50%);
}
.frame-stud.bottom {
  bottom: 3%;
  left: 50%;
  transform: translateX(-50%);
}

/* 相框高光 */
.frame-shine {
  position: absolute;
  inset: 0;
  clip-path: polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.25) 0%,
    transparent 35%,
    transparent 65%,
    rgba(255, 255, 255, 0.08) 100%
  );
  pointer-events: none;
  z-index: 2;
}

.player-avatar {
  font-size: 64px;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.player-avatar-img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.radar-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.dimension-block {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.dimension-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 3px;
}

.dim-icon {
  font-size: 11px;
}

.dim-name {
  flex: 1;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dim-score {
  font-family: 'Russo One', sans-serif;
  font-size: 13px;
}

.indicators-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.indicator-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
}

.indicator-name {
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}

.indicator-score {
  font-family: 'Russo One', sans-serif;
  color: rgba(255, 255, 255, 0.75);
  flex-shrink: 0;
}
</style>
