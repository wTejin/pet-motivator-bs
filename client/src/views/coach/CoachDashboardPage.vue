<template>
  <div class="dashboard-page">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">{{ stats.playerCount }}</div>
        <div class="stat-label">活跃球员</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🐾</div>
        <div class="stat-value">{{ stats.petCount }}</div>
        <div class="stat-label">已领养宠物</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">{{ stats.todayScores }}</div>
        <div class="stat-label">今日记分</div>
        <div v-if="stats.todayCount > 0" class="stat-badge">{{ stats.todayCount }} 次</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-value">{{ stats.totalScores }}</div>
        <div class="stat-label">累计记分</div>
        <div v-if="stats.totalCount > 0" class="stat-badge gray">{{ stats.totalCount }} 次</div>
      </div>
    </div>

    <!-- Recent Records -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title">📋 最近积分变动</h3>
        <router-link to="/coach/score" class="section-link">全部 ›</router-link>
      </div>
      <div v-if="loading" class="loading-placeholder">
        <div v-for="i in 5" :key="i" class="skeleton-row"></div>
      </div>
      <div v-else-if="recentRecords.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>暂无积分记录</p>
      </div>
      <div v-else class="record-list">
        <div
          v-for="rec in recentRecords"
          :key="rec.id"
          class="record-item"
        >
          <span class="record-avatar">{{ rec.playerAvatar || '⭐' }}</span>
          <div class="record-info">
            <div class="record-reason">{{ rec.reason }}</div>
            <div class="record-meta">{{ rec.playerName }} · {{ formatTime(rec.createdAt) }}</div>
          </div>
          <span
            class="record-points"
            :class="rec.points >= 0 ? 'plus' : 'minus'"
          >
            {{ rec.points >= 0 ? `+${rec.points}` : rec.points }}
          </span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section-card">
      <div class="section-header">
        <h3 class="section-title">⚡ 快捷操作</h3>
      </div>
      <div class="action-grid">
        <router-link to="/coach/score" class="action-item">
          <span class="action-icon">📝</span>
          <span class="action-label">快速记分</span>
        </router-link>
        <router-link to="/coach/players" class="action-item">
          <span class="action-icon">➕</span>
          <span class="action-label">添加球员</span>
        </router-link>
        <router-link to="/coach/player-cards" class="action-item">
          <span class="action-icon">🃏</span>
          <span class="action-label">查看球员卡</span>
        </router-link>
        <router-link to="/coach/shop" class="action-item">
          <span class="action-icon">🛒</span>
          <span class="action-label">管理魔法市集</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { coachApi } from '@/api'

interface RecordItem {
  id: string
  reason: string
  points: number
  playerName: string
  playerAvatar: string
  type: string
  createdAt: number
}

interface DashboardStats {
  playerCount: number
  petCount: number
  todayScores: number
  todayCount: number
  totalScores: number
  totalCount: number
  recentRecords: RecordItem[]
}

const stats = ref<DashboardStats>({
  playerCount: 0, petCount: 0, todayScores: 0, todayCount: 0,
  totalScores: 0, totalCount: 0, recentRecords: [],
})
const loading = ref(true)
const recentRecords = ref<RecordItem[]>([])

onMounted(async () => {
  try {
    const res = await coachApi.getDashboardStats()
    if (res.data.success) {
      const data = res.data.data
      stats.value = data
      recentRecords.value = data.recentRecords || []
    }
  } catch (e) {
    console.error('Failed to load dashboard', e)
  } finally {
    loading.value = false
  }
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.2s;
  position: relative;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-card.highlight {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 140, 0, 0.1));
  border-color: rgba(255, 215, 0, 0.2);
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #1a1a2e;
  font-family: var(--font-num);
  line-height: 1;
}

.stat-card.highlight .stat-value {
  color: #b45309;
}

.stat-label {
  font-size: 13px;
  color: #888;
  margin-top: 6px;
}

.stat-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 215, 0, 0.2);
  color: #b45309;
}

.stat-badge.gray {
  background: rgba(0, 0, 0, 0.06);
  color: #888;
}

.section-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

.section-link {
  font-size: 13px;
  color: #42a5f5;
  font-weight: 500;
  text-decoration: none;
}

.section-link:hover {
  color: #1e88e5;
}

.loading-placeholder {
  padding: 16px 20px;
}

.skeleton-row {
  height: 52px;
  margin-bottom: 8px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.04) 25%, rgba(0, 0, 0, 0.08) 50%, rgba(0, 0, 0, 0.04) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-icon {
  display: block;
  font-size: 40px;
  margin-bottom: 8px;
}

.record-list {
  padding: 8px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 10px;
  transition: background 0.15s;
}

.record-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.record-avatar {
  font-size: 24px;
  width: 36px;
  text-align: center;
  flex-shrink: 0;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-reason {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-meta {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.record-points {
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-num);
  flex-shrink: 0;
}

.record-points.plus {
  color: #16a34a;
}

.record-points.minus {
  color: #dc2626;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px 20px;
}

@media (min-width: 640px) {
  .action-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: #555;
  text-decoration: none;
  transition: all 0.2s;
}

.action-item:hover {
  background: rgba(66, 165, 245, 0.08);
  border-color: rgba(66, 165, 245, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.action-icon {
  font-size: 28px;
}

.action-label {
  font-size: 14px;
  font-weight: 500;
}
</style>
