<template>
  <div class="flex items-center gap-3">
    <span class="text-sm text-slate-400">🏠 环境噪音</span>
    <div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="barClass"
        :style="{ width: percent + '%' }"
      ></div>
    </div>
    <span class="text-xs font-mono w-12 text-right" :class="textClass">{{ categoryLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  envNoiseEma30d: number    // 0-99
  envCategory: 'high_pressure' | 'normal' | 'perfect_family'
}>()

const percent = computed(() => Math.round(props.envNoiseEma30d))

const barClass = computed(() => {
  if (percent.value < 40) return 'bg-red-500'
  if (percent.value > 80) return 'bg-emerald-500'
  return 'bg-amber-500'
})

const textClass = computed(() => {
  if (percent.value < 40) return 'text-red-400'
  if (percent.value > 80) return 'text-emerald-400'
  return 'text-amber-400'
})

const categoryLabel = computed(() => {
  switch (props.envCategory) {
    case 'high_pressure': return '高压'
    case 'perfect_family': return '完美'
    default: return '正常'
  }
})
</script>
