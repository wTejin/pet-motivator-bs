<template>
  <div class="dashboard-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p class="error-icon">😕</p>
      <p class="error-msg">{{ error }}</p>
      <button class="retry-btn" @click="retry">重试</button>
    </div>

    <!-- Main Content -->
    <main v-else-if="pet" class="main-content">
      <!-- Header -->
      <header class="page-header">
        <router-link
          v-if="coachPhone"
          :to="`/screen?c=${coachPhone}`"
          class="back-btn"
        >
          ←
        </router-link>
        <h1 class="page-title">{{ pet.name }}的宠物档案</h1>
      </header>

      <div class="dashboard-body">
        <!-- Left: FIFA Card -->
        <section class="card-section">
          <FifaPlayerCard
            v-if="playerStats"
            :stats="playerStats"
            :dimension-defs="dimensionDefs"
            theme="light"
          />
          <div v-else class="card-placeholder">
            <p>暂无能力数据</p>
          </div>
        </section>

        <!-- Right: Pet Interaction -->
        <section class="pet-section">
          <div class="pet-card-wrapper">
            <PlayerPetCard :pet="pet" />
            <div class="pet-name-display">{{ pet.name }}</div>
          </div>

          <!-- Vitals -->
          <div class="vitals">
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
          </div>

          <!-- Actions -->
          <div class="actions">
            <button class="action-btn action-feed" @click="handleFeed">
              <span class="btn-icon">🍖</span>
              <span class="btn-label">喂食</span>
            </button>
            <button class="action-btn action-play" @click="handlePlay">
              <span class="btn-icon">🎾</span>
              <span class="btn-label">训练</span>
            </button>
          </div>

          <!-- Points -->
          <div class="points-display">
            <span class="points-label">当前积分</span>
            <span class="points-value">{{ currentPoints }}</span>
            <span class="points-star">⭐</span>
          </div>

          <!-- Links -->
          <router-link :to="`/player/${playerId}/shop`" class="link-row">
            🏪 去商店 <span class="link-arrow">&gt;</span>
          </router-link>
          <router-link
            v-if="coachPhone"
            :to="`/screen?c=${coachPhone}`"
            class="link-row"
          >
            👀 返回全班大屏 <span class="link-arrow">&gt;</span>
          </router-link>
        </section>
      </div>

      <!-- Toast -->
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
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { playerApi, publicApi } from '@/api'
import FifaPlayerCard from '@/components/FifaPlayerCard.vue'
import PlayerPetCard from '@/components/player/PlayerPetCard.vue'
import type { PlayerStats } from '@shared/types'

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
  currentPoints: number
  species: {
    stages: Record<string, { emoji: string; imageUrl?: string }>
  } | null
}

const pet = ref<PetData | null>(null)
const playerStats = ref<PlayerStats | null>(null)
const dimensionDefs = ref<any[]>([])
const currentPoints = ref(0)
const loading = ref(true)
const error = ref('')
const actionMessage = ref('')
const actionError = ref('')
const coachPhone = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  coachPhone.value = route.query.c as string || ''

  try {
    const petRes = await playerApi.getPet(playerId)
    pet.value = petRes.data.data
    currentPoints.value = petRes.data.data?.currentPoints || 0

    if (coachPhone.value) {
      try {
        const statsRes = await publicApi.getPlayerStats(coachPhone.value, playerId)
        if (statsRes.data.success) {
          playerStats.value = statsRes.data.data
        }
      } catch (e) {
        console.warn('Failed to load player stats', e)
      }
      try {
        const dimRes = await publicApi.getDimensions(coachPhone.value)
        if (dimRes.data.success) {
          dimensionDefs.value = dimRes.data.data
        }
      } catch (e) {
        console.warn('Failed to load dimensions', e)
      }
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() { loadData() }
onMounted(loadData)

function hungerGradient(v: number): string {
  if (v > 60) return 'linear-gradient(90deg, #4caf50, #66bb6a)'
  if (v > 30) return 'linear-gradient(90deg, #ff9800, #ffb74d)'
  return 'linear-gradient(90deg, #f44336, #ef5350)'
}

function moodGradient(v: number): string {
  if (v > 60) return 'linear-gradient(90deg, #42a5f5, #64b5f6)'
  if (v > 30) return 'linear-gradient(90deg, #ff9800, #ffb74d)'
  return 'linear-gradient(90deg, #f44336, #ef5350)'
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
    actionMessage.value = data.evolved ? '✨ 进化！' : '🍖 已喂食'
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
    actionMessage.value = data.evolved ? '✨ 进化！' : '🎾 已训练'
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '操作失败'
  }
}
</script>

<style scoped>
/* ===== Page ===== */
.dashboard-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  padding: 16px;
}

