<template>
  <div class="dashboard-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton-card" v-for="i in 8" :key="i">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
      </div>
    </div>

    <template v-else>
      <!-- 教练账号健康度 -->
      <div class="section-label">👨‍🏫 教练账号健康度</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-label">总教练数</div>
            <div class="stat-value">{{ stats.coachCount }}</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-label">活跃教练</div>
            <div class="stat-value" style="color: #43a047">{{ stats.activeCoachCount }}</div>
          </div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon">⏰</div>
          <div class="stat-info">
            <div class="stat-label">即将过期</div>
            <div class="stat-value" style="color: #f57c00">{{ stats.expiringCoachCount }}</div>
          </div>
        </div>
        <div class="stat-card expired">
          <div class="stat-icon">⚠️</div>
          <div class="stat-info">
            <div class="stat-label">已过期</div>
            <div class="stat-value" style="color: #dc2626">{{ stats.expiredCoachCount }}</div>
          </div>
        </div>
      </div>

      <!-- 业务规模 -->
      <div class="section-label">📈 业务规模</div>
      <div class="stats-grid">
        <router-link to="/admin/players" class="stat-card clickable">
          <div class="stat-icon">⚽</div>
          <div class="stat-info">
            <div class="stat-label">总球员数</div>
            <div class="stat-value" style="color: #1e88e5">
              {{ stats.playerCount }}
              <span class="stat-sub">活跃 {{ stats.activePlayerCount }} / 停用 {{ stats.inactivePlayerCount }}</span>
            </div>
          </div>
        </router-link>
        <div class="stat-card">
          <div class="stat-icon">🆕</div>
          <div class="stat-info">
            <div class="stat-label">今日新增球员</div>
            <div class="stat-value" style="color: #1e88e5">{{ stats.todayNewPlayerCount }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🐾</div>
          <div class="stat-info">
            <div class="stat-label">宠物总数</div>
            <div class="stat-value" style="color: #8e24aa">{{ stats.petCount }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏪</div>
          <div class="stat-info">
            <div class="stat-label">全局商品数</div>
            <div class="stat-value" style="color: #ff9800">{{ stats.shopItemCount }}</div>
          </div>
        </div>
      </div>

      <!-- 快捷入口 -->
      <div class="section-label">🚀 功能入口</div>
      <div class="quick-grid">
        <router-link to="/admin/coaches" class="quick-card">
          <div class="quick-icon">👥</div>
          <div class="quick-info">
            <div class="quick-title">教练管理</div>
            <div class="quick-desc">查看、授权、管理所有教练账号</div>
          </div>
        </router-link>
        <router-link to="/admin/shop" class="quick-card">
          <div class="quick-icon">🏪</div>
          <div class="quick-info">
            <div class="quick-title">魔法市集</div>
            <div class="quick-desc">管理全局商品、定价与库存</div>
          </div>
        </router-link>
        <router-link to="/admin/pet-species" class="quick-card">
          <div class="quick-icon">🐾</div>
          <div class="quick-info">
            <div class="quick-title">宠物管理</div>
            <div class="quick-desc">配置宠物物种、阶段与外观</div>
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
  expiringCoachCount: 0,
  expiredCoachCount: 0,
  playerCount: 0,
  activePlayerCount: 0,
  inactivePlayerCount: 0,
  todayNewPlayerCount: 0,
  petCount: 0,
  shopItemCount: 0,
})

onMounted(async () => {
  try {
    const [statsRes, coachesRes] = await Promise.all([
      adminApi.getStats(),
      adminApi.getCoaches(),
    ])

    const now = Date.now()
    const sevenDaysLater = now + 7 * 24 * 3600 * 1000

    if (coachesRes.data.success) {
      const coaches = coachesRes.data.data || []

      // 教练账号健康度（全部从 coaches 数据计算，保证一致性）
      stats.value.coachCount = coaches.length
      stats.value.activeCoachCount = coaches.filter(
        (c: any) => c.isActive && Number(c.authorizedUntil) > now
      ).length
      stats.value.expiringCoachCount = coaches.filter(
        (c: any) =>
          c.isActive &&
          Number(c.authorizedUntil) > now &&
          Number(c.authorizedUntil) <= sevenDaysLater
      ).length
      stats.value.expiredCoachCount = coaches.filter(
        (c: any) =>
          c.isActive &&
          Number(c.authorizedUntil) > 0 &&
          Number(c.authorizedUntil) <= now
      ).length
    }

    if (statsRes.data.success) {
      const d = statsRes.data.data
      stats.value.playerCount = d.playerCount || 0
      stats.value.activePlayerCount = d.activePlayerCount || 0
      stats.value.inactivePlayerCount = d.inactivePlayerCount || 0
      stats.value.todayNewPlayerCount = d.todayNewPlayerCount || 0
      stats.value.petCount = d.petCount || 0
      stats.value.shopItemCount = d.shopItemCount || 0
    }
  } catch (e) {
    console.error('Failed to load stats', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
}

.section-label {
  font-size: 13px;
  font-weight: 700;
  color: #888;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-label + .stats-grid {
  margin-bottom: 28px;
}

/* Loading */
.loading-state {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.skeleton-card {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-line {
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 6px;
}

.skeleton-line.short {
  width: 50%;
  height: 12px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.stat-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.stat-card.active {
  border-left: 3px solid #43a047;
}

.stat-card.warning {
  border-left: 3px solid #ff9800;
}

.stat-card.expired {
  border-left: 3px solid #dc2626;
}

.stat-card.clickable {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

.stat-sub {
  display: block;
  font-size: 11px;
  font-weight: 400;
  color: #aaa;
  margin-top: 2px;
}

.stat-icon {
  font-size: 28px;
  line-height: 1;
  width: 40px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #333;
  font-family: 'Russo One', 'PingFang SC', sans-serif;
}

/* Quick Entry Cards */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: white;
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.04);
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.quick-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.quick-icon {
  font-size: 32px;
  line-height: 1;
  width: 48px;
  text-align: center;
  flex-shrink: 0;
}

.quick-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 4px;
}

.quick-desc {
  font-size: 12px;
  color: #888;
}
</style>
