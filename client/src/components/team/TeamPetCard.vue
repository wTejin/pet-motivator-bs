<template>
  <div
    class="team-pet-card"
    :class="[`stage-${petStage}`, { disabled: clickable === false }]"
    @click="clickable !== false && $emit('click')"
  >
    <!-- 背景铺满卡片上半部分 -->
    <div v-if="backgroundUrl || backgroundCss" class="pet-bg" :style="bgStyle"></div>

    <!-- 宠物展示区 -->
    <div class="pet-stage-area">
      <template v-if="petImageUrl">
        <img :src="petImageUrl" alt="pet" class="pet-main-img" />
      </template>
      <template v-else>
        <span class="pet-emoji">{{ petEmoji }}</span>
      </template>
      <!-- 配饰叠加 -->
      <template v-for="acc in accessories" :key="acc.id">
        <img
          v-if="acc.imageUrl"
          :src="acc.imageUrl"
          class="pet-accessory"
          :style="accStyle(acc)"
          alt="accessory"
        />
        <span
          v-else
          class="pet-accessory-emoji"
          :style="accStyle(acc)"
        >{{ acc.emoji || '✨' }}</span>
      </template>
    </div>

    <!-- 信息区 -->
    <div class="pet-info">
      <div class="pet-name-row">
        <div class="pet-name">{{ playerName }}</div>
        <img
          v-if="isImageAvatar(avatar) && !brokenImages.has(avatar)"
          :src="avatar"
          class="pet-avatar-img"
          alt="avatar"
          @error="onImgError(avatar)"
        />
        <span v-else class="pet-avatar">{{ avatar || '😊' }}</span>
      </div>
      <div v-if="pet" class="pet-meta-row">
        <span class="level-text">Lv.{{ pet.level }}</span>
        <span class="points-line">
          <span class="points-value">{{ currentPoints }}</span>
          <span class="points-star">⭐</span>
        </span>
      </div>
      <div v-else class="pet-meta-row">
        <span class="stage-badge no-pet">点击选择宠物</span>
      </div>
    </div>

    <!-- 积分飘字动画 -->
    <Transition name="float">
      <div v-if="floatingPoints" class="float-points">+{{ floatingPoints }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { brokenImages, onImgError } from '@/composables/useBrokenImages'

interface AccessoryItem {
  id: string
  emoji?: string
  imageUrl: string
  position: {
    top: string
    left: string
    scale: number
  }
}

const props = defineProps<{
  playerId: string
  playerName: string
  avatar: string
  currentPoints: number
  pet: {
    name: string
    stage: string
    level: number
    speciesId: string
    species?: {
      stages: Record<string, {
        emoji: string
        imageUrl?: string
      }>
    }
    equippedDecorations?: string[]
  } | null
  accessories?: AccessoryItem[]
  floatingPoints?: number
  clickable?: boolean
  backgroundUrl?: string
  backgroundCss?: string
}>()

const bgStyle = computed(() => {
  if (props.backgroundUrl) {
    return { backgroundImage: `url(${props.backgroundUrl})` }
  }
  if (props.backgroundCss) {
    return { background: props.backgroundCss }
  }
  return {}
})

defineEmits<{
  click: []
}>()

const petStage = computed(() => props.pet?.stage || 'egg')

const OLD_STAGE_MAP: Record<string, string> = {
  level1: 'baby',
  level2: 'teen',
  level3: 'adult',
}

function getStageInfo() {
  if (!props.pet?.species?.stages) return null
  const stages = props.pet.species.stages
  return stages[props.pet.stage] ?? stages[OLD_STAGE_MAP[props.pet.stage]] ?? null
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
  if (!props.pet) return '🥚'
  const info = getStageInfo()
  if (info?.emoji) return info.emoji
  return DEFAULT_STAGE_EMOJI[petStage.value] || props.avatar || '🥚'
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

function isImageAvatar(avatar: string): boolean {
  return avatar?.startsWith('/') ?? false
}
</script>

<style scoped>
.team-pet-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.team-pet-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

/* 阶段边框色 */
.stage-egg { border: 2px solid #e0e0e0; }
.stage-baby { border: 2px solid #81c784; }
.stage-teen { border: 2px solid #ffd54f; }
.stage-adult { border: 2px solid #ff8a65; }
.stage-level1 { border: 2px solid #81c784; }
.stage-level2 { border: 2px solid #ffd54f; }
.stage-level3 { border: 2px solid #ff8a65; }
.stage-rare { border: 2px solid #f06292; }

.pet-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60%;
  background-size: cover;
  background-position: center;
  opacity: 0.4;
  z-index: 0;
  border-radius: 16px 16px 50% 50%;
  mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
}

.pet-stage-area {
  width: 110px;
  height: 110px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 12px;
  z-index: 1;
}

.pet-emoji {
  font-size: 68px;
  line-height: 1;
  animation: float-bob 3s ease-in-out infinite;
  position: relative;
  z-index: 1;
}

.pet-main-img {
  width: 88px;
  height: 88px;
  object-fit: contain;
  animation: float-bob 3s ease-in-out infinite;
  position: relative;
  z-index: 1;
}

.pet-accessory {
  position: absolute;
  width: 38px;
  height: 38px;
  object-fit: contain;
  pointer-events: none;
  z-index: 2;
}

.pet-accessory-emoji {
  position: absolute;
  font-size: 28px;
  line-height: 1;
  pointer-events: none;
  z-index: 2;
}

@keyframes float-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.pet-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.pet-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
}

.pet-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pet-avatar {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.pet-avatar-img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.pet-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stage-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #666;
}

.stage-badge.no-pet {
  background: #fff3e0;
  color: #ff9800;
}

.level-text {
  font-size: 13px;
  color: #666;
  font-family: 'Russo One', sans-serif;
}

.points-line {
  display: flex;
  align-items: center;
  gap: 4px;
}

.points-value {
  font-size: 18px;
  font-weight: 700;
  color: #ff9800;
  font-family: 'Russo One', sans-serif;
}

.points-star {
  font-size: 14px;
}

/* 积分飘字 */
.float-points {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20px;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  pointer-events: none;
}

.float-enter-active {
  animation: float-up 2s ease-out forwards;
}

.float-leave-active {
  opacity: 0;
  transition: opacity 0.3s;
}

@keyframes float-up {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
}

.team-pet-card.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
.team-pet-card.disabled:hover {
  transform: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
