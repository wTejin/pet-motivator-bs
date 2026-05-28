<template>
  <div class="min-h-screen bg-[#0a1628] text-white">
    <!-- Top Nav Bar -->
    <nav class="glass-card border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div class="flex items-center gap-3">
        <router-link to="/admin/dashboard" class="text-white/60 hover:text-white transition-colors">
          &#8592;
        </router-link>
        <span class="text-xl" style="font-family: var(--font-display)">🛡️</span>
        <h1 class="text-lg font-bold" style="font-family: var(--font-display)">管理后台</h1>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm text-white/60 hidden sm:inline">{{ auth.user?.username }}</span>
        <button
          class="text-sm text-white/60 hover:text-red-400 transition-colors"
          @click="auth.logout()"
        >
          退出
        </button>
      </div>
    </nav>

    <!-- Child page renders here -->
    <div class="p-4 md:p-6">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>
