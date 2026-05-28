<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold" style="font-family: var(--font-display)">仪表盘</h2>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-white/60 py-8">
      <div class="skeleton h-24 w-full mb-4"></div>
      <div class="skeleton h-48 w-full"></div>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-card p-5 text-center">
          <span class="text-3xl">👥</span>
          <div class="text-2xl font-bold mt-2" style="font-family: var(--font-num)">{{ stats.playerCount }}</div>
          <div class="text-xs text-white/50 mt-1">活跃球员</div>
        </div>
        <div class="glass-card p-5 text-center">
          <span class="text-3xl">🐾</span>
          <div class="text-2xl font-bold mt-2" style="font-family: var(--font-num)">{{ stats.petCount }}</div>
          <div class="text-xs text-white/50 mt-1">已领养宠物</div>
        </div>
        <div class="glass-card p-5 text-center">
          <span class="text-3xl">⭐</span>
          <div class="text-2xl font-bold mt-2 text-[#FFD700]" style="font-family: var(--font-num)">{{ stats.todayScores }}</div>
          <div class="text-xs text-white/50 mt-1">今日记分</div>
        </div>
        <div class="glass-card p-5 text-center">
          <span class="text-3xl">📋</span>
          <div class="text-2xl font-bold mt-2" style="font-family: var(--font-num)">{{ stats.totalScores }}</div>
          <div class="text-xs text-white/50 mt-1">累计记分</div>
        </div>
      </div>

      <!-- Recent Score Records -->
      <div class="glass-card overflow-hidden">
        <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 class="text-sm font-bold text-white/70">📋 最近积分变动</h3>
          <router-link to="/coach/score" class="text-xs text-blue-400 font-bold hover:text-blue-300">全部 ›</router-link>
        </div>
        <div v-if="recentRecords.length === 0" class="px-4 py-8 text-center text-sm text-white/40">
          暂无积分记录
        </div>
        <div v-else class="divide-y divide-white/5">
          <div
            v-for="rec in recentRecords"
            :key="rec.id"
            class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <span class="text-xl shrink-0">{{ rec.icon || '⭐' }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ rec.reason }}</div>
              <div class="text-xs text-white/40">{{ rec.playerName }} · {{ rec.time }}</div>
            </div>
            <span
              class="text-base font-bold shrink-0"
              style="font-family: var(--font-num)"
              :class="rec.points >= 0 ? 'text-green-400' : 'text-red-400'"
            >
              {{ rec.points >= 0 ? `+${rec.points}` : rec.points }}
            </span>
          </div>
        </div>
      </div>

      <!-- Mode Info -->
      <div class="glass-card p-4 text-center">
        <p class="text-sm text-white/50">
          当前模式：
          <span :class="auth.playerMode === 'open' ? 'text-green-400' : 'text-yellow-400'" class="font-semibold">
            {{ auth.playerMode === 'open' ? '开放模式 — 学生可自由操作' : '展示模式 — 学生仅可查看' }}
          </span>
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { coachApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

interface RecordItem {
  id: string
  reason: string
  points: number
  playerName: string
  icon: string
  time: string
}

const stats = ref({ playerCount: 0, petCount: 0, todayScores: 0, totalScores: 0 })
const recentRecords = ref<RecordItem[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [pRes] = await Promise.all([
      coachApi.getPlayers(),
      coachApi.getDimensions(),
    ])
    const players = pRes.data.data || []
    stats.value.playerCount = players.filter((p: any) => p.isActive !== false).length
    // Build recent records from players and score data
    const recs: RecordItem[] = []
    for (const p of players.slice(0, 5)) {
      if (p.recentScores && p.recentScores.length > 0) {
        for (const s of p.recentScores.slice(0, 3)) {
          recs.push({
            id: s.id || `${p.id}-${recs.length}`,
            reason: s.reason || '记分',
            points: s.points || 0,
            playerName: p.name,
            icon: s.icon || '⭐',
            time: s.createdAt ? new Date(s.createdAt).toLocaleString('zh-CN') : '',
          })
        }
      }
    }
    recentRecords.value = recs.slice(0, 10)
    stats.value.totalScores = recs.length
  } catch (e) {
    console.error('Failed to load dashboard', e)
  } finally {
    loading.value = false
  }
})
</script>
