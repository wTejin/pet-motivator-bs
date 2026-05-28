<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <h2 class="text-xl font-bold" style="font-family: var(--font-display)">仪表盘</h2>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-white/60 py-8">
      <div class="skeleton h-24 w-full mb-4"></div>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-card p-5 text-center">
          <div class="text-white/50 text-sm mb-1">总教练数</div>
          <div class="text-3xl font-bold" style="font-family: var(--font-num)">{{ stats.coachCount }}</div>
        </div>
        <div class="glass-card p-5 text-center">
          <div class="text-white/50 text-sm mb-1">活跃教练</div>
          <div class="text-3xl font-bold text-green-400" style="font-family: var(--font-num)">{{ stats.activeCoachCount }}</div>
        </div>
        <div class="glass-card p-5 text-center">
          <div class="text-white/50 text-sm mb-1">总球员数</div>
          <div class="text-3xl font-bold text-blue-400" style="font-family: var(--font-num)">{{ stats.playerCount }}</div>
        </div>
        <div class="glass-card p-5 text-center">
          <div class="text-white/50 text-sm mb-1">试用中教练</div>
          <div class="text-3xl font-bold text-yellow-400" style="font-family: var(--font-num)">{{ stats.trialCoachCount }}</div>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <router-link
          to="/admin/coaches"
          class="glass-card p-6 hover:bg-white/10 hover:-translate-y-1 transition-all flex items-center gap-4"
        >
          <span class="text-3xl">👥</span>
          <div>
            <div class="font-semibold text-lg">教练管理</div>
            <div class="text-sm text-white/50">管理教练账号、授权、启用/停用</div>
          </div>
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api'

const loading = ref(true)

const stats = ref({
  coachCount: 0,
  activeCoachCount: 0,
  playerCount: 0,
  trialCoachCount: 0,
})

onMounted(async () => {
  try {
    const [statsRes, coachesRes] = await Promise.all([
      adminApi.getStats(),
      adminApi.getCoaches(),
    ])
    if (statsRes.data.success) {
      const d = statsRes.data.data
      stats.value.coachCount = d.coachCount || 0
      stats.value.playerCount = d.playerCount || 0
    }
    if (coachesRes.data.success) {
      const coaches = coachesRes.data.data || []
      stats.value.activeCoachCount = coaches.filter((c: any) => c.isActive).length
      const now = Date.now()
      stats.value.trialCoachCount = coaches.filter(
        (c: any) => c.trialUntil && Number(c.trialUntil) > now && Number(c.authorizedUntil) <= Number(c.trialUntil)
      ).length
    }
  } catch (e) {
    console.error('Failed to load stats', e)
  } finally {
    loading.value = false
  }
})
</script>
