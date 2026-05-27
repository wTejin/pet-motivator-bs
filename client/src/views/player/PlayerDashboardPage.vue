<template>
  <div class="luxury-page">
    <!-- Subtle grain overlay -->
    <div class="grain-overlay"></div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-pulse"></div>
      <p class="loading-text">加载中</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-card">
        <p class="error-icon">—</p>
        <p class="error-msg">{{ error }}</p>
        <button class="luxury-btn-ghost" @click="retry">重试</button>
      </div>
    </div>

    <!-- Main Content -->
    <main v-else-if="pet" class="main-content">
      <!-- Pet Display — large, centered, breathing space -->
      <section class="pet-hero">
        <div class="pet-aura"></div>
        <div class="pet-emoji">{{ petEmoji }}</div>
        <h1 class="pet-name">{{ pet.name }}</h1>
        <div class="pet-meta">
          <span class="stage-badge" :style="{ '--stage-color': stageColor(pet.stage) }">
            {{ stageLabel(pet.stage) }}
          </span>
          <span class="level-text">Lv.{{ pet.level }}</span>
        </div>
      </section>

      <!-- Vital Bars — thin, refined -->
      <section class="vitals">
        <div class="vital-row">
          <span class="vital-label">饱食</span>
          <div class="vital-track">
            <div
              class="vital-fill"
              :style="{ width: pet.hunger + '%', background: hungerGradient(pet.hunger) }"
            ></div>
          </div>
          <span class="vital-value">{{ pet.hunger }}</span>
        </div>
        <div class="vital-row">
          <span class="vital-label">心情</span>
          <div class="vital-track">
            <div
              class="vital-fill"
              :style="{ width: pet.mood + '%', background: moodGradient(pet.mood) }"
            ></div>
          </div>
          <span class="vital-value">{{ pet.mood }}</span>
        </div>
      </section>

      <!-- Display Mode Banner -->
      <div v-if="isDisplayMode" class="mode-banner">
        展示模式 · 操作已暂停
      </div>

      <!-- Actions — restrained, architectural -->
      <section class="actions">
        <button
          :disabled="isDisplayMode"
          class="luxury-btn action-feed"
          @click="handleFeed"
        >
          <span class="btn-icon">—</span>
          <span class="btn-label">喂食</span>
          <span class="btn-hint">恢复饱食度</span>
        </button>
        <button
          :disabled="isDisplayMode"
          class="luxury-btn action-play"
          @click="handlePlay"
        >
          <span class="btn-icon">—</span>
          <span class="btn-label">训练</span>
          <span class="btn-hint">提升心情值</span>
        </button>
      </section>

      <!-- Points — elegant stat -->
      <section class="points-display">
        <span class="points-label">当前积分</span>
        <span class="points-value">{{ currentPoints }}</span>
      </section>

      <!-- Shop Link — understated -->
      <router-link :to="`/player/${playerId}/shop`" class="shop-link">
        商店
        <span class="shop-arrow">&rarr;</span>
      </router-link>

      <!-- Back to Team Screen -->
      <router-link
        v-if="coachPhone"
        :to="`/screen?c=${coachPhone}`"
        class="back-link"
      >
        ← 返回全班大屏
      </router-link>

      <!-- Feedback Toast -->
      <Transition name="toast">
        <div v-if="actionMessage" class="toast toast-success">{{ actionMessage }}</div>
      </Transition>
      <Transition name="toast">
        <div v-if="actionError" class="toast toast-error">{{ actionError }}</div>
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { playerApi } from '@/api'

const route = useRoute()
const playerId = route.params.playerId as string

interface PetData {
  name: string
  stage: string
  level: number
  carePoints: number
  hunger: number
  mood: number
  speciesId: string
  species: any
}

const pet = ref<PetData | null>(null)
const isDisplayMode = ref(false)
const currentPoints = ref(0)
const loading = ref(true)
const error = ref('')
const actionMessage = ref('')
const actionError = ref('')
const coachPhone = ref('')

