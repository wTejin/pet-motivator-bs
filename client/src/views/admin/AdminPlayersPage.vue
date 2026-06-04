<template>
  <div class="players-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <router-link to="/admin/dashboard" class="back-link">← 返回仪表盘</router-link>
      <h2 class="page-title">球员管理</h2>
      <div class="stats-row">
        <span class="stat-tag total">总计 {{ players.length }}</span>
        <span class="stat-tag active">活跃 {{ activeCount }}</span>
        <span class="stat-tag inactive">已停用 {{ inactiveCount }}</span>
      </div>
    </div>

    <!-- 加载 -->
    <div v-if="loading" class="loading-state">加载中...</div>

    <!-- 球员表格 -->
    <div v-else class="table-card">
      <div class="table-header">
        <div class="col-name">球员</div>
        <div class="col-coach">所属教练</div>
        <div class="col-status">状态</div>
        <div class="col-points">积分</div>
        <div class="col-pet">宠物</div>
        <div class="col-date">创建时间</div>
        <div class="col-actions">操作</div>
      </div>

      <div
        v-for="player in players"
        :key="player.id"
        class="table-row"
        :class="{ inactive: !player.isActive }"
      >
        <div class="col-name">
          <img
            v-if="isImage(player.avatar) && !brokenAvatars.has(player.avatar)"
            :src="player.avatar"
            class="avatar-img"
            alt="avatar"
            @error="onAvatarError"
          />
          <span v-else class="avatar-el">{{ fallbackEmoji(player.avatar) }}</span>
          <div class="name-info">
            <span class="name-text">{{ player.name }}</span>
            <span v-if="player.age" class="name-sub">{{ player.age }}岁</span>
          </div>
        </div>
        <div class="col-coach">
          <span class="coach-name">{{ player.coachName }}</span>
          <span v-if="player.coachSchool" class="coach-school">{{ player.coachSchool }}</span>
        </div>
        <div class="col-status">
          <span class="status-badge" :class="player.isActive ? 'active' : 'inactive'">
            {{ player.isActive ? '活跃' : '已停用' }}
          </span>
        </div>
        <div class="col-points">{{ player.currentPoints }}</div>
        <div class="col-pet">
          <span v-if="player.pet">{{ player.pet.name }} Lv.{{ player.pet.level }}</span>
          <span v-else class="no-pet">—</span>
        </div>
        <div class="col-date">{{ formatDate(player.createdAt) }}</div>
        <div class="col-actions">
          <button
            v-if="!player.isActive"
            class="btn-restore"
            @click="restorePlayer(player)"
          >恢复</button>
          <button
            class="btn-delete"
            @click="hardDelete(player)"
          >永久删除</button>
        </div>
      </div>

      <div v-if="players.length === 0" class="empty-state">
        暂无球员数据
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api'

interface AdminPlayer {
  id: string
  name: string
  avatar: string
  isActive: boolean
  age: number | null
  birthDate: string | null
  gender: string | null
  currentPoints: number
  coachId: string
  coachName: string
  coachPhone: string
  coachSchool: string
  pet: { id: string; name: string; stage: string; speciesId: string; level: number } | null
  createdAt: number
  updatedAt: number
}

const players = ref<AdminPlayer[]>([])
const loading = ref(true)

const activeCount = computed(() => players.value.filter(p => p.isActive).length)
const inactiveCount = computed(() => players.value.filter(p => !p.isActive).length)

onMounted(async () => {
  try {
    const res = await adminApi.getPlayers()
    players.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load players', e)
  } finally {
    loading.value = false
  }
})

function isImage(avatar: string) {
  return avatar && (avatar.startsWith('/') || avatar.startsWith('http'))
}

function fallbackEmoji(avatar: string) {
  return avatar && !avatar.startsWith('/') && !avatar.startsWith('http') ? avatar : '😊'
}

const brokenAvatars = new Set<string>()
function onAvatarError(e: Event) {
  const img = e.target as HTMLImageElement
  if (img) brokenAvatars.add(img.src)
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

async function restorePlayer(player: AdminPlayer) {
  if (!confirm(`确认恢复球员「${player.name}」？恢复后其教练可再次看到该球员。`)) return
  try {
    await adminApi.restorePlayer(player.id)
    player.isActive = true
  } catch (e: any) {
    alert(e.response?.data?.error || '恢复失败')
  }
}

async function hardDelete(player: AdminPlayer) {
  if (!confirm(
    `⚠️ 永久删除警告\n\n即将永久删除球员「${player.name}」及其全部关联数据：\n` +
    `- 宠物数据\n- 积分记录\n- 评估数据\n- 体测数据\n- 商品/背包数据\n\n` +
    `此操作不可撤销！\n\n确认永久删除？`
  )) return
  if (!confirm(`再次确认：永久删除「${player.name}」？此操作不可恢复。`)) return
  try {
    await adminApi.deletePlayer(player.id)
    players.value = players.value.filter(p => p.id !== player.id)
  } catch (e: any) {
    alert(e.response?.data?.error || '删除失败')
  }
}
</script>

<style scoped>
.players-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* 页面头部 */
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.back-link {
  font-size: 13px;
  color: #1e88e5;
  text-decoration: none;
  margin-right: 8px;
}

.back-link:hover {
  text-decoration: underline;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.stats-row {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.stat-tag {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 600;
}

.stat-tag.total {
  background: rgba(30, 136, 229, 0.1);
  color: #1e88e5;
}

.stat-tag.active {
  background: rgba(67, 160, 71, 0.1);
  color: #43a047;
}

.stat-tag.inactive {
  background: rgba(158, 158, 158, 0.12);
  color: #888;
}

/* 加载 */
.loading-state {
  text-align: center;
  padding: 60px;
  color: #999;
  font-size: 15px;
}

/* 表格卡片 */
.table-card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 90px 70px 1fr 100px 120px;
  gap: 8px;
  padding: 14px 20px;
  background: #f8f9fb;
  border-bottom: 1px solid #eee;
  font-size: 12px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 90px 70px 1fr 100px 120px;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid #f5f5f5;
  align-items: center;
  transition: background 0.15s;
}

.table-row:hover {
  background: #fafbfc;
}

.table-row.inactive {
  opacity: 0.6;
}

.table-row:last-child {
  border-bottom: none;
}

/* 列样式 */
.col-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-el,
.avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.avatar-img {
  object-fit: cover;
}

.name-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name-text {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.name-sub {
  font-size: 12px;
  color: #999;
}

.col-coach {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.coach-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coach-school {
  font-size: 11px;
  color: #aaa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 20px;
}

.status-badge.active {
  background: rgba(67, 160, 71, 0.1);
  color: #43a047;
}

.status-badge.inactive {
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}

.col-points {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.col-pet {
  font-size: 13px;
  color: #555;
}

.no-pet {
  color: #ccc;
}

.col-date {
  font-size: 12px;
  color: #999;
}

.col-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-restore {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(67, 160, 71, 0.1);
  color: #43a047;
  transition: background 0.2s;
}

.btn-restore:hover {
  background: rgba(67, 160, 71, 0.2);
}

.btn-delete {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
  transition: background 0.2s;
}

.btn-delete:hover {
  background: rgba(220, 38, 38, 0.16);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px;
  color: #bbb;
  font-size: 15px;
}

/* 响应式 */
@media (max-width: 900px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 12px 14px;
  }

  .col-points,
  .col-date {
    display: none;
  }

  .col-pet {
    display: none;
  }

  .col-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (max-width: 500px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
  }

  .col-coach,
  .col-status {
    display: none;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-row {
    margin-left: 0;
  }
}
</style>
