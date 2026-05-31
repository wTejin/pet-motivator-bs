<template>
  <div class="coaches-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-actions">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索手机号或姓名..."
            class="search-input"
          />
        </div>
        <button class="btn-primary" @click="showAddModal = true">+ 添加教练</button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-chip">
        <span class="chip-dot active"></span>
        活跃 {{ activeCount }}
      </div>
      <div class="stat-chip">
        <span class="chip-dot inactive"></span>
        停用 {{ inactiveCount }}
      </div>
      <div class="stat-chip">
        <span class="chip-dot trial"></span>
        试用中 {{ trialCount }}
      </div>
      <div class="stat-chip">
        <span class="chip-dot expired"></span>
        已过期 {{ expiredCount }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">加载中...</div>

    <!-- Empty -->
    <div v-else-if="filteredCoaches.length === 0" class="empty-state">
      <span class="empty-icon">👥</span>
      <p v-if="searchQuery">未找到匹配的教练</p>
      <p v-else>暂无教练数据，点击上方按钮添加</p>
    </div>

    <!-- Coaches Table -->
    <div v-else class="table-card">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-phone">手机号</th>
              <th class="col-name">姓名</th>
              <th class="col-school">学校/团队</th>
              <th class="col-players">球员数</th>
              <th class="col-status">状态</th>
              <th class="col-dates">授权期限</th>
              <th class="col-mode">学生模式</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="coach in filteredCoaches" :key="coach.id">
              <td class="col-phone">{{ coach.phone }}</td>
              <td class="col-name">{{ coach.name || '-' }}</td>
              <td class="col-school">{{ coach.school || '-' }}</td>
              <td class="col-players">
                <span class="badge-count">{{ coach.playerCount }}</span>
              </td>
              <td class="col-status">
                <span :class="['status-tag', coach.isActive ? 'active' : 'inactive']">
                  {{ coach.isActive ? '活跃' : '停用' }}
                </span>
              </td>
              <td class="col-dates">
                <div class="date-cell">
                  <div class="date-row">
                    <span class="date-label">试用:</span>
                    <span :class="['date-value', isExpired(coach.trialUntil) ? 'expired' : '']">{{ formatDate(coach.trialUntil) }}</span>
                  </div>
                  <div class="date-row">
                    <span class="date-label">授权:</span>
                    <span :class="['date-value', isExpired(coach.authorizedUntil) ? 'expired' : '']">{{ formatDate(coach.authorizedUntil) }}</span>
                  </div>
                </div>
              </td>
              <td class="col-mode">
                <span :class="['mode-tag', coach.playerMode]">
                  {{ coach.playerMode === 'open' ? '开放' : '展示' }}
                </span>
              </td>
              <td class="col-actions">
                <div class="action-group">
                  <button
                    :class="['act-btn', coach.isActive ? 'danger' : 'success']"
                    @click="handleToggleActive(coach)"
                  >
                    {{ coach.isActive ? '停用' : '启用' }}
                  </button>
                  <button class="act-btn primary" @click="handleExtendAuth(coach)">
                    延期
                  </button>
                  <button class="act-btn warning" @click="handleResetPassword(coach)">
                    重置密码
                  </button>
                  <button class="act-btn secondary" @click="showCoachDetail(coach)">
                    详情
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Coach Modal -->
    <Transition name="modal">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-panel">
          <h3 class="modal-title">➕ 添加教练</h3>
          <div class="form-group">
            <label class="form-label">手机号（11位）</label>
            <input
              v-model="newPhone"
              type="tel"
              maxlength="11"
              placeholder="输入11位手机号"
              class="form-input"
            />
            <p class="form-hint">默认密码为手机号后六位</p>
          </div>
          <div class="modal-actions">
            <button class="btn-save" @click="handleAddCoach">添加</button>
            <button class="btn-cancel" @click="showAddModal = false">取消</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Coach Detail Modal -->
    <Transition name="modal">
      <div v-if="detailCoach" class="modal-overlay" @click.self="detailCoach = null">
        <div class="modal-panel wide">
          <div class="detail-header">
            <div class="detail-avatar">{{ detailCoach.name?.[0] || '👤' }}</div>
            <div class="detail-info">
              <h3 class="detail-name">{{ detailCoach.name || detailCoach.phone }}</h3>
              <p class="detail-phone">{{ detailCoach.phone }}</p>
            </div>
            <span :class="['status-tag', detailCoach.isActive ? 'active' : 'inactive']">
              {{ detailCoach.isActive ? '活跃' : '停用' }}
            </span>
          </div>

          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">学校/团队</span>
              <span class="detail-value">{{ detailCoach.school || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">球员数量</span>
              <span class="detail-value">{{ detailCoach.playerCount }} 人</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">学生模式</span>
              <span class="detail-value">{{ detailCoach.playerMode === 'open' ? '开放模式' : '展示模式' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">试用期至</span>
              <span :class="['detail-value', isExpired(detailCoach.trialUntil) ? 'expired' : '']">{{ formatDate(detailCoach.trialUntil) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">授权至</span>
              <span :class="['detail-value', isExpired(detailCoach.authorizedUntil) ? 'expired' : '']">{{ formatDate(detailCoach.authorizedUntil) }}</span>
            </div>
          </div>

          <div class="detail-actions-bar">
            <button :class="['act-btn', detailCoach.isActive ? 'danger' : 'success']" @click="handleToggleActive(detailCoach); detailCoach = null">
              {{ detailCoach.isActive ? '停用账号' : '启用账号' }}
            </button>
            <button class="act-btn primary" @click="handleExtendAuth(detailCoach); detailCoach = null">
              延期授权
            </button>
            <button class="act-btn warning" @click="handleResetPassword(detailCoach); detailCoach = null">
              重置密码
            </button>
            <button class="act-btn secondary" @click="detailCoach = null">关闭</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '@/api'

interface CoachItem {
  id: string
  phone: string
  name: string
  school: string
  isActive: boolean
  trialUntil: number
  authorizedUntil: number
  playerMode: string
  playerCount: number
  totalScores: number
  createdAt: number
}

const coaches = ref<CoachItem[]>([])
const newPhone = ref('')
const loading = ref(true)
const searchQuery = ref('')
const showAddModal = ref(false)
const detailCoach = ref<CoachItem | null>(null)

onMounted(loadCoaches)

async function loadCoaches() {
  loading.value = true
  try {
    const res = await adminApi.getCoaches()
    coaches.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load coaches', e)
  } finally {
    loading.value = false
  }
}

const filteredCoaches = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return coaches.value
  return coaches.value.filter(
    (c) =>
      c.phone.includes(q) ||
      (c.name && c.name.includes(q)) ||
      (c.school && c.school.includes(q))
  )
})

const now = () => Date.now()

const activeCount = computed(() =>
  coaches.value.filter((c) => c.isActive && Number(c.authorizedUntil) > now()).length
)
const inactiveCount = computed(() => coaches.value.filter((c) => !c.isActive).length)
const trialCount = computed(() =>
  coaches.value.filter(
    (c) =>
      c.isActive &&
      c.trialUntil &&
      Number(c.trialUntil) > now() &&
      Number(c.authorizedUntil) <= Number(c.trialUntil)
  ).length
)
const expiredCount = computed(() =>
  coaches.value.filter(
    (c) => c.isActive && c.authorizedUntil && Number(c.authorizedUntil) > 0 && Number(c.authorizedUntil) <= now()
  ).length
)

async function handleAddCoach() {
  if (!newPhone.value || !/^\d{11}$/.test(newPhone.value)) {
    alert('请输入有效的11位手机号')
    return
  }
  try {
    await adminApi.createCoach({ phone: newPhone.value })
    newPhone.value = ''
    showAddModal.value = false
    await loadCoaches()
  } catch (e: any) {
    alert(e.response?.data?.error || '添加失败')
  }
}

async function handleToggleActive(coach: CoachItem) {
  try {
    await adminApi.updateCoach(coach.id, { isActive: !coach.isActive })
    await loadCoaches()
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

async function handleExtendAuth(coach: CoachItem) {
  const days = prompt('延期天数:', '30')
  if (!days) return
  const newDate = Date.now() + Number(days) * 24 * 3600 * 1000
  try {
    await adminApi.updateCoach(coach.id, { authorizedUntil: newDate })
    await loadCoaches()
    alert('授权延期成功')
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

async function handleResetPassword(coach: CoachItem) {
  if (!confirm(`确认重置教练 "${coach.name || coach.phone}" 的密码？\n重置后密码将恢复为手机号后六位。`)) return
  try {
    const res = await adminApi.resetCoachPassword(coach.id)
    if (res.data.success) {
      alert(`密码重置成功！\n新密码：${res.data.data.newPassword}`)
    }
  } catch (e: any) {
    alert(e.response?.data?.error || '重置失败')
  }
}

function showCoachDetail(coach: CoachItem) {
  detailCoach.value = { ...coach }
}

function formatDate(ts: number): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleDateString('zh-CN')
}

function isExpired(ts: number): boolean {
  return ts > 0 && ts < Date.now()
}
</script>

<style scoped>
.coaches-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border-radius: 12px;
  padding: 8px 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.search-icon {
  font-size: 14px;
  opacity: 0.5;
}

.search-input {
  border: none;
  outline: none;
  font-size: 13px;
  color: #333;
  background: transparent;
  width: 180px;
}

.search-input::placeholder {
  color: #bbb;
}

.btn-primary {
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Stats Bar */
.stats-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border-radius: 20px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: block;
}

.chip-dot.active { background: #43a047; }
.chip-dot.inactive { background: #dc2626; }
.chip-dot.trial { background: #ff9800; }
.chip-dot.expired { background: #999; }

/* Loading & Empty */
.loading-state {
  text-align: center;
  padding: 60px;
  color: #999;
  background: white;
  border-radius: 14px;
}

.empty-state {
  text-align: center;
  padding: 60px;
  background: white;
  border-radius: 14px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.4;
}

/* Table */
.table-card {
  background: white;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table thead th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  color: #888;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.data-table tbody td {
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
  color: #333;
  vertical-align: middle;
}

.data-table tbody tr:hover {
  background: #fafafa;
}

.col-phone { white-space: nowrap; }
.col-name { min-width: 80px; }
.col-school { min-width: 120px; }
.col-players { text-align: center; }
.col-points { text-align: center; }
.col-status { text-align: center; }
.col-dates { min-width: 140px; }
.col-mode { text-align: center; }
.col-actions { min-width: 180px; }

.badge-count {
  display: inline-block;
  min-width: 24px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(66, 165, 245, 0.1);
  color: #1e88e5;
  font-weight: 700;
  font-size: 12px;
  text-align: center;
}

.points-text {
  font-weight: 600;
  color: #ff9800;
  font-family: 'Russo One', 'PingFang SC', sans-serif;
}

.status-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.status-tag.active {
  background: rgba(67, 160, 71, 0.1);
  color: #2e7d32;
}

.status-tag.inactive {
  background: rgba(220, 38, 38, 0.1);
  color: #c62828;
}

.date-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-row {
  display: flex;
  gap: 4px;
  font-size: 11px;
}

.date-label {
  color: #aaa;
  min-width: 32px;
}

.date-value {
  color: #666;
}

.date-value.expired {
  color: #dc2626;
  font-weight: 600;
}

.mode-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.mode-tag.open {
  background: rgba(67, 160, 71, 0.1);
  color: #2e7d32;
}

.mode-tag.display {
  background: rgba(158, 158, 158, 0.1);
  color: #666;
}

.action-group {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

.act-btn {
  padding: 5px 10px;
  border-radius: 8px;
  border: none;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.act-btn:hover {
  opacity: 0.85;
}

.act-btn.primary {
  background: rgba(66, 165, 245, 0.1);
  color: #1e88e5;
}

.act-btn.warning {
  background: rgba(245, 124, 0, 0.1);
  color: #e65100;
}

.act-btn.success {
  background: rgba(67, 160, 71, 0.1);
  color: #2e7d32;
}

.act-btn.danger {
  background: rgba(220, 38, 38, 0.1);
  color: #c62828;
}

.act-btn.secondary {
  background: rgba(0, 0, 0, 0.04);
  color: #666;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}

.modal-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-panel.wide {
  max-width: 480px;
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: #333;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.15);
}

.form-hint {
  font-size: 11px;
  color: #999;
  margin: 6px 0 0;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}

.btn-save {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-save:hover {
  opacity: 0.9;
}

.btn-cancel {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: #666;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Detail Modal */
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.detail-info {
  flex: 1;
}

.detail-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 2px;
}

.detail-phone {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 10px;
}

.detail-label {
  font-size: 11px;
  color: #999;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.detail-value.expired {
  color: #dc2626;
}

.detail-actions-bar {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
