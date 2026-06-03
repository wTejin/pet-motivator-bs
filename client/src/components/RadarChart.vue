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
    dimensions2?: { label: string; value: number; maxValue?: number }[]
    size?: number
    color?: string
    fillColor?: string
    color2?: string
    fillColor2?: string
    animated?: boolean
    gridColor?: string
    labelColor?: string
    legend1Label?: string
    legend2Label?: string
  }>(),
  {
    size: 200,
    color: '#FFD700',
    fillColor: 'rgba(255, 215, 0, 0.2)',
    color2: '#818cf8',
    fillColor2: 'rgba(129, 140, 248, 0.12)',
    animated: true,
    gridColor: 'rgba(255, 255, 255, 0.1)',
    labelColor: '#9ca3af',
    legend1Label: '',
    legend2Label: '',
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

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  dims: { label: string; value: number; maxValue?: number }[],
  radius: number,
  progress: number,
  strokeColor: string,
  fillColor: string,
  count: number,
) {
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const dim = dims[i]
    const maxVal = dim.maxValue ?? 99
    const r = radius * (dim.value / maxVal) * progress
    const { x, y } = getVertex(i, r, count)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = fillColor
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 2
  ctx.shadowBlur = 6
  ctx.shadowColor = strokeColor
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  dims: { label: string; value: number; maxValue?: number }[],
  radius: number,
  progress: number,
  dotColor: string,
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const dim = dims[i]
    const maxVal = dim.maxValue ?? 99
    const r = radius * (dim.value / maxVal) * progress
    const { x, y } = getVertex(i, r, count)
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = dotColor
    ctx.fill()
  }
}

function drawLegend(ctx: CanvasRenderingContext2D, _size: number) {
  const has2 = props.dimensions2 && props.dimensions2.length > 0
  if (!props.legend1Label && !props.legend2Label) return

  const fontSize = 11
  ctx.font = `${fontSize}px sans-serif`
  const lineLen = 16
  const gap = 4
  const y = _size * 2 - 14

  // Legend 1
  if (props.legend1Label) {
    const textW = ctx.measureText(props.legend1Label).width
    const totalW = lineLen + gap + textW
    const x1 = _size - totalW / 2
    const yPos = has2 ? y - 16 : y

    ctx.beginPath()
    ctx.moveTo(x1, yPos)
    ctx.lineTo(x1 + lineLen, yPos)
    ctx.strokeStyle = props.color
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = props.labelColor
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(props.legend1Label, x1 + lineLen + gap, yPos)

    // Legend 2
    if (has2 && props.legend2Label) {
      const textW2 = ctx.measureText(props.legend2Label).width
      const totalW2 = lineLen + gap + textW2
      const x2 = _size - totalW2 / 2

      ctx.beginPath()
      ctx.moveTo(x2, y)
      ctx.lineTo(x2 + lineLen, y)
      ctx.strokeStyle = props.color2
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = props.labelColor
      ctx.fillText(props.legend2Label, x2 + lineLen + gap, y)
    }
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
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = props.gridColor
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Axis lines
  for (let i = 0; i < count; i++) {
    const { x, y } = getVertex(i, radius, count)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = props.gridColor
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Labels
  ctx.fillStyle = props.labelColor
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < count; i++) {
    const labelR = radius + 18
    const { x, y } = getVertex(i, labelR, count)
    ctx.fillText(props.dimensions[i].label, x, y)
  }

  if (progress > 0) {
    const has2 = props.dimensions2 && props.dimensions2.length === count

    // Draw second layer (corrected) FIRST — underneath
    if (has2) {
      drawPolygon(ctx, props.dimensions2!, radius, progress, props.color2, props.fillColor2, count)
      drawDots(ctx, props.dimensions2!, radius, progress, props.color2, count)
    }

    // Draw first layer (observed) on top
    drawPolygon(ctx, props.dimensions, radius, progress, props.color, props.fillColor, count)
    drawDots(ctx, props.dimensions, radius, progress, props.color, count)

    // Legend
    drawLegend(ctx, props.size)
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
  if (props.animated) draw(1)
  else draw(1)
})

onBeforeUnmount(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
})

watch(
  () => [props.dimensions, props.dimensions2],
  () => {
    nextTick(() => {
      if (props.animated) animate()
      else draw(1)
    })
  },
  { deep: true },
)
</script>
