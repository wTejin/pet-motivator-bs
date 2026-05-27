<template>
  <div class="min-h-screen bg-slate-900 text-white">
    <!-- Top Nav -->
    <nav class="bg-gray-800/50 border-b border-white/10 px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-bold">星宠契约 · 管理后台</h1>
      <div class="flex items-center gap-4">
        <span class="text-sm text-white/60">{{ auth.user?.username }}</span>
        <button
          class="text-sm text-white/60 hover:text-red-400 transition-colors"
          @click="auth.logout()"
        >
          退出
        </button>
      </div>
    </nav>

    <div class="max-w-6xl mx-auto p-4 md:p-6">
      <!-- Loading -->
      <div v-if="loading" class="text-center text-white/60 py-8">加载中...</div>

      <template v-else>
        <!-- Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white/5 border border-white/10 rounded-xl p-6">
            <div class="text-white/40 text-sm mb-1">总教练数</div>
            <div class="text-3xl font-bold">{{ stats.coachCount ?? '-' }}</div>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-xl p-6">
            <div class="text-white/40 text-sm mb-1">活跃教练</div>
            <div class="text-3xl font-bold text-green-400">{{ stats.activeCoachCount ?? '-' }}</div>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-xl p-6">
            <div class="text-white/40 text-sm mb-1">总球员数</div>
            <div class="text-3xl font-bold text-blue-400">{{ stats.playerCount ?? '-' }}</div>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-xl p-6">
            <div class="text-white/40 text-sm mb-1">试用中教练</div>
            <div class="text-3xl font-bold text-yellow-400">{{ stats.trialCoachCount ?? '-' }}</div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <router-link
            to="/admin/coaches"
            class="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:-translate-y-1 transition-all flex items-center gap-4"
          >
            <span class="text-3xl">👥</span>
            <div>
              <div class="font-semibold text-lg">教练管理</div>
              <div class="text-sm text-white/40">管理教练账号、授权、启用/停用</div>
            </div>
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loading = ref(true)

const stats = ref<Record<string, number>>({
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
      stats.value.trialCoachCount = coaches.filter((c: any) => c.trialUntil && Number(c.trialUntil) > now && Number(c.authorizedUntil) <= Number(c.trialUntil)).length
    }
  } catch (e) {
    console.error('Failed to load stats', e)
  } finally {
    loading.value = false
  }
})
</script>
