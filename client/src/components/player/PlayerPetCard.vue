<template>
  <div class="player-pet-card" :class="`stage-${petStage}`">
    <div class="pet-stage-area">
      <template v-if="petImageUrl">
        <img :src="petImageUrl" alt="pet" class="pet-main-img" />
      </template>
      <template v-else>
        <span class="pet-emoji">{{ petEmoji }}</span>
      </template>
      <img
        v-for="acc in accessories"
        :key="acc.id"
        :src="acc.imageUrl"
        class="pet-accessory"
        :style="accStyle(acc)"
        alt="accessory"
      />
    </div>
    <div class="pet-meta">
      <span class="stage-badge">{{ stageLabel }}</span>
      <span class="level-text">Lv.{{ pet?.level ?? 1 }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AccessoryItem {
  id: string
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
    }
    equippedDecorations?: string[]
  } | null
  accessories?: AccessoryItem[]
}>()

const petStage = computed(() => props.pet?.stage || 'egg')

const petEmoji = computed(() => {
  if (!props.pet?.species?.stages) return '🥚'
  const stageData = props.pet.species.stages[props.pet.stage]
  return stageData?.emoji || '🥚'
})

const petImageUrl = computed(() => {
  if (!props.pet?.species?.stages) return null
  const stageData = props.pet.species.stages[props.pet.stage]
  return stageData?.imageUrl || null
})

const stageLabel = computed(() => {
  const map: Record<string, string> = { egg: '蛋', baby: '幼崽', teen: '成长', adult: '成熟', rare: '臻藏' }
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
.player-pet-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.pet-stage-area {
  width: 120px;
  height: 120px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
}

.pet-emoji {
  font-size: 72px;
  line-height: 1;
  animation: float-bob 3s ease-in-out infinite;
}

.pet-main-img {
  width: 96px;
  height: 96px;
  object-fit: contain;
  animation: float-bob 3s ease-in-out infinite;
}

.pet-accessory {
  position: absolute;
  width: 36px;
  height: 36px;
  object-fit: contain;
  pointer-events: none;
}

@keyframes float-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.pet-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stage-badge {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 12px;
  background: #f5f5f5;
  color: #666;
  font-weight: 600;
}

.level-text {
  font-size: 13px;
  color: #999;
  font-family: 'Russo One', sans-serif;
}

.stage-egg .pet-stage-area { border: 3px solid #e0e0e0; }
.stage-baby .pet-stage-area { border: 3px solid #81c784; }
.stage-teen .pet-stage-area { border: 3px solid #ffd54f; }
.stage-adult .pet-stage-area { border: 3px solid #ff8a65; }
.stage-rare .pet-stage-area { border: 3px solid #f06292; }
</style>
