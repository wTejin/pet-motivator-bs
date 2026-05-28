<template>
  <div class="score-page">
    <!-- Player Selector -->
    <div class="player-bar">
      <div class="bar-header">
        <h3 class="bar-title">选择球员</h3>
        <label class="batch-toggle">
          <input v-model="batchMode" type="checkbox" />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
          <span class="toggle-label">批量模式</span>
        </label>
      </div>
      <div class="player-scroll">
        <button
          v-for="player in players"
          :key="player.id"
          class="player-chip"
          :class="{ selected: isSelected(player.id) }"
          @click="togglePlayer(player.id)"
        >
          <img
            v-if="isImageAvatar(player.avatar)"
            :src="player.avatar"
            class="chip-avatar-img"
            alt="avatar"
          />
          <span v-else class="chip-avatar">{{ player.avatar }}</span>
          <span class="chip-name">{{ player.name }}</span>
          <span v-if="isSelected(player.id)" class="chip-check">✓</span>
        </button>
      </div>
      <div v-if="selectedIds.length > 0" class="selected-hint">
        当前选中：<strong>{{ selectedNames }}</strong>
        <button class="clear-btn" @click="selectedIds = []">清空</button>
      </div>
    </div>

    <!-- Two Column Layout -->
    <div v-if="selectedIds.length > 0" class="score-columns">
      <!-- Left: FIFA Card Indicators -->
      <div class="left-area">
        <div class="area-header">
          <span class="area-icon">⚽</span>
          <span class="area-title">FIFA 球员卡指标</span>
          <span class="area-sub">提升球员卡数值</span>
        </div>
        <div class="dimensions-list">
          <div
            v-for="dim in dimensions"
            :key="dim.id"
            class="dim-panel"
          >
            <div class="dim-header">
              <span class="dim-icon">{{ dim.icon }}</span>
              <span class="dim-name">{{ dim.name }}</span>
            </div>
            <div class="dim-body">
              <button
                v-for="indicator in dim.indicators"
                :key="indicator.id"
                class="indicator-btn"
                :class="{ disabled: isAtLimit(indicator.id, indicator.dailyLimit) }"
                @click="handleIndicatorScore(indicator)"
              >
                <span class="ind-name">{{ indicator.name }}</span>
                <span class="ind-points">+{{ indicator.defaultPoints }}</span>
                <span class="ind-limit">
                  {{ getDailyCount(indicator.id) }}/{{ indicator.dailyLimit }}
                </span>
                <div
                  class="ind-progress"
                  :style="{ width: Math.min(100, (getDailyCount(indicator.id) / indicator.dailyLimit) * 100) + '%' }"
                ></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Custom Indicators -->
      <div class="right-area">
        <div class="area-header">
          <span class="area-icon">✨</span>
          <span class="area-title">自定义加分指标</span>
          <button class="area-add" @click="showAddCustom = true">＋</button>
        </div>
        <div class="custom-list">
          <button
            v-for="ci in customIndicators"
            :key="ci.id"
            class="indicator-btn custom"
            :class="{ disabled: isAtLimit(ci.id, ci.dailyLimit) }"
            @click="handleCustomIndicatorScore(ci)"
          >
            <span class="ind-name">{{ ci.name }}</span>
            <span class="ind-points">+{{ ci.defaultPoints }}</span>
            <span class="ind-limit">
              {{ getDailyCount(ci.id) }}/{{ ci.dailyLimit }}
            </span>
            <div
              class="ind-progress"
              :style="{ width: Math.min(100, (getDailyCount(ci.id) / ci.dailyLimit) * 100) + '%' }"
            ></div>
            <span class="ind-menu" @click.stop="openCustomMenu(ci)">⋯</span>
          </button>
          <div v-if="customIndicators.length === 0" class="custom-empty">
            暂无自定义指标，点击上方 ＋ 添加
          </div>
        </div>
      </div>
    </div>

    <!-- Add Custom Indicator Form -->
    <div v-if="showAddCustom" class="modal-overlay" @click.self="showAddCustom = false">
      <div class="modal-card">
        <h4 class="modal-title">{{ editingCustom ? '编辑指标' : '添加自定义指标' }}</h4>
        <div class="modal-body">
          <div class="modal-field">
            <label class="modal-label">指标名称</label>
            <input v-model="customForm.name" type="text" placeholder="如：帮助队友、超越昨天的自己" class="modal-input" />
          </div>
          <div class="modal-row">
            <div class="modal-field">
              <label class="modal-label">每次分值</label>
              <input v-model.number="customForm.defaultPoints" type="number" placeholder="5" class="modal-input short" />
            </div>
            <div class="modal-field">
              <label class="modal-label">每日上限</label>
              <input v-model.number="customForm.dailyLimit" type="number" placeholder="20" class="modal-input short" />
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showAddCustom = false">取消</button>
          <button class="btn-confirm" :disabled="!customForm.name" @click="saveCustomIndicator">
            {{ editingCustom ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Indicator Menu -->
    <div v-if="menuCustom" class="modal-overlay" @click.self="menuCustom = null">
      <div class="modal-card menu-card">
        <button class="menu-item" @click="editCustomIndicator(menuCustom)">✏️ 编辑</button>
        <button class="menu-item delete" @click="deleteCustomIndicator(menuCustom)">🗑️ 删除</button>
        <button class="menu-item" @click="menuCustom = null">取消</button>
      </div>
    </div>

    <!-- Quick Custom Score (for negative or arbitrary scores) -->
    <div v-if="selectedIds.length > 0" class="quick-score-bar">
      <input v-model.number="quickPoints" type="number" placeholder="分数" class="quick-input" />
      <input v-model="quickReason" type="text" placeholder="原因（可选）" class="quick-input flex" />
      <button class="btn-add-mini" :disabled="!canQuickScore" @click="handleQuickScore(true)">＋加分</button>
      <button class="btn-sub-mini" :disabled="!canQuickScore" @click="handleQuickScore(false)">－扣分</button>
    </div>

    <!-- Tips -->
    <details class="tips-panel">
      <summary>💡 评分建议</summary>
      <div class="tips-body">
        <p><strong>给分原则（避免纠纷和倦怠）</strong></p>
        <p><strong>即时反馈为主：</strong>训练/比赛中，发现球员完成某一指标后立即口头表扬并告知"加X分"，效果最佳。</p>
        <p><strong>延迟抽查为辅：</strong>对于"无效跑动比例""战术纪律性"等需要教练全局观察的指标，可在训练结束后统一回忆给分。</p>
        <p><strong>允许球员申诉：</strong>球员若认为自己完成了某项指标但教练未记录，可在训练后向教练提出并提供证据（如自己拍摄的短视频），教练审核后补分。</p>
        <p><strong>给分透明：</strong>每周公布一次积分榜（隐藏末尾几位球员姓名，用代号保护隐私），让球员看到自己的进步。</p>
        <p><strong>把得分权交给球员：</strong>鼓励球员互相评价（如"我觉得队友今天有个很好的无球跑位"），经教练确认后加分，培养团队观察力和互相欣赏。</p>
        <p><strong>不要忘记表扬：</strong>积分只是工具，教练的口头肯定"你今天那个回追太棒了"往往比+10分更能激励孩子。</p>
      </div>
    </details>

    <!-- Status -->
    <Transition name="toast">
      <div v-if="statusMessage" class="status-toast success">{{ statusMessage }}</div>
    </Transition>
    <Transition name="toast">
      <div v-if="statusError" class="status-toast error">{{ statusError }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { coachApi } from '@/api'

interface Player {
  id: string
  name: string
  avatar: string
  currentPoints: number
}

interface Indicator {
  id: string
  dimensionId: string
  name: string
  criteria: string
  defaultPoints: number
  dailyLimit: number
  isActive: boolean
}

interface Dimension {
  id: string
  name: string
  icon: string
  indicators: Indicator[]
}

interface CustomIndicator {
  id: string
  coachId: string
  name: string
  defaultPoints: number
  dailyLimit: number
  isActive: boolean
}

const players = ref<Player[]>([])
const dimensions = ref<Dimension[]>([])
const customIndicators = ref<CustomIndicator[]>([])
const selectedIds = ref<string[]>([])
const batchMode = ref(false)
const statusMessage = ref('')
const statusError = ref('')
const dailyCounts = ref<Record<string, number>>({})

const showAddCustom = ref(false)
const editingCustom = ref<CustomIndicator | null>(null)
const menuCustom = ref<CustomIndicator | null>(null)
const customForm = ref({ name: '', defaultPoints: 5, dailyLimit: 20 })

const quickPoints = ref<number | null>(null)
const quickReason = ref('')

onMounted(async () => {
  try {
    const [pRes, dRes, cRes] = await Promise.all([
      coachApi.getPlayers(),
      coachApi.getDimensions(),
      coachApi.getCustomIndicators(),
    ])
    players.value = (pRes.data.data || [])
    dimensions.value = (dRes.data.data || [])
      .filter((d: any) => d.isActive !== false)
      .map((d: any) => ({
        ...d,
        indicators: (d.indicators || []).filter((i: any) => i.isActive !== false),
      }))
    customIndicators.value = (cRes.data.data || [])
      .filter((c: any) => c.isActive !== false)
  } catch (e) {
    console.error('Failed to load data', e)
  }
})

const selectedNames = computed(() => {
  return players.value
    .filter(p => selectedIds.value.includes(p.id))
    .map(p => p.name)
    .join('、')
})

const canQuickScore = computed(() => {
  return selectedIds.value.length > 0 && quickPoints.value != null && Number(quickPoints.value) !== 0
})

function isImageAvatar(avatar: string): boolean {
  return avatar.startsWith('/')
}

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function togglePlayer(id: string) {
  if (batchMode.value) {
    const idx = selectedIds.value.indexOf(id)
    if (idx >= 0) selectedIds.value.splice(idx, 1)
    else selectedIds.value.push(id)
  } else {
    selectedIds.value = [id]
  }
}

function getDailyCount(indicatorId: string): number {
  return dailyCounts.value[indicatorId] || 0
}

function isAtLimit(indicatorId: string, limit: number): boolean {
  return getDailyCount(indicatorId) >= limit
}

async function handleIndicatorScore(indicator: Indicator) {
  if (isAtLimit(indicator.id, indicator.dailyLimit)) {
    statusError.value = `${indicator.name} 今日已达上限`
    setTimeout(() => statusError.value = '', 2000)
    return
  }
  statusMessage.value = ''
  statusError.value = ''
  try {
    for (const playerId of selectedIds.value) {
      await coachApi.addScore({
        playerId,
        indicatorId: indicator.id,
        points: indicator.defaultPoints,
        type: indicator.defaultPoints > 0 ? 'earn' : 'penalty',
        reason: indicator.name,
      })
      dailyCounts.value[indicator.id] = (dailyCounts.value[indicator.id] || 0) + indicator.defaultPoints
    }
    statusMessage.value = `成功为 ${selectedIds.value.length} 名球员加 ${indicator.defaultPoints} 分 (${indicator.name})`
    setTimeout(() => statusMessage.value = '', 2500)
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '记分失败'
    setTimeout(() => statusError.value = '', 2500)
  }
}

async function handleCustomIndicatorScore(ci: CustomIndicator) {
  if (isAtLimit(ci.id, ci.dailyLimit)) {
    statusError.value = `${ci.name} 今日已达上限`
    setTimeout(() => statusError.value = '', 2000)
    return
  }
  statusMessage.value = ''
  statusError.value = ''
  try {
    for (const playerId of selectedIds.value) {
      await coachApi.addScore({
        playerId,
        indicatorId: ci.id,
        points: ci.defaultPoints,
        type: ci.defaultPoints > 0 ? 'earn' : 'penalty',
        reason: ci.name,
      })
      dailyCounts.value[ci.id] = (dailyCounts.value[ci.id] || 0) + ci.defaultPoints
    }
    statusMessage.value = `成功为 ${selectedIds.value.length} 名球员加 ${ci.defaultPoints} 分 (${ci.name})`
    setTimeout(() => statusMessage.value = '', 2500)
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '记分失败'
    setTimeout(() => statusError.value = '', 2500)
  }
}

async function handleQuickScore(isAdd: boolean) {
  if (!canQuickScore.value) return
  statusMessage.value = ''
  statusError.value = ''
  const points = isAdd ? Math.abs(Number(quickPoints.value)) : -Math.abs(Number(quickPoints.value))
  try {
    for (const playerId of selectedIds.value) {
      await coachApi.addScore({
        playerId,
        indicatorId: null,
        points,
        type: points > 0 ? 'earn' : 'penalty',
        reason: quickReason.value || '自定义记分',
      })
    }
    statusMessage.value = `成功为 ${selectedIds.value.length} 名球员${isAdd ? '加' : '扣'}${Math.abs(points)} 分`
    quickPoints.value = null
    quickReason.value = ''
    setTimeout(() => statusMessage.value = '', 2500)
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '记分失败'
    setTimeout(() => statusError.value = '', 2500)
  }
}

function openCustomMenu(ci: CustomIndicator) {
  menuCustom.value = ci
}

function editCustomIndicator(ci: CustomIndicator) {
  editingCustom.value = ci
  customForm.value = { name: ci.name, defaultPoints: ci.defaultPoints, dailyLimit: ci.dailyLimit }
  menuCustom.value = null
  showAddCustom.value = true
}

async function saveCustomIndicator() {
  if (!customForm.value.name) return
  try {
    if (editingCustom.value) {
      await coachApi.updateCustomIndicator(editingCustom.value.id, {
        name: customForm.value.name,
        defaultPoints: customForm.value.defaultPoints,
        dailyLimit: customForm.value.dailyLimit,
      })
      const idx = customIndicators.value.findIndex(c => c.id === editingCustom.value!.id)
      if (idx >= 0) {
        customIndicators.value[idx] = { ...editingCustom.value, ...customForm.value }
      }
    } else {
      const res = await coachApi.createCustomIndicator({
        name: customForm.value.name,
        defaultPoints: customForm.value.defaultPoints,
        dailyLimit: customForm.value.dailyLimit,
      })
      customIndicators.value.push(res.data.data)
    }
    showAddCustom.value = false
    editingCustom.value = null
    customForm.value = { name: '', defaultPoints: 5, dailyLimit: 20 }
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '保存失败'
    setTimeout(() => statusError.value = '', 2500)
  }
}

async function deleteCustomIndicator(ci: CustomIndicator) {
  if (!confirm(`确定删除指标「${ci.name}」？`)) return
  try {
    await coachApi.deleteCustomIndicator(ci.id)
    customIndicators.value = customIndicators.value.filter(c => c.id !== ci.id)
    menuCustom.value = null
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '删除失败'
    setTimeout(() => statusError.value = '', 2500)
  }
}
</script>

<style scoped>
.score-page {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Player Bar */
.player-bar {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 12px 14px;
}

.bar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.bar-title {
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

.batch-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.batch-toggle input {
  display: none;
}

.toggle-track {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: #e5e7eb;
  position: relative;
  transition: background 0.2s;
}

.batch-toggle input:checked + .toggle-track {
  background: #22c55e;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s;
}

.batch-toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(18px);
}

.toggle-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.player-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.player-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  min-width: 72px;
  border-radius: 14px;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.player-chip:hover {
  background: rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.player-chip.selected {
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  box-shadow: 0 4px 12px rgba(66, 165, 245, 0.3);
}

.chip-avatar {
  font-size: 28px;
  line-height: 1;
}

.chip-avatar-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.chip-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  color: #333;
}

.player-chip.selected .chip-name {
  color: white;
}

.chip-check {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #22c55e;
  color: white;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-hint {
  margin-top: 10px;
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-btn {
  padding: 2px 10px;
  border-radius: 6px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: #888;
  font-size: 12px;
  cursor: pointer;
}

.clear-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Two Column Layout */
.score-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 767px) {
  .score-columns {
    grid-template-columns: 1fr;
  }
}

.left-area,
.right-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.area-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.area-icon {
  font-size: 16px;
}

.area-title {
  font-size: 13px;
  font-weight: 700;
  color: #333;
  flex: 1;
}

.area-sub {
  font-size: 11px;
  color: #999;
}

.area-add {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.area-add:hover {
  opacity: 0.9;
}

/* Dimensions */
.dimensions-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.dim-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.dim-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #333;
}

.dim-icon {
  font-size: 14px;
}

.dim-name {
  flex: 1;
}

.dim-body {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  padding: 0 10px 10px;
}

@media (min-width: 768px) {
  .dim-body {
    grid-template-columns: repeat(4, 1fr);
  }
}

.indicator-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 6px 4px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.indicator-btn:hover:not(.disabled) {
  border-color: #42a5f5;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(66, 165, 245, 0.15);
}

.indicator-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.indicator-btn.custom {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-color: rgba(234, 179, 8, 0.2);
}

.indicator-btn.custom:hover:not(.disabled) {
  border-color: #f59e0b;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
}

.ind-name {
  font-size: 11px;
  font-weight: 600;
  color: #333;
  text-align: center;
  line-height: 1.3;
}

.ind-points {
  font-size: 12px;
  font-weight: 800;
  color: #16a34a;
  font-family: var(--font-num);
}

.ind-limit {
  font-size: 9px;
  color: #999;
}

.ind-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, #42a5f5, #1e88e5);
  border-radius: 0 0 0 6px;
  transition: width 0.3s;
}

.indicator-btn.custom .ind-progress {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.ind-menu {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 12px;
  color: #999;
  padding: 0 2px;
  cursor: pointer;
}

.ind-menu:hover {
  color: #333;
}

/* Custom List */
.custom-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.custom-empty {
  grid-column: 1 / -1;
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: #999;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
}

/* Quick Score Bar */
.quick-score-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 10px 14px;
}

.quick-input {
  width: 70px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: #333;
  font-size: 13px;
  outline: none;
}

.quick-input.flex {
  flex: 1;
  width: auto;
}

.quick-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 2px rgba(66, 165, 245, 0.15);
}

.btn-add-mini, .btn-sub-mini {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-add-mini {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.btn-sub-mini {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.btn-add-mini:hover:not(:disabled),
.btn-sub-mini:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-add-mini:disabled,
.btn-sub-mini:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}

.modal-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

.menu-card {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 200px;
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0 0 14px 0;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-row {
  display: flex;
  gap: 10px;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.modal-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: #333;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.modal-input.short {
  flex: 1;
  min-width: 0;
}

.modal-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.15);
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.06);
  color: #666;
}

.btn-confirm {
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
}

.btn-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.menu-item {
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.menu-item.delete {
  color: #dc2626;
}

/* Tips */
.tips-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 14px 16px;
  font-size: 13px;
  color: #666;
}

.tips-panel summary {
  font-weight: 600;
  color: #333;
  cursor: pointer;
  list-style: none;
}

.tips-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tips-body p {
  line-height: 1.5;
}

/* Toast */
.status-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 28px;
  border-radius: 28px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.status-toast.success {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.status-toast.error {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

/* Transitions */
.fold-enter-active, .fold-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.fold-enter-from, .fold-leave-to {
  opacity: 0;
  max-height: 0;
}

.fold-enter-to, .fold-leave-from {
  opacity: 1;
  max-height: 800px;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
