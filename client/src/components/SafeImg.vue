<template>
  <img
    v-if="!errored"
    :src="src"
    :alt="alt"
    :class="imgClass"
    :style="imgStyle"
    v-bind="$attrs"
    @error="errored = true"
  />
  <slot v-else name="fallback">
    <span :class="fallbackClass" :style="fallbackStyle">{{ fallback || '🖼️' }}</span>
  </slot>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  src: string
  alt?: string
  imgClass?: string
  imgStyle?: Record<string, string>
  fallback?: string
  fallbackClass?: string
  fallbackStyle?: Record<string, string>
}>()

const errored = ref(false)
</script>
