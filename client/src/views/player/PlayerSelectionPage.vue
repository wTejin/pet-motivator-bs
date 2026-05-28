<template>
  <div class="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center px-4 py-8">
    <div class="text-center mb-8">
      <div class="text-6xl mb-4">⚽</div>
      <h1 class="text-3xl font-bold text-white mb-2" style="font-family: var(--font-display)">星宠契约</h1>
      <p class="text-white/50 text-lg">点击你的宠物卡片进入</p>
      <router-link
        v-if="phone"
        :to="`/screen?c=${phone}`"
        class="inline-block mt-3 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-sm hover:bg-blue-500/30 transition-colors"
      >
        👀 查看全班大屏
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-white/60">
      <div class="skeleton h-20 w-48"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="glass-card p-8 text-center max-w-md">
      <span class="text-5xl block mb-4">😕</span>
      <p class="text-red-400 mb-2">{{ error }}</p>
      <p class="text-sm text-white/40">请确认链接是否正确</p>
    </div>

    <!-- Player Grid -->
    <div v-else class="w-full max-w-4xl">
      <div v-if="players.length === 0" class="text-center text-white/40 py-8 glass-card">
        <span class="text-5xl block mb-4">📭</span>
        <p>该教练暂无活跃球员</p>
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div
          v-for="player in players"
          :key="player.id"
          class="glass-card p-4 cursor-pointer hover:bg-white/10 hover:-translate-y-1 transition-all flex flex-col items-center gap-2 pet-card-glow"
          @click="selectPlayer(player.id)"
        >
          <img
            v-if="isImageAvatar(player.avatar)"
            :src="player.avatar"
            class="w-10 h-10 object-contain"
            alt="avatar"
          />
          <span v-else class="text-4xl">{{ player.avatar || '🥚' }}</span>
          <span class="font-semibold text-white text-sm">{{ player.name }}</span>
          <span
            v-if="player.pet"
            class="text-xs px-2 py-0.5 rounded-full"
            :style="{ background: stageColor(player.pet.stage) + '20', color: stageColor(player.pet.stage) }"
          >
            {{ stageLabel(player.pet.stage) }}
          </span>
          <span
            v-if="player.pet"
            class="text-xs text-white/40"
            style="font-family: var(--font-num)"
          >
            Lv.{{ player.pet.level }}
          </span>
          <span class="text-[#FFD700] text-sm font-semibold" style="font-family: var(--font-num)">
            {{ player.currentPoints }} 分
          </span>
        </div>
      </div>
    </div>

    <!-- Coach Login Link -->
    <div class="mt-8">
      <router-link
        to="/login"
        class="text-white/25 text-sm hover:text-white/50 transition-colors"
      >
        教练管理入口
      </router-link>
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
const phone = route.query.c as string

onMounted(async () => {
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

function isImageAvatar(avatar: string): boolean {
  return avatar?.startsWith('/') ?? false
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = { egg: '蛋', baby: '幼崽', teen: '青少年', adult: '成年', rare: '稀有' }
  return map[stage] || stage
}

function stageColor(stage: string): string {
  const map: Record<string, string> = {
    egg: '#ffffff',
    baby: '#39FF14',
    teen: '#FFD700',
    adult: '#FF4500',
    rare: '#FF69B4',
  }
  return map[stage] || '#ffffff'
}

function selectPlayer(id: string) {
  router.push(`/player/${id}`)
}
</script>
