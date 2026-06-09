<template>
  <div class="player-pet-card" :class="[`stage-${petStage}`, ...(effects || [])]">
    <!-- 背景铺满卡片上半部分 -->
    <div v-if="backgroundUrl || backgroundCss || backgroundClass" class="pet-bg" :class="backgroundClass" :style="bgStyle"></div>
    <div class="level-badge" :class="{ 'gold-badge': hasEffect('gold-badge') }">
      Lv.{{ pet?.level ?? 1 }}
    </div>
    <div class="pet-stage-area">
      <div v-if="hasEffect('aura')" class="effect-aura"></div>
      <template v-if="petImageUrl">
        <img v-if="!brokenImages.has(petImageUrl)" :src="petImageUrl" alt="pet" class="pet-main-img" @error="onImgError(petImageUrl)" />
      </template>
      <template v-else>
        <span class="pet-emoji">{{ petEmoji }}</span>
      </template>
      <template v-for="acc in accessories" :key="acc.id">
        <img
          v-if="acc.imageUrl && !brokenImages.has(acc.imageUrl)"
          :src="acc.imageUrl"
          class="pet-accessory"
          :style="accStyle(acc)"
          alt="accessory"
          @error="onImgError(acc.imageUrl)"
        />
        <span
          v-else
          class="pet-accessory-emoji"
          :style="accStyle(acc)"
        >{{ acc.emoji || '✨' }}</span>
      </template>
    </div>
    <div v-if="hasEffect('gold-skin')" class="effect-glow"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { brokenImages, onImgError } from '@/composables/useBrokenImages'

interface AccessoryItem {
  id: string
  emoji?: string
  imageUrl: string
  position: { top: string; left: string; scale: number }
}

const props = defineProps<{
  pet: {
    name: string
    stage: string
    level: number
    speciesId: string
    species?: {
      stages: Record<string, { emoji: string; imageUrl?: string }>
    } | null
    equippedDecorations?: string[]
    currentSkin?: string
  } | null
  accessories?: AccessoryItem[]
  effects?: string[]
  backgroundUrl?: string
  backgroundCss?: string
  backgroundClass?: string
}>()

const petStage = computed(() => props.pet?.stage || 'egg')

const bgStyle = computed(() => {
  if (props.backgroundUrl) {
    return { backgroundImage: `url(${props.backgroundUrl})` }
  }
  if (props.backgroundCss) {
    return { background: props.backgroundCss }
  }
  return {}
})

const OLD_STAGE_MAP: Record<string, string> = {
  level1: 'baby',
  level2: 'teen',
  level3: 'adult',
}

function getStageInfo() {
  const stages = props.pet?.species?.stages
  if (!stages) return null
  const key = props.pet!.stage
  return stages[key] ?? stages[OLD_STAGE_MAP[key]] ?? null
}

const DEFAULT_STAGE_EMOJI: Record<string, string> = {
  egg: '🥚',
  level1: '🐣',
  level2: '🐥',
  level3: '🐤',
  rare: '✨',
  baby: '🐣',
  teen: '🐥',
  adult: '🦁',
}

const petEmoji = computed(() => {
  const info = getStageInfo()
  if (info?.emoji) return info.emoji
  return DEFAULT_STAGE_EMOJI[petStage.value] || '🥚'
})

const petImageUrl = computed(() => {
  return getStageInfo()?.imageUrl || null
})

function accStyle(acc: AccessoryItem) {
  return {
    top: acc.position.top,
    left: acc.position.left,
    transform: `translate(-50%, -50%) scale(${acc.position.scale ?? 1})`,
  }
}

function hasEffect(name: string): boolean {
  return (props.effects || []).includes(name)
}
</script>

<style scoped>
.player-pet-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.pet-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 72%;
  background-size: cover;
  background-position: center;
  z-index: 0;
  border-radius: 16px 16px 40% 40%;
}

.pet-stage-area {
  width: 180px;
  height: 216px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 1;
  transform: scale(1.2);
  transform-origin: center center;
}

.pet-emoji {
  font-size: 116px;
  line-height: 1;
  animation: float-bob 3s ease-in-out infinite;
  position: relative;
  z-index: 1;
}

.pet-main-img {
  width: 156px;
  height: 156px;
  object-fit: contain;
  animation: float-bob 3s ease-in-out infinite;
  position: relative;
  z-index: 1;
}

.pet-accessory {
  position: absolute;
  width: 53px;
  height: 53px;
  object-fit: contain;
  pointer-events: none;
  z-index: 2;
}

.pet-accessory-emoji {
  position: absolute;
  font-size: 40px;
  line-height: 1;
  pointer-events: none;
  z-index: 2;
}

@keyframes float-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.level-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  border-radius: 8px;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 12px;
  font-weight: 700;
  font-family: 'Russo One', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(30, 136, 229, 0.3);
  z-index: 3;
}

/* 特效：光环 */
.effect-aura {
  position: absolute;
  inset: -6px;
  border-radius: 24px;
  border: 2px solid rgba(255, 171, 64, 0.5);
  animation: aura-pulse 2s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes aura-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.04); opacity: 1; }
}

/* 特效：金色徽章 */
.gold-badge {
  background: linear-gradient(135deg, #ffd700, #ffaa00) !important;
  box-shadow: 0 2px 10px rgba(255, 215, 0, 0.5) !important;
}

/* 特效：黄金发光 */
.effect-glow {
  position: absolute;
  inset: -10px;
  border-radius: 24px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.12) 0%, transparent 70%);
  pointer-events: none;
  animation: glow-breathe 3s ease-in-out infinite;
}

@keyframes glow-breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ── 背景皮肤 CSS 类 ── */

/* 马戏团舞台 — 红白条纹 + 金色聚光灯 */
.lucky-circus {
  background: linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #8b0000 50%, #2d1b4e 70%, #1a0a2e 100%);
  background-size: 200% 200%;
  animation: circus-shift 8s ease-in-out infinite;
}
@keyframes circus-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* 海底世界 — 深海蓝渐变 + 波纹感 */
.lucky-underwater {
  background: linear-gradient(180deg, #0c4a6e 0%, #0369a1 25%, #0e7490 50%, #155e75 75%, #0c4a6e 100%);
  background-size: 100% 200%;
  animation: underwater-wave 6s ease-in-out infinite;
}
@keyframes underwater-wave {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 0% 100%; }
}

/* 梦幻城堡 — 紫色晚霞渐变 */
.lucky-castle {
  background: linear-gradient(180deg, #1e1b4b 0%, #5b21b6 30%, #a855f7 60%, #f9a8d4 85%, #fbbf24 100%);
  background-size: 100% 200%;
  animation: castle-twilight 10s ease-in-out infinite;
}
@keyframes castle-twilight {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 0% 100%; }
}

/* 星空 — 深空渐变 + 星光感 */
.bg-starry {
  background: linear-gradient(180deg, #0f0c29 0%, #1a1a3e 30%, #24243e 60%, #0f0c29 100%);
}

/* 森林 — 绿意渐变 */
.bg-forest {
  background: linear-gradient(180deg, #064e3b 0%, #065f46 30%, #047857 60%, #064e3b 100%);
}
</style>
