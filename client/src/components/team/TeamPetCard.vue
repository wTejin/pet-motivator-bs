<template>
  <div class="team-pet-card" :class="`stage-${petStage}`" @click="$emit('click')">
    <!-- 宠物展示区 -->
    <div class="pet-stage-area">
      <template v-if="petImageUrl">
        <img :src="petImageUrl" alt="pet" class="pet-main-img" />
      </template>
      <template v-else>
        <span class="pet-emoji">{{ petEmoji }}</span>
      </template>
      <!-- 配饰叠加 -->
      <img
        v-for="acc in accessories"
        :key="acc.id"
        :src="acc.imageUrl"
        class="pet-accessory"
        :style="accStyle(acc)"
        alt="accessory"
      />
    </div>

    <!-- 信息区 -->
    <div class="pet-info">
      <div class="pet-name">{{ playerName }}</div>
      <div v-if="pet" class="pet-meta">
        <span class="stage-badge">{{ stageLabel }}</span>
        <span class="level-text">Lv.{{ pet.level }}</span>
      </div>
      <div class="points-line">
        <span class="points-value">{{ currentPoints }}</span>
        <span class="points-star">⭐</span>
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

interface AccessoryItem {
  id: string
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
}>()

defineEmits<{
  click: []
}>()

const petStage = computed(() => props.pet?.stage || 'egg')

const petEmoji = computed(() => {
  if (!props.pet?.species?.stages) return props.avatar || '🥚'
  const stageData = props.pet.species.stages[props.pet.stage]
  return stageData?.emoji || props.avatar || '🥚'
})

const petImageUrl = computed(() => {
  if (!props.pet?.species?.stages) return null
  const stageData = props.pet.species.stages[props.pet.stage]
  return stageData?.imageUrl || null
})

const stageLabel = computed(() => {
  const map: Record<string, string> = {
    egg: '蛋', baby: '幼崽', teen: '青少年', adult: '成年', rare: '稀有'
  }
  return map[petStage.value] || petStage.value
})

function accStyle(acc: AccessoryItem) {
  return {
    top: acc.position.top,
    left: acc.position.left,
    transform: `translate(-50%, -50%) scale(${acc.position.scale ?? 1})`,
  }
}
</script>

<style scoped>
.team-pet-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
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
.stage-rare { border: 2px solid #f06292; }

.pet-stage-area {
  width: 80px;
  height: 80px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-emoji {
  font-size: 48px;
  line-height: 1;
  animation: float-bob 3s ease-in-out infinite;
}

.pet-main-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  animation: float-bob 3s ease-in-out infinite;
}

.pet-accessory {
  position: absolute;
  width: 28px;
  height: 28px;
  object-fit: contain;
  pointer-events: none;
}

@keyframes float-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.pet-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.pet-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.pet-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.stage-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #666;
}

.level-text {
  font-size: 11px;
  color: #999;
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
</style>
