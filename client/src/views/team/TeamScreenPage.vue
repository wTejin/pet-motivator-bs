<template>
  <div class="team-screen-page">
    <!-- 顶部栏 -->
    <TeamHeader
      :team-name="teamName"
      :logo="teamLogo"
      :activities="activities"
    />

    <!-- 无教练手机号时的入口 -->
    <div v-if="!phone" class="entry-overlay">
      <div class="entry-card">
        <div class="entry-logo">⚽</div>
        <h1 class="entry-title">星宠契约</h1>
        <p class="entry-subtitle">输入教练手机号进入班级大屏</p>
        <div class="entry-form">
          <input
            v-model="coachPhoneInput"
            type="tel"
            maxlength="11"
            placeholder="请输入11位手机号"
            class="entry-input"
            @keyup.enter="enterScreen"
          />
          <button class="entry-btn" @click="enterScreen">进入大屏</button>
        </div>
        <router-link to="/login" class="entry-coach-link">🔐 教练员登录</router-link>
      </div>
    </div>

    <!-- 主体内容 -->
    <div v-else class="screen-body">
      <!-- 左侧排名榜 -->
      <aside class="screen-sidebar">
        <RankingPanel :ranking="ranking" />
      </aside>

      <!-- 右侧宠物卡网格 -->
      <main class="screen-main">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
        </div>
        <div v-else class="pet-grid">
          <TeamPetCard
            v-for="player in players"
            :key="player.id"
            :player-id="player.id"
            :player-name="player.name"
            :avatar="player.avatar"
            :current-points="player.currentPoints"
            :pet="player.pet"
            :accessories="player.pet?.accessories"
            :background-url="player.pet?.background?.imageUrl || undefined"
            :background-css="player.pet?.background?.cssGradient || undefined"
            :clickable="isOpenMode"
            @click="goToPlayer(player.id)"
          />
        </div>
      </main>
    </div>

    <!-- 底部教练员入口 -->
    <div class="coach-entry-bar">
      <router-link to="/login" class="coach-entry-link">
        🔐 教练员入口
      </router-link>
    </div>

    <!-- 宠物选择弹窗 -->
    <Transition name="modal">
      <div v-if="showPetPicker" class="pet-picker-overlay" @click.self="showPetPicker = false">
        <div class="pet-picker-modal">
          <div class="picker-header">
            <h3 class="picker-title">选择你的宠物</h3>
            <button class="picker-close" @click="showPetPicker = false">✕</button>
          </div>
          <div v-if="petSpeciesList.length === 0" class="picker-empty">加载中...</div>
          <div v-else class="picker-grid">
            <div
              v-for="s in petSpeciesList"
              :key="s.id"
              class="picker-card"
              @click="selectSpecies(s.id)"
            >
              <div class="picker-preview">
                <img
                  v-if="getAdultStage(s)?.imageUrl"
                  :src="getAdultStage(s)!.imageUrl"
                  class="picker-img"
                  :alt="s.name"
                />
                <span v-else class="picker-emoji">{{ getAdultStage(s)?.emoji || s.emoji }}</span>
              </div>
              <span class="picker-name">{{ s.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast 提示 -->
    <Transition name="toast">
      <div v-if="toastMsg" class="screen-toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { publicApi } from '@/api'
import TeamHeader from '@/components/team/TeamHeader.vue'
import RankingPanel from '@/components/team/RankingPanel.vue'
import TeamPetCard from '@/components/team/TeamPetCard.vue'

interface PetInfo {
  name: string
  stage: string
  level: number
  speciesId: string
  species?: {
    stages: Record<string, {
      emoji: string
      imageUrl?: string
    }>
  }
  equippedDecorations?: string[]
  accessories?: Array<{
    id: string
    imageUrl: string
    position: { top: string; left: string; scale: number }
  }>
  background?: {
    cssGradient?: string
    imageUrl?: string
  } | null
}

interface PlayerInfo {
  id: string
  name: string
  avatar: string
  currentPoints: number
  pet: PetInfo | null
}

interface RankingItem {
  playerId: string
  playerName: string
  playerAvatar: string
  currentPoints: number
  rank: number
}

interface ActivityItem {
  id: string
  type: string
  playerName: string
  playerAvatar: string
  description: string
  points?: number
  createdAt: number
}

const route = useRoute()
const router = useRouter()

const phone = computed(() => route.query.c as string)
const teamName = ref('星宠小队')
const teamLogo = ref('')
const players = ref<PlayerInfo[]>([])
const ranking = ref<RankingItem[]>([])
const activities = ref<ActivityItem[]>([])
const loading = ref(true)
const error = ref('')
const isOpenMode = ref(true)
const toastMsg = ref('')
const coachPhoneInput = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

interface SpeciesStage {
  emoji: string
  imageUrl?: string
  label?: string
}
interface SpeciesOption {
  id: string
  name: string
  emoji: string
  stages?: Record<string, SpeciesStage>
}
const showPetPicker = ref(false)
const petSpeciesList = ref<SpeciesOption[]>([])
const selectedPlayerId = ref('')

function getAdultStage(species: SpeciesOption): SpeciesStage | null {
  const stages = species.stages
  if (!stages) return null
  const adult = stages.level3 || stages.adult
  return adult || null
}

let pollTimer: ReturnType<typeof setInterval> | null = null

function enterScreen() {
  if (!coachPhoneInput.value || !/^\d{11}$/.test(coachPhoneInput.value)) {
    showToast('请输入有效的11位手机号')
    return
  }
  router.push(`/screen?c=${coachPhoneInput.value}`)
}

async function loadData() {
  const p = phone.value
  if (!p) {
    loading.value = false
    return
  }

  try {
    const [playersRes, rankRes, actRes, modeRes, coachRes] = await Promise.all([
      publicApi.getPlayers(p),
      publicApi.getLeaderboard(p),
      publicApi.getActivities(p),
      publicApi.getMode(p).catch(() => ({ data: { success: false } })),
      publicApi.getCoach(p),
    ])

    if (playersRes.data.success) {
      players.value = playersRes.data.data || []
    }
    if (rankRes.data.success) {
      ranking.value = rankRes.data.data || []
    }
    if (actRes.data.success) {
      activities.value = actRes.data.data || []
    }

    if (modeRes.data.success) {
      isOpenMode.value = modeRes.data.data?.playerMode === 'open'
    }

    teamName.value = '星宠小队'

    const coachData = coachRes.data.data
    if (coachData?.teamName) {
      teamName.value = coachData.teamName
    }
    if (coachData?.teamLogo) {
      teamLogo.value = coachData.teamLogo
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败，请检查网络'
  } finally {
    loading.value = false
  }
}

function goToPlayer(playerId: string) {
  if (!isOpenMode.value) {
    showToast('教练已暂停操作')
    return
  }
  const player = players.value.find(pl => pl.id === playerId)
  if (!player) return
  if (!player.pet) {
    selectedPlayerId.value = playerId
    loadPetSpecies()
    showPetPicker.value = true
    return
  }
  const p = phone.value
  if (!p) return
  router.push(`/player/${playerId}?c=${p}`)
}

async function loadPetSpecies() {
  try {
    const res = await publicApi.getPetSpecies()
    if (res.data.success) {
      petSpeciesList.value = res.data.data || []
    }
  } catch {
    showToast('加载宠物列表失败')
  }
}

async function selectSpecies(speciesId: string) {
  if (!selectedPlayerId.value) return
  try {
    const res = await publicApi.createPlayerPet(selectedPlayerId.value, speciesId)
    if (res.data.success) {
      showToast('宠物选择成功！')
      showPetPicker.value = false
      loadData()
    } else {
      showToast(res.data.error || '选择失败')
    }
  } catch (e: any) {
    showToast(e.response?.data?.error || '选择失败')
  }
}

function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2000)
}

function startPolling() {
  pollTimer = setInterval(() => {
    loadData()
  }, 30000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  loadData()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

watch(phone, (newPhone, oldPhone) => {
  if (newPhone !== oldPhone) {
    loading.value = true
    error.value = ''
    players.value = []
    ranking.value = []
    activities.value = []
    loadData()
  }
})
</script>

<style scoped>
.team-screen-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.screen-body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.screen-sidebar {
  width: 14%;
  min-width: 130px;
  flex-shrink: 0;
}

.screen-main {
  flex: 1;
  min-width: 0;
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #42a5f5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 响应式：平板 */
@media (max-width: 1024px) {
  .screen-sidebar {
    width: 100%;
    height: auto;
    order: 2;
  }
  .screen-body {
    flex-direction: column;
  }
  .screen-main {
    order: 1;
  }
  .pet-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

/* 响应式：手机 */
@media (max-width: 768px) {
  .team-screen-page {
    padding: 8px;
  }
  .pet-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.coach-entry-bar {
  text-align: center;
  padding: 12px;
}

.coach-entry-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 24px;
  background: rgba(0, 0, 0, 0.05);
  color: #666;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s;
}

.coach-entry-link:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.entry-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.entry-card {
  text-align: center;
  padding: 40px 32px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 380px;
  width: 100%;
}

.entry-logo {
  font-size: 64px;
  margin-bottom: 12px;
}

.entry-title {
  font-size: 28px;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.entry-subtitle {
  font-size: 15px;
  color: #666;
  margin-bottom: 24px;
}

.entry-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.entry-input {
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: #333;
  font-size: 16px;
  outline: none;
  text-align: center;
  transition: border-color 0.2s;
}

.entry-input:focus {
  border-color: #42a5f5;
}

.entry-btn {
  padding: 12px 16px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.entry-btn:hover {
  opacity: 0.9;
}


.install-card a {
  color: #7c3aed;
  font-weight: 600;
  text-decoration: underline;
}
.install-card b {
  color: #7c3aed;
}
.install-icon {
  font-size: 1.2em;
  flex-shrink: 0;
}
@media (max-width: 767px) {
  .desktop-only { display: none !important; }
}
@media (min-width: 768px) {
  .mobile-only { display: none !important; }
}
.entry-coach-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #888;
  font-size: 14px;
  text-decoration: none;
  transition: color 0.2s;
}

.entry-coach-link:hover {
  color: #555;
}

.screen-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 24px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 14px;
  z-index: 100;
  pointer-events: none;
}

/* 宠物选择弹窗 */
.pet-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}

.pet-picker-modal {
  background: white;
  border-radius: 20px;
  padding: 20px;
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.picker-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.picker-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f5f5f5;
  color: #666;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-close:hover {
  background: #e0e0e0;
}

.picker-empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
}

.picker-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: 14px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.picker-card:hover {
  background: #e3f2fd;
  border-color: #42a5f5;
  transform: translateY(-2px);
}

.picker-preview {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.picker-emoji {
  font-size: 48px;
  line-height: 1;
}

.picker-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
