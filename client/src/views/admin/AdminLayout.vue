<template>
  <div class="admin-layout">
    <!-- Top Nav Bar -->
    <nav class="admin-navbar">
      <div class="nav-brand">
        <router-link to="/admin/dashboard" class="nav-back">
          &#8592;
        </router-link>
        <span class="nav-icon">🛡️</span>
        <h1 class="nav-title">管理后台</h1>
      </div>
      <div class="nav-user">
        <span class="user-name">{{ auth.user?.username }}</span>
        <button class="logout-btn" @click="auth.logout()">
          退出
        </button>
      </div>
    </nav>

    <!-- Child page renders here -->
    <div class="admin-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
  color: #333;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* Top Nav Bar */
.admin-navbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-back {
  color: #999;
  text-decoration: none;
  font-size: 18px;
  transition: color 0.2s;
  padding: 4px 8px;
  border-radius: 8px;
}

.nav-back:hover {
  color: #333;
  background: rgba(0, 0, 0, 0.04);
}

.nav-icon {
  font-size: 22px;
}

.nav-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-name {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.logout-btn {
  padding: 6px 14px;
  border-radius: 10px;
  border: none;
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.15);
}

/* Content Area */
.admin-content {
  padding: 16px 20px 40px;
}
</style>
