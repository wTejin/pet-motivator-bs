<template>
  <div class="team-screen-page">
    <!-- 顶部栏 -->
    <TeamHeader
      :team-name="teamName"
      :activities="activities"
    />

    <!-- 主体内容 -->
    <div class="screen-body">
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
            @click="goToPlayer(player.id)"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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

const phone = route.query.c as string
const teamName = ref('星宠小队')
const players = ref<PlayerInfo[]>([])
const ranking = ref<RankingItem[]>([])
const activities = ref<ActivityItem[]>([])
const loading = ref(true)
const error = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadData() {
  if (!phone) {
    error.value = '缺少教练手机号参数，请通过 ?c=手机号 访问'
    loading.value = false
    return
  }

  try {
    const [playersRes, rankRes, actRes] = await Promise.all([
      publicApi.getPlayers(phone),
      publicApi.getLeaderboard(phone),
      publicApi.getActivities(phone),
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

    teamName.value = '星宠小队'
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败，请检查网络'
  } finally {
    loading.value = false
  }
}

function goToPlayer(playerId: string) {
  router.push(`/player/${playerId}`)
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
  width: 20%;
  min-width: 180px;
  flex-shrink: 0;
}

.screen-main {
  flex: 1;
  min-width: 0;
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
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
  }
  .screen-body {
    flex-direction: column;
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
</style>
