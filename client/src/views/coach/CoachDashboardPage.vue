<template>
  <div class="min-h-screen bg-slate-900 text-white">
    <!-- Top Nav Bar -->
    <nav class="bg-gray-800/50 border-b border-white/10 px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-bold">星宠契约 · 教练端</h1>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-white/60">{{ auth.playerMode === 'open' ? '🟢' : '🔴' }}</span>
          <span class="text-xs text-white/60">{{ auth.playerMode === 'open' ? '开放' : '展示' }}</span>
          <button
            class="px-3 py-1 text-xs bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            @click="toggleMode"
          >
            {{ auth.playerMode === 'open' ? '切换为展示模式' : '切换为开放模式' }}
          </button>
        </div>
        <span class="text-sm text-white/60">{{ auth.user?.name }}</span>
        <button
          class="text-sm text-white/60 hover:text-red-400 transition-colors"
          @click="auth.logout()"
        >
          退出
        </button>
      </div>
    </nav>

    <!-- Quick Link Cards -->
    <div class="p-4 md:p-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <router-link to="/coach/score" class="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center gap-3 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-3xl">📝</span>
          <span class="text-sm font-semibold">快速记分</span>
        </router-link>
        <router-link to="/coach/players" class="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center gap-3 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-3xl">👥</span>
          <span class="text-sm font-semibold">球员管理</span>
        </router-link>
        <router-link to="/coach/player-cards" class="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center gap-3 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-3xl">🃏</span>
          <span class="text-sm font-semibold">球员卡</span>
        </router-link>
        <router-link to="/coach/shop" class="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center gap-3 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-3xl">🛒</span>
          <span class="text-sm font-semibold">商店</span>
        </router-link>
        <router-link to="/coach/score-config" class="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center gap-3 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-3xl">⚙️</span>
          <span class="text-sm font-semibold">评分配置</span>
        </router-link>
      </div>

      <!-- Nested router view -->
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

async function toggleMode() {
  const newMode = auth.playerMode === 'open' ? 'display' : 'open'
  await auth.setMode(newMode)
}
</script>
