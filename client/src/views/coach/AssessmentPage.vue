<template>
  <div class="p-6 space-y-4">
    <h1 class="text-2xl font-bold text-white">每日评估</h1>

    <!-- Mode Toggle + Player Selector -->
    <div class="glass-card p-4 space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <label class="text-sm text-slate-400">选择球员</label>
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-500">{{ detailMode ? '详细模式：点击维度展开子指标打分' : '快速模式：直接为一级指标打星' }}</span>
          <button
            class="px-3 py-1 rounded text-xs transition-colors"
            :class="detailMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'"
            @click="detailMode = !detailMode"
          >
            {{ detailMode ? '详细' : '快速' }}
          </button>
        </div>
      </div>
      <select
        v-model="selectedPlayerId"
        class="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
        @change="onPlayerChange"
      >
        <option value="">-- 请选择球员 --</option>
        <option v-for="p in players" :key="p.id" :value="p.id">{{ p.avatar }} {{ p.name }}</option>
      </select>
    </div>

    <!-- Assessed badge -->
    <div v-if="selectedPlayerId && todayAssessed" class="glass-card p-3 border-l-4 border-emerald-500 text-emerald-400 text-sm">
      ✅ {{ selectedPlayerName }} 今天已完成评估，可以继续追加评分
    </div>

    <!-- ── 评分区 ── -->
    <div v-if="selectedPlayerId" class="glass-card p-4 space-y-4">
      <h2 class="text-sm font-semibold text-white flex items-center gap-2">
        <span>{{ selectedPlayer?.avatar }}</span>
        <span>{{ selectedPlayer?.name }}</span>
      </h2>

      <!-- 快速模式：6 维直接打星 -->
      <div v-if="!detailMode" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="dim in dimensions" :key="dim.key" class="bg-slate-800/50 rounded-lg p-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">{{ dim.icon }}</span>
            <span class="text-sm font-semibold text-white">{{ dim.name }}</span>
          </div>
          <p class="text-xs text-slate-500 mb-2">{{ dim.description }}</p>
          <div class="flex gap-1">
            <button
              v-for="star in 5" :key="star"
              class="w-8 h-8 rounded text-lg transition-all"
              :class="star <= scores[dim.key]
                ? 'bg-emerald-500/20 text-emerald-400 scale-110'
                : 'bg-slate-700 text-slate-500 hover:bg-slate-600'"
              @click="scores[dim.key] = star"
            >★</button>
            <span class="text-xs text-slate-500 self-center ml-2">{{ scores[dim.key] }}/5</span>
          </div>
        </div>
      </div>

      <!-- 详细模式：有子指标的维度可展开，techExec/engagement 直接打星 -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="dim in dimensions" :key="dim.key"
          class="bg-slate-800/50 rounded-lg p-3 border"
          :class="[
            getSubs(dim.key).length > 0
              ? (activeDim === dim.key ? 'border-emerald-500/50 cursor-pointer hover:bg-slate-700/50' : 'border-white/5 cursor-pointer hover:bg-slate-700/50')
              : 'border-white/5'
          ]"
          @click="getSubs(dim.key).length > 0 && openSubModal(dim)"
        >
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ dim.icon }}</span>
              <span class="text-sm font-semibold text-white">{{ dim.name }}</span>
            </div>
            <div v-if="getSubs(dim.key).length > 0" class="flex items-center gap-1">
              <span class="text-xs px-1.5 py-0.5 rounded" :class="subBadgeClass(dim.key)">
                {{ filledSubCount(dim.key) }}/{{ subCount(dim.key) }}
              </span>
              <span class="text-slate-400 text-xs">›</span>
            </div>
          </div>
          <p class="text-xs text-slate-500 mb-2">{{ dim.description }}</p>
          <!-- 有子指标 → 显示聚合分数 -->
          <template v-if="getSubs(dim.key).length > 0">
            <div class="flex items-center gap-1">
              <template v-if="computedDimScore(dim.key) !== null">
                <span v-for="star in 5" :key="star" class="text-sm"
                  :class="star <= computedDimScore(dim.key)! ? 'text-emerald-400' : 'text-slate-600'">★</span>
                <span class="text-xs text-emerald-400 ml-1">{{ computedDimScore(dim.key) }}/5</span>
              </template>
              <span v-else class="text-xs text-slate-500">点击展开打分</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">定期体测提供客观校准</p>
          </template>
          <!-- 无子指标 (techExec/engagement) → 直接打星 -->
          <div v-else class="flex gap-1">
            <button
              v-for="star in 5" :key="star"
              class="w-7 h-7 rounded text-base transition-all"
              :class="star <= scores[dim.key]
                ? 'bg-emerald-500/20 text-emerald-400 scale-110'
                : 'bg-slate-700 text-slate-500 hover:bg-slate-600'"
              @click.stop="scores[dim.key] = star"
            >★</button>
            <span class="text-xs text-slate-500 self-center ml-2">{{ scores[dim.key] }}/5</span>
          </div>
        </div>
      </div>

      <!-- 备注 -->
      <div>
        <label class="block text-sm text-slate-400 mb-1">备注（选填）</label>
        <textarea
          v-model="notes"
          rows="2"
          class="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
          placeholder="训练表现备注..."
        ></textarea>
      </div>

      <!-- 提交 -->
      <div class="flex gap-3">
        <button class="btn-primary px-6 py-2 rounded-lg text-sm font-semibold" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中...' : '✓ 提交评分' }}
        </button>
        <button v-if="nextPlayerId" class="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm" @click="selectNext">下一个球员 →</button>
      </div>
      <p v-if="submitMsg" class="text-sm" :class="submitOk ? 'text-emerald-400' : 'text-red-400'">{{ submitMsg }}</p>
    </div>

    <!-- ── 子指标弹窗 ── -->
    <div v-if="subModalDim" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="subModalDim = null">
      <div class="glass-card p-6 w-full max-w-md space-y-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <span>{{ subModalDim.icon }}</span>
            <span>{{ subModalDim.name }}</span>
          </h2>
          <button class="text-slate-400 hover:text-white text-xl" @click="subModalDim = null">✕</button>
        </div>
        <p class="text-xs text-slate-400">{{ subModalDim.description }}</p>

        <!-- 子指标列表 -->
        <div v-for="sub in currentSubs" :key="sub.key" class="bg-slate-800/50 rounded-lg p-3 space-y-1">
          <div class="flex items-center justify-between">
            <label class="text-sm text-white font-semibold">{{ sub.name }}</label>
            <span class="text-xs" :class="subScores[sub.key] ? 'text-emerald-400' : 'text-slate-500'">
              {{ subScores[sub.key] || '未评' }}/5
            </span>
          </div>
          <p class="text-xs text-slate-500">{{ sub.description }}</p>
          <div class="flex gap-1 mt-1">
            <button
              v-for="star in 5" :key="star"
              class="w-7 h-7 rounded text-base transition-all"
              :class="star <= (subScores[sub.key] || 0)
                ? 'bg-emerald-500/20 text-emerald-400 scale-110'
                : 'bg-slate-700 text-slate-500 hover:bg-slate-600'"
              @click="subScores[sub.key] = star"
            >★</button>
          </div>
        </div>

        <!-- 聚合结果 -->
        <div class="border-t border-white/10 pt-3 flex items-center justify-between">
          <span class="text-sm text-slate-400">
            算术平均 ({{ currentSubs.map(s => subScores[s.key] || 0).join(' + ') }}) ÷ {{ currentSubs.length }}
          </span>
          <div class="flex items-center gap-2">
            <span v-for="star in 5" :key="star" class="text-lg"
              :class="star <= (computedDimScore(subModalDim.key) || 0) ? 'text-emerald-400' : 'text-slate-600'">★</span>
            <span class="text-emerald-400 font-bold text-sm">{{ computedDimScore(subModalDim.key) }}/5</span>
          </div>
        </div>

        <button class="btn-primary w-full py-2 rounded-lg text-sm font-semibold" @click="subModalDim = null">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { playerApi, assessmentApi } from '@/api'