const petEmoji = computed(() => {
  if (!pet.value?.species?.stages) return '○'
  const stageData = pet.value.species.stages[pet.value.stage]
  return stageData?.emoji || '○'
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [petRes, modeRes] = await Promise.all([
      playerApi.getPet(playerId),
      playerApi.getMode(playerId),
    ])
    pet.value = petRes.data.data
    isDisplayMode.value = modeRes.data.data?.playerMode === 'display'
    coachPhone.value = route.query.c as string || ''
    currentPoints.value = 0
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() { loadData() }

onMounted(loadData)

function stageLabel(stage: string): string {
  const map: Record<string, string> = { egg: '初生', baby: '幼体', teen: '成长', adult: '成熟', rare: '臻藏' }
  return map[stage] || stage
}

function stageColor(stage: string): string {
  const map: Record<string, string> = {
    egg: '#A0A0A0',
    baby: '#B8A88A',
    teen: '#C6A962',
    adult: '#D4AF37',
    rare: '#E8D5A3',
  }
  return map[stage] || '#C6A962'
}

function hungerGradient(v: number): string {
  if (v > 60) return 'linear-gradient(90deg, #8B9D83, #A3B899)'
  if (v > 30) return 'linear-gradient(90deg, #C6A962, #D4AF37)'
  return 'linear-gradient(90deg, #9B4D3F, #C46A5A)'
}

function moodGradient(v: number): string {
  if (v > 60) return 'linear-gradient(90deg, #7A8B9D, #99AEC4)'
  if (v > 30) return 'linear-gradient(90deg, #B8A88A, #C6A962)'
  return 'linear-gradient(90deg, #8B5A5A, #B07070)'
}

async function handleFeed() {
  actionMessage.value = ''
  actionError.value = ''
  try {
    const res = await playerApi.feed(playerId)
    const data = res.data.data
    if (pet.value) {
      pet.value.hunger = data.hunger
      pet.value.carePoints = data.carePoints
      pet.value.stage = data.stage
    }
    currentPoints.value = data.currentPoints
    actionMessage.value = data.evolved ? '· 进化 ·' : '· 已喂食 ·'
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '操作失败'
  }
}

async function handlePlay() {
  actionMessage.value = ''
  actionError.value = ''
  try {
    const res = await playerApi.play(playerId)
    const data = res.data.data
    if (pet.value) {
      pet.value.mood = data.mood
      pet.value.carePoints = data.carePoints
      pet.value.stage = data.stage
    }
    currentPoints.value = data.currentPoints
    actionMessage.value = data.evolved ? '· 进化 ·' : '· 已训练 ·'
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '操作失败'
  }
}
</script>

<style scoped>
/* ===== Page Foundation ===== */
.luxury-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #0D0D0D;
  color: #C8C0B8;
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Subtle film grain */
.grain-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

/* ===== Loading ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  z-index: 2;
}

.loading-pulse {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #C6A962;
  animation: pulse-subtle 2s ease-in-out infinite;
}

@keyframes pulse-subtle {
  0%, 100% { box-shadow: 0 0 0 0 rgba(198, 169, 98, 0.4); }
  50% { box-shadow: 0 0 0 24px rgba(198, 169, 98, 0); }
}

.loading-text {
  font-size: 0.6875rem;
  letter-spacing: 0.2em;
  color: rgba(200, 192, 184, 0.3);
  text-transform: uppercase;
}

/* ===== Error ===== */
.error-state { z-index: 2; }

.error-card {
  text-align: center;
  padding: 3rem 2rem;
}

.error-icon {
  font-size: 2rem;
  color: rgba(200, 192, 184, 0.2);
  margin-bottom: 1.5rem;
}

.error-msg {
  font-size: 0.8125rem;
  color: rgba(200, 192, 184, 0.5);
  margin-bottom: 2rem;
  letter-spacing: 0.05em;
}

.luxury-btn-ghost {
  background: none;
  border: 1px solid rgba(200, 192, 184, 0.15);
  color: rgba(200, 192, 184, 0.5);
  padding: 0.625rem 2rem;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: all 0.4s ease;
}

.luxury-btn-ghost:hover {
  border-color: rgba(200, 192, 184, 0.4);
  color: rgba(200, 192, 184, 0.8);
}

/* ===== Main Content ===== */
.main-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 360px;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

/* ===== Pet Hero ===== */
.pet-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  position: relative;
}

.pet-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(198, 169, 98, 0.06) 0%, transparent 70%);
  pointer-events: none;
}

.pet-emoji {
  font-size: 5rem;
  line-height: 1;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5));
  transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
  position: relative;
  z-index: 1;
}

.pet-name {
  font-family: 'ZCOOL KuaiLe', serif;
  font-size: 1.5rem;
  font-weight: 400;
  color: #D4C8B8;
  letter-spacing: 0.08em;
  margin: 0;
}