/* ===== Loading / Error ===== */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  color: #666;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #42a5f5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
}

.error-msg {
  font-size: 16px;
  color: #999;
}

.retry-btn {
  padding: 8px 24px;
  border-radius: 24px;
  border: none;
  background: #42a5f5;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

/* ===== Main Content ===== */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== Header ===== */
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #666;
  font-size: 18px;
  flex-shrink: 0;
}

.page-title {
  font-family: 'ZCOOL KuaiLe', 'PingFang SC', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

/* ===== Body Layout ===== */
.dashboard-body {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.card-section {
  flex: 0 0 55%;
  min-width: 0;
}

.pet-section {
  flex: 0 0 45%;
  min-width: 0;
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.card-placeholder {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  color: #999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* ===== Pet Display ===== */
.pet-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform: scale(1.2);
  margin: 16px 0;
}

.pet-name-display {
  font-family: 'ZCOOL KuaiLe', sans-serif;
  font-size: 20px;
  color: #333;
}

/* ===== Vitals ===== */
.vitals {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vital-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vital-label {
  font-size: 14px;
  color: #666;
  width: 40px;
  flex-shrink: 0;
  font-weight: 600;
}

.vital-track {
  flex: 1;
  height: 10px;
  background: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
}

.vital-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.6s ease-out;
}

.vital-value {
  font-size: 14px;
  color: #333;
  width: 36px;
  text-align: right;
  font-weight: 700;
  font-family: 'Russo One', sans-serif;
}

/* ===== Actions ===== */
.actions {
  width: 100%;
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.action-feed {
  background: linear-gradient(135deg, #ff9800, #ffb74d);
  color: white;
}

.action-play {
  background: linear-gradient(135deg, #2196f3, #64b5f6);
  color: white;
}

.btn-icon {
  font-size: 20px;
}

/* ===== Points ===== */
.points-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
}

.points-label {
  color: #666;
  font-size: 14px;
}

.points-value {
  font-family: 'Russo One', sans-serif;
  font-size: 28px;
  color: #ff9800;
}

.points-star {
  font-size: 20px;
}

/* ===== Links ===== */
.link-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f8f9fa;
  color: #333;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.link-row:hover {
  background: #e3f2fd;
}

.link-arrow {
  color: #999;
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 28px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  z-index: 10;
  pointer-events: none;
}

.toast-success {
  color: #2e7d32;
  background: #e8f5e9;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.toast-error {
  color: #c62828;
  background: #ffebee;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.toast-enter-active {
  transition: all 0.4s ease;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

/* ===== Responsive: Tablet ===== */
@media (max-width: 1024px) {
  .dashboard-body {
    flex-direction: column;
    align-items: stretch;
  }
  .card-section,
  .pet-section {
    flex: 1 1 auto;
    width: 80%;
    margin: 0 auto;
  }
}

/* ===== Responsive: Mobile ===== */
@media (max-width: 768px) {
  .dashboard-page {
    padding: 12px;
  }
  .card-section,
  .pet-section {
    width: 100%;
  }
  .page-title {
    font-size: 18px;
  }
}
</style>
