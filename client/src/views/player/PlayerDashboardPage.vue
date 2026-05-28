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
        <!-- Left: Pet + FIFA Card -->
        <section class="left-section">
          <div class="pet-panel">
            <div class="pet-display-large">
              <PlayerPetCard :pet="pet" />
              <div class="pet-name">{{ pet.name }}</div>
            </div>
            <div class="pet-vitals">
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
          </div>

          <FifaPlayerCard
            v-if="playerStats"
            :stats="playerStats"
            theme="light"
          />
          <div v-else class="card-placeholder">
            <p>暂无能力数据</p>
          </div>
        </section>

        <!-- Right: Actions + Magic Market -->
        <section class="right-section">
          <div class="action-panel">
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
            <div class="points-display">
              <span class="points-label">当前积分</span>
              <span class="points-value">{{ currentPoints }}</span>
              <span class="points-star">⭐</span>
            </div>
          </div>

          <div class="market-panel">
            <div class="market-header">
              <span class="market-title">🎒 魔法集市</span>
              <router-link :to="`/player/${playerId}/shop`" class="market-link">
                去购买 <span class="link-arrow">&gt;</span>
              </router-link>
            </div>
            <div v-if="inventory.length" class="market-grid">
              <div
                v-for="inv in inventory"
                :key="inv.id"
                class="market-item"
                :class="{ equipped: inv.isEquipped, usable: isUsable(inv) }"
                @click="handleUseItem(inv)"
              >
                <span class="item-emoji">{{ getItemEmoji(inv.itemId) }}</span>
                <span class="item-name">{{ getItemName(inv.itemId) }}</span>
                <span class="item-qty">x{{ inv.quantity }}</span>
                <span v-if="inv.isEquipped" class="item-badge">已装备</span>
              </div>
            </div>
            <div v-else class="market-empty">
              还没有购买任何物品哦~
            </div>
          </div>

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
import { publicApi } from '@/api'
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

interface InventoryItem {
  id: string
  playerId: string
  itemId: string
  quantity: number
  isEquipped: boolean
  acquiredAt: number
}

interface ShopItemDef {
  id: string
  name: string
  emoji?: string
  type: 'food' | 'decoration' | 'special'
}

const pet = ref<PetData | null>(null)
const playerStats = ref<PlayerStats | null>(null)
const currentPoints = ref(0)
const inventory = ref<InventoryItem[]>([])
const shopItems = ref<ShopItemDef[]>([])
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
    const [petRes, shopRes] = await Promise.all([
      publicApi.getPlayerPet(playerId),
      publicApi.getPlayerShop(playerId).catch(() => null),
    ])

    pet.value = petRes.data.data
    currentPoints.value = petRes.data.data?.currentPoints || 0

    if (shopRes?.data?.success) {
      inventory.value = shopRes.data.data?.inventory || []
      shopItems.value = (shopRes.data.data?.items || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        emoji: i.emoji || (i.type === 'food' ? '🍎' : i.type === 'decoration' ? '🎩' : '✨'),
        type: i.type,
      }))
    }

    if (coachPhone.value) {
      try {
        const statsRes = await publicApi.getPlayerStats(coachPhone.value, playerId)
        if (statsRes.data.success) {
          playerStats.value = statsRes.data.data
        }
      } catch (e) {
        console.warn('Failed to load player stats', e)
      }
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

function getItemName(itemId: string): string {
  return shopItems.value.find(i => i.id === itemId)?.name || '未知物品'
}

function getItemEmoji(itemId: string): string {
  return shopItems.value.find(i => i.id === itemId)?.emoji || '📦'
}

function isUsable(inv: InventoryItem): boolean {
  const item = shopItems.value.find(i => i.id === inv.itemId)
  return item?.type === 'food' || item?.type === 'decoration'
}

async function handleUseItem(inv: InventoryItem) {
  actionMessage.value = ''
  actionError.value = ''

  const item = shopItems.value.find(i => i.id === inv.itemId)
  if (!item) return

  try {
    if (item.type === 'food') {
      const res = await publicApi.usePlayerShopItem(playerId, inv.id)
      const data = res.data.data
      if (pet.value) {
        pet.value.hunger = data.hunger
        pet.value.mood = data.mood
        pet.value.carePoints = data.carePoints
        pet.value.stage = data.stage
      }
      actionMessage.value = `🍎 使用了 ${item.name}`
    } else if (item.type === 'decoration') {
      await publicApi.equipPlayerShopItem(playerId, inv.id)
      actionMessage.value = inv.isEquipped ? '👒 已卸下' : '🎩 已装备'
    } else {
      actionMessage.value = '✨ 物品已激活'
      return
    }

    // refresh inventory
    const shopRes = await publicApi.getPlayerShop(playerId)
    if (shopRes.data.success) {
      inventory.value = shopRes.data.data?.inventory || []
    }
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '使用失败'
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
    const res = await publicApi.feedPlayerPet(playerId)
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
    const res = await publicApi.playPlayerPet(playerId)
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

.left-section {
  flex: 0 0 55%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-section {
  flex: 0 0 45%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-placeholder {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  color: #999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* ===== Pet Panel (Left Top) ===== */
.pet-panel {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.pet-display-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform: scale(1.4);
  margin: 16px 0;
}

.pet-name {
  font-family: 'ZCOOL KuaiLe', sans-serif;
  font-size: 20px;
  color: #333;
}

.pet-vitals {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 320px;
}

/* ===== Vitals ===== */
.vital-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vital-label {
  font-size: 13px;
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
  font-size: 13px;
  color: #333;
  width: 36px;
  text-align: right;
  font-weight: 700;
  font-family: 'Russo One', sans-serif;
}

/* ===== Action Panel (Right Top) ===== */
.action-panel {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
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
  padding: 14px 16px;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  font-size: 14px;
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
  font-size: 24px;
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

/* ===== Market Panel (Right Bottom) ===== */
.market-panel {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.market-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.market-title {
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

.market-link {
  font-size: 13px;
  color: #42a5f5;
  text-decoration: none;
  font-weight: 600;
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.market-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: #f8f9fa;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
  position: relative;
}

.market-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  background: #fff;
}

.market-item.usable {
  border: 2px solid #81c784;
}

.market-item.equipped {
  border: 2px solid #ffd700;
}

.item-emoji {
  font-size: 28px;
  line-height: 1;
}

.item-name {
  font-size: 10px;
  color: #666;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.item-qty {
  font-size: 10px;
  color: #999;
  font-family: 'Russo One', sans-serif;
}

.item-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 9px;
  padding: 2px 5px;
  border-radius: 8px;
  background: #ffd700;
  color: #333;
  font-weight: 700;
}

.market-empty {
  text-align: center;
  font-size: 13px;
  color: #999;
  padding: 12px 0;
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
  .left-section,
  .right-section {
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
  .left-section,
  .right-section {
    width: 100%;
  }
  .page-title {
    font-size: 18px;
  }
  .market-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .pet-display-large {
    transform: scale(1.1);
  }
}
</style>
