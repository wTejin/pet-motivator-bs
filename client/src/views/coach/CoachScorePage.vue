<template>
  <div class="max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">快速记分</h2>

    <!-- Player Chip Selector -->
    <div class="mb-6">
      <div class="flex gap-2 overflow-x-auto pb-2">
        <button
          v-for="player in players"
          :key="player.id"
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-full border whitespace-nowrap transition-all flex-shrink-0',
            isSelected(player.id)
              ? 'border-blue-500 bg-blue-500/20 text-white'
              : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30',
          ]"
          @click="togglePlayer(player.id)"
        >
          <span>{{ player.avatar }}</span>
          <span class="text-sm">{{ player.name }}</span>
        </button>
      </div>
      <label class="flex items-center gap-2 mt-3 text-sm text-white/60">
        <input v-model="batchMode" type="checkbox" class="rounded" />
        批量模式（多人统一加分）
      </label>
    </div>

    <!-- Dimension Grid -->
    <div v-if="selectedIds.length > 0" class="space-y-6">
      <div v-for="dim in dimensions" :key="dim.id" class="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 class="text-lg font-semibold mb-3">{{ dim.icon }} {{ dim.name }}</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <button
            v-for="indicator in dim.indicators"
            :key="indicator.id"
            class="text-left bg-white/5 border border-white/10 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-500/10 transition-all"
            @click="handleIndicatorScore(indicator)"
          >
            <div class="text-sm font-medium">{{ indicator.name }}</div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-yellow-400 text-xs">+{{ indicator.defaultPoints }}</span>
              <span class="text-white/40 text-xs">今日 {{ getDailyCount(indicator.id) }}/{{ indicator.dailyLimit }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Score -->
    <div class="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
      <h3 class="text-lg font-semibold mb-3">自定义记分</h3>
      <div class="flex flex-col md:flex-row gap-3">
        <input
          v-model="customPoints"
          type="number"
          placeholder="分数"
          class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 w-full md:w-24 focus:border-blue-500 focus:outline-none placeholder:text-white/30"
        />
        <input
          v-model="customReason"
          type="text"
          placeholder="评分原因"
          class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 flex-1 focus:border-blue-500 focus:outline-none placeholder:text-white/30"
        />
        <button
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
          :disabled="!canAddCustom"
          @click="handleCustomScore(true)"
        >
          加分
        </button>
        <button
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
          :disabled="!canAddCustom"
          @click="handleCustomScore(false)"
        >
          扣分
        </button>
      </div>
    </div>

    <!-- Scoring Tips -->
    <details class="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
      <summary class="text-sm font-semibold text-white/70 cursor-pointer">评分建议</summary>
      <div class="mt-3 text-sm text-white/50 space-y-2">
        <p><strong>记录方式建议：</strong>课堂即时记录，课后汇总。正面行为优先，即见即记。</p>
        <p><strong>给分原则：</strong>公平公正，标准统一。鼓励为主，惩罚为辅。及时反馈，公开透明。</p>
        <p><strong>评分频率建议：</strong>每节课 3-5 次记录，日均 10-20 次记录。</p>
      </div>
    </details>

    <!-- Status message -->
    <div v-if="statusMessage" class="mt-4 text-sm text-green-400">{{ statusMessage }}</div>
    <div v-if="statusError" class="mt-4 text-sm text-red-400">{{ statusError }}</div>
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

const players = ref<Player[]>([])
const dimensions = ref<Dimension[]>([])
const selectedIds = ref<string[]>([])
const batchMode = ref(false)
const customPoints = ref<number | null>(null)
const customReason = ref('')
const statusMessage = ref('')
const statusError = ref('')
// Track today's indicator usage in memory (simple map)
const dailyCounts = ref<Record<string, number>>({})

onMounted(async () => {
  try {
    const [pRes, dRes] = await Promise.all([
      coachApi.getPlayers(),
      coachApi.getDimensions(),
    ])
    players.value = (pRes.data.data || [])
    dimensions.value = (dRes.data.data || []).filter((d: any) => d.isActive !== false).map((d: any) => ({
      ...d,
      indicators: (d.indicators || []).filter((i: any) => i.isActive !== false),
    }))
  } catch (e) {
    console.error('Failed to load data', e)
  }
})

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

const canAddCustom = computed(() => {
  return selectedIds.value.length > 0 && customPoints.value != null && Number(customPoints.value) !== 0
})

async function handleIndicatorScore(indicator: Indicator) {
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
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '记分失败'
  }
}

async function handleCustomScore(isAdd: boolean) {
  if (!canAddCustom.value) return
  statusMessage.value = ''
  statusError.value = ''
  const points = isAdd ? Math.abs(Number(customPoints.value)) : -Math.abs(Number(customPoints.value))
  try {
    for (const playerId of selectedIds.value) {
      await coachApi.addScore({
        playerId,
        indicatorId: null,
        points,
        type: points > 0 ? 'earn' : 'penalty',
        reason: customReason.value || '自定义记分',
      })
    }
    statusMessage.value = `成功为 ${selectedIds.value.length} 名球员${isAdd ? '加' : '扣'}${Math.abs(points)} 分`
    customPoints.value = null
    customReason.value = ''
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '记分失败'
  }
}
</script>
