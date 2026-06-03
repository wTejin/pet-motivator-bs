<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold text-white">仪表盘</h1>

    <!-- Biometrics Alerts -->
    <div v-if="alerts.length > 0" class="glass-card p-4 border-l-4 border-red-500">
      <h2 class="text-sm font-semibold text-red-400 mb-2">⚠️ 体测过期提醒</h2>
      <div v-for="a in alerts" :key="a.playerId" class="flex items-center justify-between py-1.5 text-sm">
        <span class="text-white">{{ a.playerName }}</span>
        <span class="text-red-400">
          {{ a.lastMeasuredAt ? `${a.daysSince} 天未录入` : '从未录入' }}
        </span>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="glass-card p-4">
        <div class="text-3xl font-bold text-emerald-400">{{ players.length }}</div>
        <div class="text-sm text-slate-400 mt-1">球员总数</div>
      </div>
      <div class="glass-card p-4">
        <div class="text-3xl font-bold text-blue-400">{{ recentSummary.length }}</div>
        <div class="text-sm text-slate-400 mt-1">近 7 天已评分球员</div>
      </div>
      <div class="glass-card p-4">
        <div class="text-3xl font-bold text-amber-400">{{ pendingPlayers.length }}</div>
        <div class="text-sm text-slate-400 mt-1">今日未评分球员</div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div v-if="recentSummary.length > 0" class="glass-card p-4">
      <h2 class="text-sm font-semibold text-white mb-3">最近评分活动</h2>
      <div class="space-y-2">
        <div v-for="item in recentSummary" :key="item.playerId" class="flex items-center justify-between text-sm">
          <div class="flex items-center gap-2">
            <span>{{ item.playerAvatar }}</span>
            <span class="text-white">{{ item.playerName }}</span>
          </div>
          <span class="text-slate-400">{{ item.count }} 次评估 · 最近 {{ formatTime(item.lastAssessedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="flex gap-3">
      <router-link to="/coach/assess" class="btn-primary px-4 py-2 rounded-lg text-sm font-semibold">⭐ 快速评分</router-link>
      <router-link to="/coach/biometrics" class="glass-card px-4 py-2 rounded-lg text-sm text-white hover:bg-white/5 transition-colors">📏 录入体测</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { playerApi, biometricsApi, assessmentApi } from '@/api'

const players = ref<any[]>([])
const alerts = ref<any[]>([])
const recentSummary = ref<any[]>([])

const pendingPlayers = computed(() => {
  const assessedIds = new Set(recentSummary.value.map((r) => r.playerId))
  return players.value.filter((p) => !assessedIds.has(p.id))
})

onMounted(async () => {
  try {
    const [pRes, aRes, rRes] = await Promise.all([
      playerApi.list(),
      biometricsApi.alerts(),
      assessmentApi.recent(),
    ])
    players.value = pRes.data.data || []
    alerts.value = aRes.data.data || []
    recentSummary.value = rRes.data.data || []
  } catch (e) {
    console.error(e)
  }
})

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}
</script>
