<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 flex flex-col items-center justify-center px-4 py-8">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-white mb-2">星宠契约</h1>
      <p class="text-purple-300 text-lg">点击你的宠物卡片进入</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-white/60">加载中...</div>

    <!-- Error -->
    <div v-else-if="error" class="text-red-400 text-center">
      <p>{{ error }}</p>
      <p class="text-sm text-white/40 mt-2">请确认链接是否正确</p>
    </div>

    <!-- Player Grid -->
    <div v-else class="w-full max-w-4xl">
      <div v-if="players.length === 0" class="text-center text-white/40 py-8">该教练暂无活跃球员</div>
      <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div
          v-for="player in players"
          :key="player.id"
          class="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 hover:-translate-y-1 transition-all flex flex-col items-center gap-2"
          @click="selectPlayer(player.id)"
        >
          <span class="text-4xl">{{ player.avatar || '🥚' }}</span>
          <span class="font-semibold text-white text-sm">{{ player.name }}</span>
          <span
            v-if="player.pet"
            class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70"
          >
            {{ stageLabel(player.pet.stage) }}
          </span>
          <span
            v-if="player.pet"
            class="text-xs text-white/40"
          >
            Lv.{{ player.pet.level }}
          </span>
          <span class="text-yellow-400 text-sm font-semibold">{{ player.currentPoints }} 分</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api'

const router = useRouter()
const route = useRoute()

interface PlayerInfo {
  id: string
  name: string
  avatar: string
  currentPoints: number
  pet: {
    stage: string
    level: number
    speciesId: string
    hunger: number
    mood: number
  } | null
}

const players = ref<PlayerInfo[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  const phone = route.query.c as string
  if (!phone) {
    error.value = '缺少教练手机号参数'
    loading.value = false
    return
  }
  try {
    const res = await api.get(`/public/players/${phone}`)
    if (res.data.success) {
      players.value = res.data.data || []
    } else {
      error.value = res.data.error || '加载失败'
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || '无法连接到服务器'
  } finally {
    loading.value = false
  }
})

function stageLabel(stage: string): string {
  const map: Record<string, string> = { egg: '蛋', baby: '幼崽', teen: '青少年', adult: '成年', rare: '稀有' }
  return map[stage] || stage
}

function selectPlayer(id: string) {
  router.push(`/player/${id}`)
}
</script>
