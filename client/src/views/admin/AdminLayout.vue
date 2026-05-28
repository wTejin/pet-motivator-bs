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

    <!-- Admin Quick Nav -->
    <div class="admin-nav">
      <router-link
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="nav-link"
        :class="{ active: $route.path === link.to || $route.path.startsWith(link.to + '/') }"
      >
        <span class="nav-icon">{{ link.icon }}</span>
        <span class="nav-label">{{ link.label }}</span>
      </router-link>
    </div>

    <!-- Child page renders here -->
    <div class="p-4 md:p-6">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const navLinks = [
  { to: '/admin/dashboard', icon: '📊', label: '仪表盘' },
  { to: '/admin/coaches', icon: '👥', label: '教练管理' },
  { to: '/admin/shop', icon: '🏪', label: '魔法集市' },
]
</script>

<style scoped>
.admin-nav {
  display: flex;
  gap: 8px;
  padding: 12px 16px 0;
  overflow-x: auto;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.12);
}

.nav-link.active {
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  border-color: transparent;
}

.nav-icon {
  font-size: 16px;
}
</style>
