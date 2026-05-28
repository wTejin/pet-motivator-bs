<template>
  <div class="min-h-screen bg-[#0a1628] text-white">
    <!-- Top Nav Bar -->
    <nav class="glass-card border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div class="flex items-center gap-3">
        <span class="text-2xl" style="font-family: var(--font-display)">⚽</span>
        <h1 class="text-lg font-bold" style="font-family: var(--font-display)">星宠契约 · 教练端</h1>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <span class="text-xs text-white/60">{{ auth.playerMode === 'open' ? '🟢' : '🔴' }}</span>
          <button
            class="px-3 py-1 text-xs bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            @click="toggleMode"
          >
            {{ auth.playerMode === 'open' ? '开放模式' : '展示模式' }}
          </button>
        </div>
        <span class="text-sm text-white/60 hidden sm:inline">{{ auth.user?.name }}</span>
        <button
          class="text-sm text-white/60 hover:text-red-400 transition-colors"
          @click="auth.logout()"
        >
          退出
        </button>
      </div>
    </nav>

    <!-- Quick Link Cards -->
    <div class="px-4 md:px-6 pt-4 md:pt-6">
      <div class="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        <router-link to="/coach/dashboard" class="glass-card p-4 flex flex-col items-center gap-2 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-2xl">🏠</span>
          <span class="text-xs font-semibold text-white/70">首页</span>
        </router-link>
        <router-link to="/coach/score" class="glass-card p-4 flex flex-col items-center gap-2 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-2xl">📝</span>
          <span class="text-xs font-semibold text-white/70">快速记分</span>
        </router-link>
        <router-link to="/coach/players" class="glass-card p-4 flex flex-col items-center gap-2 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-2xl">👥</span>
          <span class="text-xs font-semibold text-white/70">球员管理</span>
        </router-link>
        <router-link to="/coach/player-cards" class="glass-card p-4 flex flex-col items-center gap-2 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-2xl">🃏</span>
          <span class="text-xs font-semibold text-white/70">球员卡</span>
        </router-link>
        <router-link to="/coach/shop" class="glass-card p-4 flex flex-col items-center gap-2 hover:bg-white/10 hover:-translate-y-1 transition-all">
          <span class="text-2xl">🛒</span>
          <span class="text-xs font-semibold text-white/70">商店</span>
        </router-link>
      </div>

      <!-- Child page renders here -->
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
