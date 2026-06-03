<template>
  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
    :class="badgeClass"
  >
    <span>{{ icon }}</span>
    <span>{{ label }}</span>
    <span v-if="offset != null" class="opacity-70">{{ offset > 0 ? '+' : '' }}{{ offset }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  category: 'early' | 'on_time' | 'late'
  offset?: number | null
}>()

const icon = computed(() => {
  switch (props.category) {
    case 'early': return '🔼'
    case 'late': return '🔽'
    default: return '✅'
  }
})

const label = computed(() => {
  switch (props.category) {
    case 'early': return '早熟型'
    case 'late': return '晚熟型'
    default: return '正熟型'
  }
})

const badgeClass = computed(() => {
  switch (props.category) {
    case 'early': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    case 'late': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    default: return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  }
})
</script>