.pet-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stage-badge {
  font-size: 0.625rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--stage-color, #C6A962);
  padding: 0.25rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--stage-color, #C6A962) 25%, transparent);
}

.level-text {
  font-family: 'Russo One', sans-serif;
  font-size: 0.6875rem;
  color: rgba(200, 192, 184, 0.35);
  letter-spacing: 0.1em;
}

/* ===== Vitals ===== */
.vitals {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.vital-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.vital-label {
  font-size: 0.625rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(200, 192, 184, 0.35);
  width: 2.5rem;
  flex-shrink: 0;
}

.vital-track {
  flex: 1;
  height: 2px;
  background: rgba(200, 192, 184, 0.08);
  position: relative;
  overflow: hidden;
}

.vital-fill {
  height: 100%;
  transition: width 0.8s cubic-bezier(0.22, 0.61, 0.36, 1);
  position: relative;
}

.vital-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: inherit;
  filter: brightness(1.5);
}

.vital-value {
  font-family: 'Russo One', sans-serif;
  font-size: 0.6875rem;
  color: rgba(200, 192, 184, 0.4);
  width: 2rem;
  text-align: right;
  flex-shrink: 0;
}

/* ===== Mode Banner ===== */
.mode-banner {
  width: 100%;
  text-align: center;
  font-size: 0.625rem;
  letter-spacing: 0.15em;
  color: rgba(198, 169, 98, 0.5);
  padding: 0.75rem;
  border-top: 1px solid rgba(198, 169, 98, 0.1);
  border-bottom: 1px solid rgba(198, 169, 98, 0.1);
}

/* ===== Actions ===== */
.actions {
  width: 100%;
  display: flex;
  gap: 1px;
  background: rgba(200, 192, 184, 0.06);
}

.luxury-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 1.5rem 1rem;
  background: #0D0D0D;
  border: none;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.22, 0.61, 0.36, 1);
  position: relative;
}

.luxury-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(200, 192, 184, 0.03);
  opacity: 0;
  transition: opacity 0.5s ease;
}

.luxury-btn:hover::before {
  opacity: 1;
}

.luxury-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.luxury-btn:disabled::before {
  display: none;
}

.btn-icon {
  font-size: 1.25rem;
  color: rgba(200, 192, 184, 0.5);
  transition: color 0.4s ease;
}

.luxury-btn:hover .btn-icon {
  color: #D4AF37;
}

.btn-label {
  font-size: 0.8125rem;
  letter-spacing: 0.12em;
  color: #C8C0B8;
}

.btn-hint {
  font-size: 0.5625rem;
  letter-spacing: 0.1em;
  color: rgba(200, 192, 184, 0.2);
  transition: color 0.4s ease;
}

.luxury-btn:hover .btn-hint {
  color: rgba(200, 192, 184, 0.4);
}

/* ===== Points ===== */
.points-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.points-label {
  font-size: 0.5625rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(200, 192, 184, 0.25);
}

.points-value {
  font-family: 'Russo One', sans-serif;
  font-size: 2.5rem;
  color: #D4AF37;
  letter-spacing: 0.05em;
  line-height: 1;
}

/* ===== Shop Link ===== */
.shop-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6875rem;
  letter-spacing: 0.15em;
  color: rgba(200, 192, 184, 0.3);
  text-decoration: none;
  padding: 0.5rem 0;
  transition: color 0.4s ease;
}

.shop-link:hover {
  color: rgba(200, 192, 184, 0.6);
}

.shop-arrow {
  font-size: 0.875rem;
  transition: transform 0.4s ease;
}

.shop-link:hover .shop-arrow {
  transform: translateX(3px);
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.625rem 2rem;
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  z-index: 10;
  pointer-events: none;
}

.toast-success {
  color: #C6A962;
  border: 1px solid rgba(198, 169, 98, 0.2);
  background: rgba(13, 13, 13, 0.95);
}

.toast-error {
  color: #B07070;
  border: 1px solid rgba(176, 112, 112, 0.2);
  background: rgba(13, 13, 13, 0.95);
}

/* Toast transitions */
.toast-enter-active {
  transition: all 0.5s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.toast-leave-active {
  transition: all 0.3s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6875rem;
  letter-spacing: 0.15em;
  color: rgba(200, 192, 184, 0.3);
  text-decoration: none;
  padding: 0.5rem 0;
  transition: color 0.4s ease;
}

.back-link:hover {
  color: rgba(200, 192, 184, 0.6);
}
</style>
