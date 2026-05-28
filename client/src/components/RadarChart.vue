<template>
  <canvas
    ref="canvasRef"
    :width="canvasSize"
    :height="canvasSize"
    :style="{ width: size + 'px', height: size + 'px' }"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    dimensions: { label: string; value: number; maxValue?: number }[]
    size?: number
    color?: string
    fillColor?: string
    animated?: boolean
    gridColor?: string
    labelColor?: string
  }>(),
  {
    size: 200,
    color: '#FFD700',
    fillColor: 'rgba(255, 215, 0, 0.2)',
    animated: true,
    gridColor: 'rgba(255, 255, 255, 0.1)',
    labelColor: '#9ca3af',
  },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasSize = computed(() => props.size * 2)

let animationId: number | null = null

function getVertex(index: number, r: number, count: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count
  const cx = props.size
  const cy = props.size
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

function draw(progress: number) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const count = props.dimensions.length
  if (count < 3) return

  const cx = props.size
  const cy = props.size
  const radius = props.size * 0.7
  const w = canvasSize.value

  ctx.clearRect(0, 0, w, w)

  // Background grid: 5 concentric polygons
  for (let level = 1; level <= 5; level++) {
    const r = (radius / 5) * level
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const { x, y } = getVertex(i, r, count)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.strokeStyle = props.gridColor
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Axis lines from center to each vertex
  for (let i = 0; i < count; i++) {
    const { x, y } = getVertex(i, radius, count)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = props.gridColor
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Labels at end of each axis
  ctx.fillStyle = props.labelColor
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < count; i++) {
    const labelR = radius + 18
    const { x, y } = getVertex(i, labelR, count)
    ctx.fillText(props.dimensions[i].label, x, y)
  }

  // Data polygon
  if (progress > 0) {
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const dim = props.dimensions[i]
      const maxVal = dim.maxValue ?? 99
      const r = radius * (dim.value / maxVal) * progress
      const { x, y } = getVertex(i, r, count)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.fillStyle = props.fillColor
    ctx.fill()
    ctx.strokeStyle = props.color
    ctx.lineWidth = 2
    ctx.shadowBlur = 8
    ctx.shadowColor = props.color
    ctx.stroke()

    // Reset shadow for subsequent drawing
    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'
  }

  // Data dots
  if (progress > 0) {
    for (let i = 0; i < count; i++) {
      const dim = props.dimensions[i]
      const maxVal = dim.maxValue ?? 99
      const r = radius * (dim.value / maxVal) * progress
      const { x, y } = getVertex(i, r, count)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = props.color
      ctx.fill()
    }
  }
}

function animate() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  const startTime = performance.now()
  const duration = 600

  function frame(now: number) {
    const elapsed = now - startTime
    const t = Math.min(elapsed / duration, 1)
    // ease-out cubic
    const progress = 1 - Math.pow(1 - t, 3)
    draw(progress)

    if (t < 1) {
      animationId = requestAnimationFrame(frame)
    } else {
      animationId = null
    }
  }

  animationId = requestAnimationFrame(frame)
}

onMounted(() => {
  if (props.animated) {
    animate()
  } else {
    draw(1)
  }
})

onBeforeUnmount(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
})

watch(
  () => props.dimensions,
  () => {
    nextTick(() => {
      if (props.animated) {
        animate()
      } else {
        draw(1)
      }
    })
  },
  { deep: true },
)
</script>
