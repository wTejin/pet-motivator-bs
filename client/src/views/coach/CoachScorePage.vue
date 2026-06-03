<template>
  <div class="score-page">
    <div class="page-container">
    <!-- Player Selector -->
    <div class="player-bar">
      <div class="bar-header">
        <h3 class="bar-title">选择球员</h3>
        <label class="batch-toggle">
          <input v-model="batchMode" type="checkbox" />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span class="toggle-label">批量模式</span>
        </label>
      </div>
      <div class="player-scroll">
        <button
          v-for="player in players" :key="player.id"
          class="player-chip" :class="{ selected: isSelected(player.id) }"
          @click="togglePlayer(player.id)"
        >
          <img v-if="isImageAvatar(player.avatar)" :src="player.avatar" class="chip-avatar-img" alt="avatar" />
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

    <!-- Three Section Layout -->
    <div v-if="selectedIds.length > 0" class="score-sections">
      <!-- Section 1+2: 每日评估 | 行为激励 (左右并排) -->
      <div class="two-col">
        <!-- 左: 每日评估 -->
        <div class="section-panel">
          <div class="area-header">
            <span class="area-icon">🧬</span>
            <span class="area-title">每日评估</span>
            <span class="area-sub">6维度 + 子指标</span>
          </div>
          <div class="assess-list">
            <div v-for="dim in BIO_LEAP_DIMENSIONS" :key="dim.key" class="assess-dim-block" :class="{ expanded: expandedDim === dim.key, 'has-computed': computedDimScore(dim.key) > 0 }">
              <div class="assess-dim-header" @click="expandedDim = expandedDim === dim.key ? null : dim.key">
                <span class="assess-dim-icon">{{ dim.icon }}</span>
                <span class="assess-dim-name">{{ dim.name }}</span>
                <span class="assess-dim-hint">{{ dim.description?.slice(0,12) }}</span>
                <!-- 无子指标的维度（techExec/engagement）：手动打星 -->
                <div v-if="!subIndicators[dim.key]" class="star-row">
                  <button v-for="s in 5" :key="s" class="star-btn" :class="{ active: (assessForm[dim.key] || 0) >= s }" @click.stop="assessForm[dim.key] = s">{{ (assessForm[dim.key] || 0) >= s ? '★' : '☆' }}</button>
                </div>
                <!-- 有子指标的维度：自动计算优先，手动兜底 -->
                <div v-else class="dim-score-area">
                  <div v-if="computedDimScore(dim.key) > 0" class="computed-score" :title="'子指标均值：' + computedDimScore(dim.key) + '★'">
                    <span v-for="s in 5" :key="s" class="star-static" :class="{ active: computedDimScore(dim.key) >= s }">{{ computedDimScore(dim.key) >= s ? '★' : '☆' }}</span>
                    <span class="computed-tag">自动</span>
                  </div>
                  <div v-else class="star-row">
                    <button v-for="s in 5" :key="s" class="star-btn" :class="{ active: (assessForm[dim.key] || 0) >= s }" @click.stop="assessForm[dim.key] = s">{{ (assessForm[dim.key] || 0) >= s ? '★' : '☆' }}</button>
                  </div>
                </div>
                <span class="expand-arrow">{{ expandedDim === dim.key ? '▾' : '▸' }}</span>
              </div>
              <!-- 二级子指标 -->
              <div v-if="expandedDim === dim.key && subIndicators[dim.key]" class="sub-indicators">
                <div v-for="sub in subIndicators[dim.key]" :key="sub.key" class="sub-row">
                  <div class="sub-info">
                    <span class="sub-name">{{ sub.name }}</span>
                    <span class="sub-desc">{{ sub.description }}</span>
                  </div>
                  <div class="star-row">
                    <button v-for="s in 5" :key="s" class="star-btn-sm" :class="{ active: (assessForm[sub.key] || 0) >= s }" @click.stop="assessForm[sub.key] = s">{{ (assessForm[sub.key] || 0) >= s ? '★' : '☆' }}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bio-field" style="margin-top:8px">
            <label class="bio-label">备注（可选）</label>
            <input v-model="assessForm.notes" type="text" placeholder="训练表现备注..." class="bio-input" />
          </div>
          <button class="btn-submit" :disabled="!canSubmitAssess" @click="submitAssessment">📝 提交评估</button>
        </div>

        <!-- 右: 行为激励 -->
        <div class="section-panel">
          <div class="area-header">
            <span class="area-icon">🌟</span>
            <span class="area-title">行为激励</span>
            <span class="area-sub">品德/习惯加分</span>
            <button class="area-add" @click="showAddCustom = true">＋</button>
          </div>
          <div class="custom-list">
            <button
              v-for="ci in customIndicators" :key="ci.id"
              class="indicator-btn custom"
              :class="{ disabled: isAtLimit(ci.id, ci.dailyLimit) }"
              @click="handleCustomIndicatorScore(ci)"
            >
              <span class="ind-name">{{ ci.name }}</span>
              <span class="ind-points">+{{ ci.defaultPoints }}</span>
              <span class="ind-limit">{{ getDailyCount(ci.id) }}/{{ ci.dailyLimit }}</span>
              <div class="ind-progress" :style="{ width: Math.min(100, (getDailyCount(ci.id) / ci.dailyLimit) * 100) + '%' }"></div>
              <span class="ind-menu" @click.stop="openCustomMenu(ci)">⋯</span>
            </button>
            <div v-if="customIndicators.length === 0" class="custom-empty">暂无行为激励项，点击上方 ＋ 添加</div>
          </div>
          <div class="quick-score-bar">
            <input v-model.number="quickPoints" type="number" placeholder="分数" class="quick-input" />
            <input v-model="quickReason" type="text" placeholder="原因（可选）" class="quick-input flex" />
            <button class="btn-add-mini" :disabled="!canQuickScore" @click="handleQuickScore(true)">＋加分</button>
            <button class="btn-sub-mini" :disabled="!canQuickScore" @click="handleQuickScore(false)">－扣分</button>
          </div>
        </div>
      </div>
    </div>

      <!-- Section 3: 体测数据（单人录入 — 每月/每季度测试） -->
      <details class="section-panel" :class="{ blocked: !isSinglePlayer }">
        <summary class="area-header collapse-trigger">
          <span class="area-icon">📏</span>
          <span class="area-title">体测数据</span>
          <span class="area-sub">身体测量 + 运动表现（每月/每季度测试）</span>
          <span class="collapse-arrow">▸</span>
        </summary>
        <!-- 多人选中时提示 -->
        <div v-if="!isSinglePlayer" class="blocked-hint">
          ⚠️ 身高/体重/坐高是个人数据，不可批量录入。请仅选择 <strong>1 名</strong> 球员。
        </div>
        <div class="bio-form" :class="{ disabled: !isSinglePlayer }">
          <div class="bio-columns">
            <!-- 左栏：身体测量 + 速度/爆发力 -->
            <div class="bio-col">
              <div class="bio-group-label">📐 身体测量 <span class="bio-hint">每月/每季度测一次即可</span></div>
              <div class="bio-inline-row">
                <div class="bio-field-inline">
                  <label class="bio-label-inline">身高</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="bioForm.heightCm" type="number" step="0.1" placeholder="145.5" class="bio-input-narrow" /><span class="bio-unit">cm</span>
                  </div>
                </div>
                <div class="bio-field-inline">
                  <label class="bio-label-inline">体重</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="bioForm.weightKg" type="number" step="0.1" placeholder="38.0" class="bio-input-narrow" /><span class="bio-unit">kg</span>
                  </div>
                </div>
                <div class="bio-field-inline">
                  <label class="bio-label-inline">坐高</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="bioForm.sittingHeightCm" type="number" step="0.1" placeholder="75.0" class="bio-input-narrow" /><span class="bio-unit">cm</span>
                  </div>
                </div>
              </div>

              <div class="bio-group-label">⚡ 速度/爆发力 <span class="bio-hint">每月/每季度测一次即可</span></div>
              <div class="bio-inline-row">
                <div class="bio-field-inline">
                  <label class="bio-label-inline">0-10m启动</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="ptForm.sprint10m" type="number" step="0.01" placeholder="2.10" class="bio-input-narrow" /><span class="bio-unit">s</span>
                  </div>
                </div>
                <div class="bio-field-inline">
                  <label class="bio-label-inline">10-30m冲刺</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="ptForm.sprint30m" type="number" step="0.01" placeholder="3.50" class="bio-input-narrow" /><span class="bio-unit">s</span>
                  </div>
                </div>
                <div class="bio-field-inline">
                  <label class="bio-label-inline">垂直弹跳</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="ptForm.verticalJump" type="number" step="0.1" placeholder="35" class="bio-input-narrow" /><span class="bio-unit">cm</span>
                  </div>
                </div>
                <div class="bio-field-inline">
                  <label class="bio-label-inline" title="Illinois/505 折返跑测试，秒数越少越敏捷。U12: 16-18s, U15: 14-16s">敏捷性 ℹ️</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="ptForm.agility" type="number" step="0.01" placeholder="15.0" class="bio-input-narrow" title="敏捷性测试秒数，越小越好。常见范围 13-19s" /><span class="bio-unit">s</span>
                  </div>
                </div>
                <div class="bio-field-inline">
                  <label class="bio-label-inline" title="Yo-Yo IR1 间歇恢复跑，级别越高耐力越好。U12: 8-12级, U15: 10-14级">耐力YOYO ℹ️</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="ptForm.endurance" type="number" step="0.1" placeholder="12" class="bio-input-narrow" title="YOYO IR1 级别，越大越好。常见范围 6-18 级" /><span class="bio-unit">级</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右栏：技术评分 + 父母数据 -->
            <div class="bio-col">
              <div class="bio-group-label">🎯 技术评分 (1-5) <span class="bio-hint">每月/每季度测一次即可</span></div>
              <div class="tech-grid">
                <div class="tech-cell" v-for="t in PT_TECH_FIELDS" :key="t.key">
                  <label class="tech-cell-label">{{ t.name }}</label>
                  <div class="star-row-mini">
                    <button v-for="s in 5" :key="s" class="star-btn-xs" :class="{ active: (ptForm[t.key] || 0) >= s }" @click="ptForm[t.key] = s">{{ (ptForm[t.key] || 0) >= s ? '★' : '☆' }}</button>
                  </div>
                </div>
              </div>

              <div class="bio-group-label parent-label">👨‍👩‍👧 父母数据</div>
              <div class="parent-row">
                <div class="bio-field-inline">
                  <label class="bio-label-inline">父身高</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="parentForm.fatherHeightCm" type="number" step="0.1" placeholder="175" class="bio-input-narrow" /><span class="bio-unit">cm</span>
                  </div>
                </div>
                <div class="bio-field-inline">
                  <label class="bio-label-inline">母身高</label>
                  <div class="bio-input-wrap">
                    <input v-model.number="parentForm.motherHeightCm" type="number" step="0.1" placeholder="162" class="bio-input-narrow" /><span class="bio-unit">cm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button class="btn-submit" :disabled="!canSubmitBio" @click="submitBiometrics">💾 录入体测</button>
        </div>
      </details>

    <!-- Tips -->
    <details class="tips-panel">
      <summary>💡 评分建议</summary>
      <div class="tips-body">
        <p><strong>给分原则（避免纠纷和倦怠）</strong></p>
        <p><strong>即时反馈为主：</strong>训练/比赛中，发现球员完成某一指标后立即口头表扬并告知"加X分"，效果最佳。</p>
        <p><strong>延迟抽查为辅：</strong>对于需要教练全局观察的指标，可在训练结束后统一回忆给分。</p>
        <p><strong>允许球员申诉：</strong>球员若认为自己完成了某项指标但教练未记录，可在训练后向教练提出并提供证据，教练审核后补分。</p>
      </div>
    </details>

    </div><!-- /page-container -->

    <!-- Custom Indicator Modal -->
    <div v-if="showAddCustom" class="modal-overlay" @click.self="showAddCustom = false">
      <div class="modal-card">
        <h4 class="modal-title">{{ editingCustom ? '编辑激励项' : '添加行为激励' }}</h4>
        <div class="modal-body">
          <div class="modal-field">
            <label class="modal-label">激励项名称</label>
            <input v-model="customForm.name" type="text" placeholder="如：帮助队友" class="modal-input" />
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

    <!-- Custom Menu -->
    <div v-if="menuCustom" class="modal-overlay" @click.self="menuCustom = null">
      <div class="modal-card menu-card">
        <button class="menu-item" @click="editCustomIndicator(menuCustom)">✏️ 编辑</button>
        <button class="menu-item delete" @click="deleteCustomIndicator(menuCustom)">🗑️ 删除</button>
        <button class="menu-item" @click="menuCustom = null">取消</button>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="statusMessage" class="status-toast success">{{ statusMessage }}</div>
    </Transition>
    <Transition name="toast">
      <div v-if="statusError" class="status-toast error">{{ statusError }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { coachApi, assessmentApi, physicalTestApi } from '@/api'
import { BIO_LEAP_DIMENSIONS, BIO_LEAP_SUB_INDICATORS } from '@shared/types'

const PT_TECH_FIELDS = [
  { key: 'firstTouch', name: '第一脚触球' },
  { key: 'weakFoot', name: '非惯用脚' },
  { key: 'shootingPower', name: '射门精度' },
  { key: 'passingAccuracy', name: '传球精度' },
  { key: 'workRate', name: '跑动覆盖' },
]

interface Player {
  id: string; name: string; avatar: string; currentPoints: number
}

interface CustomIndicator {
  id: string; coachId: string; name: string; defaultPoints: number; dailyLimit: number; isActive: boolean
}

const players = ref<Player[]>([])
const customIndicators = ref<CustomIndicator[]>([])
const selectedIds = ref<string[]>([])
const batchMode = ref(false)
const statusMessage = ref('')
const statusError = ref('')
const dailyCounts = ref<Record<string, number>>({})

// 子指标映射 (每维度 → 子指标列表)
const subIndicators: Record<string, { key: string; name: string; description: string }[]> = {}
for (const group of BIO_LEAP_SUB_INDICATORS) {
  subIndicators[group.dimKey] = group.subs
}
const expandedDim = ref<string | null>(null)

// ── 父维度自动计算：子指标≥2个已填 → 取均值 ──
const SUB_INDICATOR_MAP: Record<string, string[]> = {
  spatialIq:  ['subScanRate', 'subDecisionSpeed', 'subOffBallMove'],
  resilience: ['subRecoveryReact', 'subReengageDef', 'subConfToReceive'],
  altruism:   ['subCommunication', 'subCoverTeam', 'subUnfamiliarPos'],
  envNoise:   ['subParentBehavior', 'subAttendance', 'subSelfSufficient'],
}

function computedDimScore(dimKey: string): number {
  const subKeys = SUB_INDICATOR_MAP[dimKey]
  if (!subKeys) return 0
  const scores: number[] = []
  for (const key of subKeys) {
    const v = assessForm[key]
    if (typeof v === 'number' && v >= 1 && v <= 5) scores.push(v)
  }
  if (scores.length < 2) return 0 // 需要≥2个子指标才自动计算
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
}

// 有子指标的维度列表
const DIMS_WITH_SUBS = Object.keys(SUB_INDICATOR_MAP)
// 无子指标的维度（必须手动打分）
const DIMS_WITHOUT_SUBS = ['techExec', 'engagement']

// 获取维度的有效分数（优先自动计算，其次手动）
function effectiveDimScore(dimKey: string): number {
  if (DIMS_WITH_SUBS.includes(dimKey)) {
    const computed = computedDimScore(dimKey)
    if (computed > 0) return computed
  }
  return (assessForm as any)[dimKey] || 0
}

// 体测表单
const bioForm = reactive({ heightCm: null as number | null, weightKg: null as number | null, sittingHeightCm: null as number | null })
// 父母身高（写入 Player 表）
const parentForm = reactive({ fatherHeightCm: null as number | null, motherHeightCm: null as number | null })
// 运动表现体测
const ptForm = reactive<Record<string, number | null>>({
  sprint10m: null, sprint30m: null, verticalJump: null, agility: null, endurance: null,
  ...Object.fromEntries(PT_TECH_FIELDS.map(t => [t.key, null])),
})

// 评估表单 (6维 + 12子指标 + 备注)
const assessForm = reactive<Record<string, any>>({
  spatialIq: 0, techExec: 0, engagement: 0, resilience: 0, altruism: 0, envNoise: 0, notes: '',
  ...Object.fromEntries(
    Object.values(subIndicators).flat().map(s => [s.key, 0])
  ),
})

// 自定义加分
const showAddCustom = ref(false)
const editingCustom = ref<CustomIndicator | null>(null)
const menuCustom = ref<CustomIndicator | null>(null)
const customForm = reactive({ name: '', defaultPoints: 5, dailyLimit: 20 })
const quickPoints = ref<number | null>(null)
const quickReason = ref('')

onMounted(async () => {
  try {
    const [pRes, cRes] = await Promise.all([
      coachApi.getPlayers(),
      coachApi.getCustomIndicators(),
    ])
    players.value = (pRes.data.data || [])
    customIndicators.value = (cRes.data.data || []).filter((c: any) => c.isActive !== false)
  } catch (e) { console.error('Failed to load data', e) }
})

const selectedNames = computed(() => players.value.filter(p => selectedIds.value.includes(p.id)).map(p => p.name).join('、'))
const canQuickScore = computed(() => selectedIds.value.length > 0 && quickPoints.value != null && Number(quickPoints.value) !== 0)
// 生物测量仅单人（身高体重坐高不可能多人相同）
const isSinglePlayer = computed(() => selectedIds.value.length === 1)
const canSubmitBio = computed(() => {
  if (!isSinglePlayer.value) return false
  return (bioForm.heightCm && bioForm.weightKg && bioForm.sittingHeightCm != null) || Object.values(ptForm).some(v => v != null)
})
const canSubmitAssess = computed(() => {
  if (selectedIds.value.length === 0) return false
  // 每维度：自动计算分≥1 或 手动打分≥1
  return BIO_LEAP_DIMENSIONS.every(d => effectiveDimScore(d.key) >= 1 && effectiveDimScore(d.key) <= 5)
})

function isImageAvatar(a: string) { return a.startsWith('/') }
function isSelected(id: string) { return selectedIds.value.includes(id) }
function togglePlayer(id: string) {
  if (batchMode.value) {
    const idx = selectedIds.value.indexOf(id)
    if (idx >= 0) selectedIds.value.splice(idx, 1)
    else selectedIds.value.push(id)
  } else { selectedIds.value = [id] }
}

// 选中单人时加载父母身高数据
watch(selectedIds, async (ids) => {
  if (ids.length === 1) {
    const pid = ids[0]
    // 从 players 列表中取数据（可能不含 parent heights，需调 detail）
    try {
      const res = await coachApi.getPlayerDetail(pid)
      const p = (res.data as any)?.data?.player
      if (p) {
        parentForm.fatherHeightCm = p.fatherHeightCm ?? null
        parentForm.motherHeightCm = p.motherHeightCm ?? null
      }
    } catch { /* ignore */ }
  } else {
    parentForm.fatherHeightCm = null
    parentForm.motherHeightCm = null
  }
}, { immediate: false })

function getDailyCount(iid: string) { return dailyCounts.value[iid] || 0 }
function isAtLimit(iid: string, limit: number) { return getDailyCount(iid) >= limit }

// ── 体测提交（限单人 — 身高体重等数据不可批量复用）──
async function submitBiometrics() {
  if (!canSubmitBio.value) return
  statusError.value = ''
  const pid = selectedIds.value[0]
  try {
    // 身体测量
    if (bioForm.heightCm && bioForm.weightKg && bioForm.sittingHeightCm != null) {
      await coachApi.postBiometrics(pid, {
        heightCm: bioForm.heightCm, weightKg: bioForm.weightKg, sittingHeightCm: bioForm.sittingHeightCm,
      })
    }
    // 运动表现体测
    const ptData: Record<string, any> = {}
    for (const [k, v] of Object.entries(ptForm)) { if (v != null) ptData[k] = v }
    if (Object.keys(ptData).length > 0) {
      await physicalTestApi.create({ playerId: pid, ...ptData })
    }
    // 父母身高（写入 Player 记录）
    if (parentForm.fatherHeightCm != null || parentForm.motherHeightCm != null) {
      const parentPayload: Record<string, unknown> = {}
      if (parentForm.fatherHeightCm != null) parentPayload.fatherHeightCm = parentForm.fatherHeightCm
      if (parentForm.motherHeightCm != null) parentPayload.motherHeightCm = parentForm.motherHeightCm
      await coachApi.updatePlayer(pid, parentPayload)
    }
    const pname = players.value.find(p => p.id === pid)?.name || ''
    statusMessage.value = `已为「${pname}」录入体测数据`
    setTimeout(() => statusMessage.value = '', 2500)
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '体测录入失败'
    setTimeout(() => statusError.value = '', 3000)
  }
}

// ── 每日评估提交（批量）──
async function submitAssessment() {
  if (!canSubmitAssess.value) return
  statusError.value = ''
  try {
    for (const pid of selectedIds.value) {
      // 构建评估数据：用有效维度分（子指标自动计算优先，手动打分兜底）
      const body: Record<string, any> = {
        playerId: pid,
        notes: assessForm.notes || null,
      }
      for (const dim of BIO_LEAP_DIMENSIONS) {
        body[dim.key] = effectiveDimScore(dim.key)
      }
      // 附带所有子指标原始值
      for (const subs of Object.values(SUB_INDICATOR_MAP)) {
        for (const key of subs) {
          const v = assessForm[key]
          if (typeof v === 'number' && v >= 1 && v <= 5) body[key] = v
        }
      }
      await assessmentApi.create(body)
    }
    statusMessage.value = `已为 ${selectedIds.value.length} 名球员提交评估`
    setTimeout(() => statusMessage.value = '', 2500)
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '评估提交失败'
    setTimeout(() => statusError.value = '', 3000)
  }
}

// ── 行为激励（教练自定义品德/习惯加分）──
async function handleCustomIndicatorScore(ci: CustomIndicator) {
  if (isAtLimit(ci.id, ci.dailyLimit)) { statusError.value = `${ci.name} 今日已达上限`; setTimeout(() => statusError.value = '', 2000); return }
  try {
    for (const pid of selectedIds.value) {
      await coachApi.addScore({ playerId: pid, indicatorId: ci.id, points: ci.defaultPoints, type: 'bonus', reason: ci.name })
      dailyCounts.value[ci.id] = (dailyCounts.value[ci.id] || 0) + ci.defaultPoints
    }
    statusMessage.value = `成功为 ${selectedIds.value.length} 名球员加 ${ci.defaultPoints} 分 (${ci.name})`
    setTimeout(() => statusMessage.value = '', 2500)
  } catch (e: any) { statusError.value = e.response?.data?.error || '记分失败'; setTimeout(() => statusError.value = '', 2500) }
}

async function handleQuickScore(isAdd: boolean) {
  if (!canQuickScore.value) return
  const points = isAdd ? Math.abs(Number(quickPoints.value)) : -Math.abs(Number(quickPoints.value))
  try {
    for (const pid of selectedIds.value) {
      await coachApi.addScore({ playerId: pid, indicatorId: null, points, type: points > 0 ? 'bonus' : 'penalty', reason: quickReason.value || '教练记分' })
    }
    statusMessage.value = `成功为 ${selectedIds.value.length} 名球员${isAdd ? '加' : '扣'}${Math.abs(points)} 分`
    quickPoints.value = null; quickReason.value = ''
    setTimeout(() => statusMessage.value = '', 2500)
  } catch (e: any) { statusError.value = e.response?.data?.error || '记分失败'; setTimeout(() => statusError.value = '', 2500) }
}

function openCustomMenu(ci: CustomIndicator) { menuCustom.value = ci }
function editCustomIndicator(ci: CustomIndicator) {
  editingCustom.value = ci; customForm.name = ci.name; customForm.defaultPoints = ci.defaultPoints; customForm.dailyLimit = ci.dailyLimit
  menuCustom.value = null; showAddCustom.value = true
}
async function saveCustomIndicator() {
  if (!customForm.name) return
  try {
    if (editingCustom.value) {
      await coachApi.updateCustomIndicator(editingCustom.value.id, { name: customForm.name, defaultPoints: customForm.defaultPoints, dailyLimit: customForm.dailyLimit })
      const idx = customIndicators.value.findIndex(c => c.id === editingCustom.value!.id)
      if (idx >= 0) customIndicators.value[idx] = { ...editingCustom.value, ...customForm }
    } else {
      const res = await coachApi.createCustomIndicator({ name: customForm.name, defaultPoints: customForm.defaultPoints, dailyLimit: customForm.dailyLimit })
      customIndicators.value.push(res.data.data)
    }
    showAddCustom.value = false; editingCustom.value = null; customForm.name = ''; customForm.defaultPoints = 5; customForm.dailyLimit = 20
  } catch (e: any) { statusError.value = e.response?.data?.error || '保存失败'; setTimeout(() => statusError.value = '', 2500) }
}
async function deleteCustomIndicator(ci: CustomIndicator) {
  if (!confirm(`确定删除激励项「${ci.name}」？`)) return
  try { await coachApi.deleteCustomIndicator(ci.id); customIndicators.value = customIndicators.value.filter(c => c.id !== ci.id); menuCustom.value = null }
  catch (e: any) { statusError.value = e.response?.data?.error || '删除失败'; setTimeout(() => statusError.value = '', 2500) }
}
</script>

<style scoped>
/* ════════════════════════════════════
   页面根层
   ════════════════════════════════════ */
.score-page {
  display: flex;
  flex-direction: column;
}

/* 统一居中容器 */
.page-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Player Bar */
.player-bar { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); padding: 12px 14px; }
.bar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.bar-title { font-size: 15px; font-weight: 700; color: #333; }
.batch-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.batch-toggle input { display: none; }
.toggle-track { width: 40px; height: 22px; border-radius: 11px; background: #e5e7eb; position: relative; transition: background 0.2s; }
.batch-toggle input:checked + .toggle-track { background: #22c55e; }
.toggle-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: transform 0.2s; }
.batch-toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(18px); }
.toggle-label { font-size: 13px; color: #666; font-weight: 500; }
.player-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
.player-chip { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 14px; min-width: 72px; border-radius: 14px; border: 2px solid transparent; background: rgba(0,0,0,0.04); cursor: pointer; transition: all 0.2s; position: relative; }
.player-chip:hover { background: rgba(0,0,0,0.08); transform: translateY(-2px); }
.player-chip.selected { background: linear-gradient(135deg, #42a5f5, #1e88e5); color: white; box-shadow: 0 4px 12px rgba(66,165,245,0.3); }
.chip-avatar { font-size: 28px; line-height: 1; }
.chip-avatar-img { width: 28px; height: 28px; object-fit: contain; flex-shrink: 0; }
.chip-name { font-size: 13px; font-weight: 600; white-space: nowrap; color: #333; }
.player-chip.selected .chip-name { color: white; }
.chip-check { position: absolute; top: -4px; right: -4px; width: 18px; height: 18px; border-radius: 50%; background: #22c55e; color: white; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.selected-hint { margin-top: 10px; font-size: 13px; color: #666; display: flex; align-items: center; gap: 8px; }
.clear-btn { padding: 2px 10px; border-radius: 6px; border: none; background: rgba(0,0,0,0.06); color: #888; font-size: 12px; cursor: pointer; }

/* Three Section Layout */
.score-sections { display: flex; flex-direction: column; gap: 10px; }

/* Two Column (评估 | 行为激励) */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 767px) { .two-col { grid-template-columns: 1fr; } }
.section-panel { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); padding: 12px 14px; }
.area-header { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.area-icon { font-size: 16px; }
.area-title { font-size: 14px; font-weight: 700; color: #333; }
.area-sub { font-size: 11px; color: #999; margin-left: 4px; }
.area-add { margin-left: auto; width: 24px; height: 24px; border-radius: 50%; border: none; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

/* ── 体测单人限制 ── */
.section-panel.blocked { opacity: 0.7; }
.blocked-hint {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-size: 13px;
  color: #b45309;
  line-height: 1.5;
}
.bio-form.disabled {
  pointer-events: none;
  opacity: 0.4;
}

/* Bio Form — 两栏紧凑布局 */
.bio-form { display: flex; flex-direction: column; gap: 8px; }
.bio-form.disabled {
  pointer-events: none;
  opacity: 0.4;
}
/* 两栏网格 */
.bio-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
}
.bio-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.bio-group-label { font-size: 12px; font-weight: 700; color: #555; padding-top: 6px; margin-top: 2px; border-top: 1px solid rgba(0,0,0,0.05); }
.bio-hint { font-weight: 400; color: #999; font-size: 10px; margin-left: 4px; }
.bio-col:first-child .bio-group-label:first-child { border-top: none; margin-top: 0; padding-top: 0; }

/* 灵活行：自动换行、紧凑间距 */
.bio-inline-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: flex-end;
}
/* 字段组：标签在上，输入+单位在下 */
.bio-field-inline {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
}
.bio-label-inline {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  white-space: nowrap;
}
.bio-input-wrap {
  display: flex;
  align-items: center;
}
/* 窄输入：匹配真实数据宽度 */
.bio-input-narrow {
  width: 68px;
  padding: 7px 6px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.1);
  background: white;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-num, 'Russo One', monospace);
  text-align: center;
  outline: none;
  box-sizing: border-box;
}
.bio-input-narrow:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 2px rgba(66,165,245,0.15);
}
/* 单位后缀 */
.bio-unit {
  font-size: 11px;
  color: #999;
  margin-left: 3px;
  flex-shrink: 0;
}

/* ── 技术评分缩略网格 ── */
.tech-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
}
.tech-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 2px 4px;
  border-radius: 6px;
  background: rgba(0,0,0,0.02);
}
.tech-cell-label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
/* ── 父母数据行 ── */
.parent-label {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(0,0,0,0.06);
}
.parent-row {
  display: flex;
  gap: 10px;
}

/* 旧 grid 布局保留（如果没有用到就无所谓） */
.bio-row { display: grid; gap: 8px; }
.bio-row.cols-2 { grid-template-columns: repeat(2, 1fr); }
.bio-row.cols-3 { grid-template-columns: repeat(3, 1fr); }
.bio-row.cols-5 { grid-template-columns: repeat(5, 1fr); }
.bio-field { display: flex; flex-direction: column; gap: 4px; }
.bio-label { font-size: 11px; font-weight: 600; color: #666; }
.bio-input { padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); background: white; color: #333; font-size: 13px; outline: none; box-sizing: border-box; width: 100%; }
.bio-input:focus { border-color: #42a5f5; box-shadow: 0 0 0 2px rgba(66,165,245,0.15); }

/* Star Mini */
.star-row-mini { display: flex; gap: 1px; }
.star-btn-xs { font-size: 16px; background: none; border: none; cursor: pointer; color: #d1d5db; padding: 0; transition: transform 0.15s; }
.star-btn-xs.active { color: #f59e0b; }
.star-btn-xs:hover { transform: scale(1.2); }
.star-btn-sm { font-size: 14px; background: none; border: none; cursor: pointer; color: #ccc; padding: 0; transition: transform 0.15s; }
.star-btn-sm.active { color: #f59e0b; }
.star-btn-sm:hover { transform: scale(1.15); }

/* Assessment List */
.assess-list { display: flex; flex-direction: column; gap: 4px; }
.assess-dim-block { border-radius: 8px; background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.04); overflow: hidden; }
.assess-dim-block.expanded { border-color: rgba(66,165,245,0.2); background: rgba(66,165,245,0.03); }
.assess-dim-block.has-computed { border-color: rgba(16,185,129,0.1); background: rgba(16,185,129,0.02); }
.assess-dim-header { display: flex; align-items: center; gap: 6px; padding: 8px 10px; cursor: pointer; user-select: none; }
.assess-dim-header:hover { background: rgba(0,0,0,0.02); }
.assess-dim-icon { font-size: 16px; flex-shrink: 0; }
.assess-dim-name { font-size: 12px; font-weight: 700; color: #333; flex-shrink: 0; }
.assess-dim-hint { font-size: 10px; color: #999; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.star-row { display: flex; gap: 2px; flex-shrink: 0; }
.star-btn { font-size: 16px; background: none; border: none; cursor: pointer; color: #ccc; padding: 0; transition: transform 0.15s; }
.star-btn.active { color: #f59e0b; }
.star-btn:hover { transform: scale(1.2); }
.expand-arrow { font-size: 11px; color: #999; flex-shrink: 0; width: 16px; text-align: center; }

/* 父维度自动计算显示 */
.dim-score-area { flex-shrink: 0; }
.computed-score { display: flex; align-items: center; gap: 4px; }
.star-static {
  font-size: 14px;
  color: #ccc;
}
.star-static.active {
  color: #10b981; /* 绿色：自动计算 */
}
.computed-tag {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  white-space: nowrap;
}

/* Sub-indicators */
.sub-indicators { padding: 4px 10px 10px; border-top: 1px solid rgba(0,0,0,0.04); }
.sub-row { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
.sub-row + .sub-row { border-top: 1px solid rgba(0,0,0,0.02); }
.sub-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sub-name { font-size: 11px; font-weight: 600; color: #555; }
.sub-desc { font-size: 9px; color: #999; line-height: 1.3; }

/* Submit Button */
.btn-submit { padding: 10px 16px; border-radius: 10px; border: none; background: linear-gradient(135deg, #42a5f5, #1e88e5); color: white; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; width: 100%; margin-top: 8px; }
.btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-submit:hover:not(:disabled) { opacity: 0.9; }

/* Custom Indicators */
.custom-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-bottom: 8px; }
.custom-empty { grid-column: 1 / -1; padding: 20px; text-align: center; font-size: 12px; color: #999; background: rgba(255,255,255,0.5); border-radius: 10px; }

.indicator-btn { display: flex; flex-direction: column; align-items: center; gap: 0; padding: 6px 4px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.08); background: white; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
.indicator-btn:hover:not(.disabled) { border-color: #42a5f5; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(66,165,245,0.15); }
.indicator-btn.disabled { opacity: 0.4; cursor: not-allowed; }
.indicator-btn.custom { background: linear-gradient(135deg, #fef3c7, #fde68a); border-color: rgba(234,179,8,0.2); }
.ind-name { font-size: 11px; font-weight: 600; color: #333; text-align: center; line-height: 1.3; }
.ind-points { font-size: 12px; font-weight: 800; color: #16a34a; }
.ind-limit { font-size: 9px; color: #999; }
.ind-progress { position: absolute; bottom: 0; left: 0; height: 2px; background: linear-gradient(90deg, #f59e0b, #d97706); border-radius: 0 0 0 6px; transition: width 0.3s; }
.ind-menu { position: absolute; top: 2px; right: 2px; font-size: 12px; color: #999; padding: 0 2px; cursor: pointer; }

/* Quick Score */
.quick-score-bar { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.quick-input { width: 70px; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); background: white; color: #333; font-size: 13px; outline: none; }
.quick-input.flex { flex: 1; width: auto; }
.btn-add-mini, .btn-sub-mini { padding: 8px 14px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-add-mini { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
.btn-sub-mini { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
.btn-add-mini:disabled, .btn-sub-mini:disabled { opacity: 0.4; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
.modal-card { background: white; border-radius: 16px; padding: 20px; width: 100%; max-width: 360px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); box-sizing: border-box; }
.menu-card { padding: 8px; display: flex; flex-direction: column; gap: 4px; max-width: 200px; }
.modal-title { font-size: 16px; font-weight: 700; color: #333; margin: 0 0 14px 0; }
.modal-body { display: flex; flex-direction: column; gap: 10px; }
.modal-row { display: flex; gap: 10px; }
.modal-field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.modal-label { font-size: 12px; font-weight: 600; color: #666; }
.modal-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.1); background: white; color: #333; font-size: 14px; outline: none; box-sizing: border-box; }
.modal-input.short { flex: 1; min-width: 0; }
.modal-input:focus { border-color: #42a5f5; box-shadow: 0 0 0 3px rgba(66,165,245,0.15); }
.modal-actions { display: flex; gap: 10px; margin-top: 16px; }
.btn-cancel, .btn-confirm { flex: 1; padding: 10px; border-radius: 10px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-cancel { background: rgba(0,0,0,0.06); color: #666; }
.btn-confirm { background: linear-gradient(135deg, #42a5f5, #1e88e5); color: white; }
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
.menu-item { padding: 10px 12px; border-radius: 10px; border: none; background: transparent; font-size: 14px; text-align: left; cursor: pointer; }
.menu-item:hover { background: rgba(0,0,0,0.04); }
.menu-item.delete { color: #dc2626; }

/* Tips & Toast */
.tips-panel { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border-radius: 16px; border: 1px solid rgba(0,0,0,0.06); padding: 14px 16px; font-size: 13px; color: #666; }
.tips-panel summary { font-weight: 600; color: #333; cursor: pointer; list-style: none; }
.tips-body { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.tips-body p { line-height: 1.5; }
.status-toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); padding: 12px 28px; border-radius: 28px; font-size: 14px; font-weight: 500; color: white; z-index: 100; pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
.status-toast.success { background: linear-gradient(135deg, #22c55e, #16a34a); }
.status-toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

/*
 * ════════════════════════════════════════════════════════
 *  响应式断点
 *  📱 手机 ≤768px     → 单列 + 紧凑
 *  📱➜💻 平板 769-1024 → 2列评估/激励
 *  💻 桌面 1025-1400  → 2列（默认）
 *  🖥️ 智慧屏 ≥1401    → 3列体测数据 + 大字
 * ════════════════════════════════════════════════════════
 */

/* ── 平板 (≤1024px) ── */
@media (max-width: 1024px) {
  .page-container {
    max-width: 720px;
  }
}

/* ── 手机 (≤768px) ── */
@media (max-width: 768px) {
  .page-container {
    max-width: 100%;
    gap: 8px;
  }
  .two-col {
    grid-template-columns: 1fr;
  }
  .bio-columns {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .bio-inline-row {
    gap: 6px 10px;
  }
  .bio-input-narrow {
    width: 60px;
    font-size: 13px;
  }
  .bio-unit {
    font-size: 10px;
    margin-left: 2px;
  }
  .custom-list {
    grid-template-columns: 1fr;
  }
  .quick-score-bar {
    flex-wrap: wrap;
  }
  .quick-input {
    width: 100%;
  }
  .quick-input.flex {
    width: 100%;
  }
}

/* ── 智慧大屏 (≥1401px) ── */
@media (min-width: 1401px) {
  .page-container {
    max-width: 1600px;
    gap: 14px;
  }
  .two-col {
    gap: 14px;
  }
  .bio-columns {
    gap: 20px 32px;
  }
  .section-panel {
    padding: 18px 20px;
  }
  .area-title {
    font-size: 16px;
  }
  .assess-dim-name {
    font-size: 14px;
  }
  .bio-label-inline {
    font-size: 13px;
  }
  .bio-input-narrow {
    font-size: 16px;
    width: 80px;
    padding: 9px 8px;
  }
  .bio-unit {
    font-size: 12px;
  }
  .tech-label {
    font-size: 14px;
  }
  .btn-submit {
    font-size: 15px;
    padding: 12px 20px;
  }
  .star-btn {
    font-size: 20px;
  }
  .star-btn-xs {
    font-size: 18px;
  }
  .star-btn-sm {
    font-size: 16px;
  }
  .computed-tag {
    font-size: 11px;
  }
  .bar-title {
    font-size: 17px;
  }
}

/* Collapsible bio details */
details.section-panel { border: none; }
details.section-panel > summary { list-style: none; }
details.section-panel > summary::-webkit-details-marker { display: none; }
details.section-panel > summary::marker { display: none; content: ""; }
.collapse-trigger { cursor: pointer; user-select: none; }
.collapse-trigger:hover { opacity: 0.8; }
.collapse-arrow { font-size: 12px; color: #999; margin-left: auto; transition: transform 0.2s; }
details.section-panel[open] .collapse-arrow { transform: rotate(90deg); }

</style>
