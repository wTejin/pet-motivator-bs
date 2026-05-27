<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 flex flex-col px-4 py-6">
    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center text-white/60">加载中...</div>

    <!-- Error -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center text-red-400">{{ error }}</div>

    <!-- Main Content -->
    <div v-else-if="pet" class="flex-1 flex flex-col items-center max-w-md mx-auto w-full">
      <!-- Pet Display Area -->
      <div class="flex flex-col items-center mb-8 mt-4">
        <div class="text-8xl mb-4">{{ petEmoji }}</div>
        <h1 class="text-2xl font-bold text-white mb-1">{{ pet.name }}</h1>
        <span class="px-3 py-1 rounded-full bg-white/10 text-white/70 text-sm mb-2">
          {{ stageLabel(pet.stage) }}
        </span>
        <span class="text-white/40 text-sm">Lv.{{ pet.level }}</span>
      </div>

      <!-- Hunger & Mood Bars -->
      <div class="w-full space-y-3 mb-6">
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span class="text-white/60">饥饿度</span>
            <span class="text-white/60">{{ pet.hunger }}/100</span>
          </div>
          <div class="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="barColorClass(pet.hunger, 'orange')"
              :style="{ width: pet.hunger + '%' }"
            ></div>
          </div>
        </div>
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span class="text-white/60">心情值</span>
            <span class="text-white/60">{{ pet.mood }}/100</span>
          </div>
          <div class="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="barColorClass(pet.mood, 'pink')"
              :style="{ width: pet.mood + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Display Mode Warning -->
      <div v-if="isDisplayMode" class="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6 text-center">
        <p class="text-yellow-400 text-sm">教练已关闭操作权限</p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4 mb-8 w-full">
        <button
          :disabled="isDisplayMode"
          class="flex-1 py-4 bg-green-600 hover:bg-green-500 disabled:bg-green-600/30 disabled:text-white/30 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          @click="handleFeed"
        >
          <span>🍖</span> 喂食
        </button>
        <button
          :disabled="isDisplayMode"
          class="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 disabled:text-white/30 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          @click="handlePlay"
        >
          <span>⚽</span> 玩耍
        </button>
      </div>

      <!-- Current Points -->
      <div class="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-4 text-center">
        <span class="text-white/50 text-sm">当前积分</span>
        <div class="text-3xl font-bold text-yellow-400">{{ currentPoints }}</div>
      </div>

      <!-- Shop Link -->
      <router-link
        :to="`/player/${playerId}/shop`"
        class="w-full py-3 bg-white/10 border border-white/10 text-white rounded-xl text-center hover:bg-white/20 transition-colors"
      >
        🛒 商店
      </router-link>

      <!-- Status messages -->
      <div v-if="actionMessage" class="mt-4 text-sm text-green-400 text-center">{{ actionMessage }}</div>
      <div v-if="actionError" class="mt-4 text-sm text-red-400 text-center">{{ actionError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { playerApi } from '@/api'

const route = useRoute()
const playerId = route.params.playerId as string

interface PetData {
  name: string
  stage: string
  level: number
  carePoints: number
  hunger: number
  mood: number
  speciesId: string
  species: any
}

const pet = ref<PetData | null>(null)
const isDisplayMode = ref(false)
const currentPoints = ref(0)
const loading = ref(true)
const error = ref('')
const actionMessage = ref('')
const actionError = ref('')

const petEmoji = computed(() => {
  if (!pet.value?.species?.stages) return '🥚'
  const stageData = pet.value.species.stages[pet.value.stage]
  return stageData?.emoji || '🥚'
})

onMounted(async () => {
  try {
    const [petRes, modeRes] = await Promise.all([
      playerApi.getPet(playerId),
      playerApi.getMode(playerId),
    ])
    pet.value = petRes.data.data
    isDisplayMode.value = modeRes.data.data?.playerMode === 'display'
    currentPoints.value = 0
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
})

function stageLabel(stage: string): string {
  const map: Record<string, string> = { egg: '蛋', baby: '幼崽', teen: '青少年', adult: '成年', rare: '稀有' }
  return map[stage] || stage
}

function barColorClass(value: number, base: string): string {
  if (value > 60) return base === 'orange' ? 'bg-orange-400' : 'bg-pink-400'
  if (value > 30) return base === 'orange' ? 'bg-yellow-400' : 'bg-rose-400'
  return 'bg-red-500'
}

async function handleFeed() {
  actionMessage.value = ''
  actionError.value = ''
  try {
    const res = await playerApi.feed(playerId)
    const data = res.data.data
    if (pet.value) {
      pet.value.hunger = data.hunger
      pet.value.carePoints = data.carePoints
      pet.value.stage = data.stage
    }
    currentPoints.value = data.currentPoints
    if (data.evolved) {
      actionMessage.value = '宠物进化了！'
    } else {
      actionMessage.value = '喂食成功！'
    }
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '喂食失败'
  }
}

async function handlePlay() {
  actionMessage.value = ''
  actionError.value = ''
  try {
    const res = await playerApi.play(playerId)
    const data = res.data.data
    if (pet.value) {
      pet.value.mood = data.mood
      pet.value.carePoints = data.carePoints
      pet.value.stage = data.stage
    }
    currentPoints.value = data.currentPoints
    if (data.evolved) {
      actionMessage.value = '宠物进化了！'
    } else {
      actionMessage.value = '玩耍成功！'
    }
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '玩耍失败'
  }
}
</script>
