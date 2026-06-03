<template>
  <div class="glass-card p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold text-white">📈 演化趋势</h2>
      <div class="flex gap-2">
        <button
          v-for="g in ['week', 'month']"
          :key="g"
          class="px-3 py-1 rounded text-xs transition-colors"
          :class="granularity === g ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'"
          @click="granularity = g"
        >{{ g === 'week' ? '周' : '月' }}</button>
      </div>
    </div>

    <div v-if="snapshots.length < 2" class="text-center text-slate-400 text-sm py-8">
      需要更多历史快照来生成趋势图<br/>
      <span class="text-xs text-slate-500">当前有 {{ snapshots.length }} 条快照</span>
    </div>

    <canvas v-else ref="canvasRef" :width="w" :height="h" class="w-full"></canvas>

    <!-- Legend -->
    <div v-if="snapshots.length >= 2" class="flex flex-wrap gap-3 mt-3 text-xs">
      <label v-for="dim in dimLegends" :key="dim.key" class="flex items-center gap-1 cursor-pointer">
        <input type="checkbox" :checked="dim.visible" @change="dim.visible = $event.target.checked; draw()" />
        <span class="w-2.5 h-2.5 rounded-full inline-block" :style="{ background: dim.color }"></span>
        <span class="text-slate-400">{{ dim.name }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { BIO_LEAP_DIMENSIONS } from '@shared/types'
import type { PipelineSnapshot } from '@shared/types'

const props = defineProps<{
  snapshots: PipelineSnapshot[]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const granularity = ref<'week' | 'month'>('week')
const w = 800
const h = 300

const DIM_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const dimLegends = ref(
  BIO_LEAP_DIMENSIONS.map((d, i) => ({
    key: d.key,
    name: d.name,
    color: DIM_COLORS[i],
    visible: true,
  })),
)

const groupedSnapshots = computed(() => {
  const snapshots = props.snapshots
  if (snapshots.length < 2) return []

  if (granularity.value === 'week') {
    // Return all snapshots (already at assessment-level granularity)
    return snapshots.map((s) => ({
      label: new Date(s.computedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      date: s.computedAt,
      overall: s.overall,
      dimensions: s.dimensionJson as Record<string, any>,
    }))
  }

  // Month grouping: average by month
  const byMonth = new Map<string, any[]>()
  for (const s of snapshots) {
    const d = new Date(s.computedAt)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(s)
  }

  return Array.from(byMonth.entries()).map(([key, items]) => {
    const avgOverall = Math.round(items.reduce((s, i) => s + i.overall, 0) / items.length)
    const avgDims: Record<string, number> = {}
    const dims = items[0].dimensionJson as Record<string, any>
    for (const dk of Object.keys(dims)) {
      avgDims[dk] = Math.round(items.reduce((s, i) => {
        const dd = (i.dimensionJson as Record<string, any>)[dk]
        return s + (dd?.final ?? 0)
      }, 0) / items.length)
    }
    return { label: key, date: items[0].computedAt, overall: avgOverall, dimensions: avgDims }
  })
})

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const data = groupedSnapshots.value
  if (data.length < 2) return

  const pad = { top: 20, right: 20, bottom: 30, left: 30 }
  const pw = w - pad.left - pad.right
  const ph = h - pad.top - pad.bottom

  ctx.clearRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ph / 4) * i
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke()
  }

  // Y-axis labels
  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    ctx.fillText(String(100 - i * 25), pad.left - 5, pad.top + (ph / 4) * i + 3)
  }

  // X-axis labels
  ctx.textAlign = 'center'
  const step = data.length > 1 ? pw / (data.length - 1) : 0
  for (let i = 0; i < data.length; i++) {
    const x = pad.left + step * i
    ctx.fillText(data[i].label, x, h - pad.bottom + 14)
  }

  // Draw dimension lines
  for (const dim of dimLegends.value) {
    if (!dim.visible) continue

    ctx.strokeStyle = dim.color
    ctx.lineWidth = 1.5
    ctx.beginPath()

    for (let i = 0; i < data.length; i++) {
      const x = pad.left + step * i
      const val = data[i].dimensions[dim.key]?.final ?? 0
      const y = pad.top + ph - (val / 99) * ph
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // Draw overall line (always visible, thick)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5
  ctx.setLineDash([])
  ctx.beginPath()
  for (let i = 0; i < data.length; i++) {
    const x = pad.left + step * i
    const y = pad.top + ph - (data[i].overall / 99) * ph
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Overall dots
  for (let i = 0; i < data.length; i++) {
    const x = pad.left + step * i
    const y = pad.top + ph - (data[i].overall / 99) * ph
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

onMounted(() => { nextTick(draw) })
watch(() => [props.snapshots, granularity.value], () => { nextTick(draw) }, { deep: true })
</script>