import { BIO_LEAP_DIMENSIONS, BIO_LEAP_SUB_INDICATORS, type DimensionMeta } from '@shared/types'

const route = useRoute()
const players = ref<any[]>([])
const selectedPlayerId = ref('')
const detailMode = ref(true)
const activeDim = ref<string | null>(null)
const subModalDim = ref<DimensionMeta | null>(null)

const scores = ref<Record<string, number>>({
  spatialIq: 3, techExec: 3, engagement: 3,
  resilience: 3, altruism: 3, envNoise: 3,
})
const subScores = ref<Record<string, number>>({})
const notes = ref('')
const submitting = ref(false)
const submitMsg = ref('')
const submitOk = ref(false)
const todayAssessed = ref(false)

const dimensions = BIO_LEAP_DIMENSIONS

const selectedPlayer = computed(() => players.value.find((p: any) => p.id === selectedPlayerId.value))
const selectedPlayerName = computed(() => selectedPlayer.value?.name || '')

const currentIndex = computed(() => players.value.findIndex((p: any) => p.id === selectedPlayerId.value))
const nextPlayerId = computed(() => {
  const idx = currentIndex.value
  return idx >= 0 && idx < players.value.length - 1 ? players.value[idx + 1].id : null
})

onMounted(async () => {
  try {
    const res = await playerApi.list()
    players.value = res.data.data || []
  } catch (e) { console.error(e) }
  // URL query ?player=xxx 预选球员
  const pid = route.query.player as string
  if (pid) selectedPlayerId.value = pid
})

function onPlayerChange() {
  submitMsg.value = ''
  todayAssessed.value = false
  scores.value = { spatialIq: 3, techExec: 3, engagement: 3, resilience: 3, altruism: 3, envNoise: 3 }
  subScores.value = {}
  activeDim.value = null
}

function selectNext() {
  if (nextPlayerId.value) { selectedPlayerId.value = nextPlayerId.value; onPlayerChange() }
}

// ── 子指标 helpers ──
function getSubs(dimKey: string) {
  return BIO_LEAP_SUB_INDICATORS.find(d => d.dimKey === dimKey)?.subs || []
}
function subCount(dimKey: string) { return getSubs(dimKey).length }
function filledSubCount(dimKey: string) {
  return getSubs(dimKey).filter(s => subScores.value[s.key] && subScores.value[s.key] >= 1).length
}
function subBadgeClass(dimKey: string) {
  const n = filledSubCount(dimKey)
  const total = subCount(dimKey)
  if (n === total) return 'bg-emerald-500/20 text-emerald-400'
  if (n > 0) return 'bg-amber-500/20 text-amber-400'
  return 'bg-slate-700 text-slate-500'
}

/**
 * 子指标 → 一级指标聚合：算术平均，四舍五入到整数
 * 文档依据：FA 四角模型逐项打分后求和/平均
 */
function computedDimScore(dimKey: string): number | null {
  const subs = getSubs(dimKey)
  const vals = subs.map(s => subScores.value[s.key]).filter(v => typeof v === 'number' && v >= 1 && v <= 5) as number[]
  if (vals.length === 0) return null
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
}

const currentSubs = computed(() => subModalDim.value ? getSubs(subModalDim.value.key) : [])

function openSubModal(dim: DimensionMeta) {
  activeDim.value = dim.key
  subModalDim.value = dim
}

// ── 提交 ──
async function submit() {
  if (!selectedPlayerId.value) return
  submitting.value = true
  submitMsg.value = ''

  try {
    const payload: Record<string, any> = {
      playerId: selectedPlayerId.value,
      notes: notes.value || null,
    }

    if (detailMode.value) {
      // 详细模式：4 个心理/战术维度子指标聚合，techExec/engagement 始终直接打分
      for (const dim of BIO_LEAP_SUB_INDICATORS) {
        const dimScore = computedDimScore(dim.dimKey)
        if (dimScore === null) {
          submitMsg.value = `请至少为「${BIO_LEAP_DIMENSIONS.find(d => d.key === dim.dimKey)?.name}」填写一个子指标`
          submitOk.value = false
          submitting.value = false
          return
        }
        payload[dim.dimKey] = dimScore
        for (const sub of dim.subs) {
          const v = subScores.value[sub.key]
          if (typeof v === 'number' && v >= 1 && v <= 5) {
            payload[sub.key] = v
          }
        }
      }
      // techExec 和 engagement 由定期体测校准，每日评估直接打分
      payload['techExec'] = scores.value['techExec']
      payload['engagement'] = scores.value['engagement']
    } else {
      // 快速模式：直接使用一级打分
      for (const dim of BIO_LEAP_DIMENSIONS) {
        payload[dim.key] = scores.value[dim.key]
      }
    }

    await assessmentApi.create(payload)
    submitOk.value = true
    submitMsg.value = `✅ ${selectedPlayerName.value} 评分成功！`
    todayAssessed.value = true
    notes.value = ''
  } catch (e: any) {
    submitOk.value = false
    submitMsg.value = e.response?.data?.error || '提交失败'
  } finally {
    submitting.value = false
  }
}
</script>
