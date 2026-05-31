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

    <!-- Pet Selection (no pet yet) -->
    <main v-else-if="!error" class="main-content">
      <!-- Has pet -->
      <template v-if="pet">
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
            <!-- 背景铺满面板上半部分 -->
            <div
              v-if="pet?.background?.imageUrl || pet?.background?.cssGradient"
              class="pet-panel-bg"
              :style="panelBgStyle"
            ></div>
            <div class="pet-display-large">
              <PlayerPetCard
                :pet="pet"
                :effects="petEffects"
                :accessories="pet?.accessories"
              />
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
              <div class="vital-row">
                <span class="vital-label">成长</span>
                <div class="vital-track">
                  <div
                    class="vital-fill"
                    :style="{ width: growthPercent + '%', background: '#42a5f5' }"
                  ></div>
                </div>
                <span class="vital-value">{{ pet.carePoints }}/{{ growthNext }}</span>
              </div>
            </div>
            <div v-if="petStatusText" class="pet-status-bar">
              <span class="status-badge" :class="{ 'status-weak': isPetWeak, 'status-sad': isPetSad }">
                ⚠️ {{ petStatusText }}
              </span>
              <span v-if="isPetWeak" class="status-hint">太虚弱了，先喂点吃的吧！</span>
              <span v-else-if="isPetSad" class="status-hint">不开心，训练效果会减半哦</span>
            </div>
            <div v-if="petEffects.length" class="pet-effects-bar">
              <span class="effects-label">✨ 已解锁特效</span>
              <span
                v-for="eff in petEffects"
                :key="eff"
                class="effect-tag"
                :class="`effect-tag-${eff}`"
              >
                {{ eff === 'aura' ? '能力光环' : eff === 'gold-skin' ? '黄金皮肤' : eff === 'gold-badge' ? '金色徽章' : eff }}
              </span>
            </div>
          </div>

          <!-- PC/平板：FIFA 球员卡置于左侧宠物卡下方 -->
          <FifaPlayerCard
            v-if="playerStats"
            :stats="playerStats"
            theme="light"
            class="fifa-desktop"
            :editable="!isDisplayMode"
            :upload-fn="handleAvatarUpload"
            @update:avatar="handleAvatarChange"
          />
          <div v-else class="card-placeholder fifa-desktop">
            <p>暂无能力数据</p>
          </div>
        </section>

        <!-- Right: Actions + Magic Market -->
        <section class="right-section">
          <div v-if="isDisplayMode" class="display-warning">
            <p>🔒 教练已关闭操作权限，当前仅可查看</p>
          </div>

          <div class="action-panel">
            <div class="actions">
              <button class="action-btn action-feed" :disabled="isDisplayMode" @click="handleFeed">
                <span class="btn-icon">🍖</span>
                <span class="btn-label">喂食</span>
              </button>
              <button class="action-btn action-play" :disabled="isDisplayMode || isPetWeak" :title="isPetWeak ? '宠物太虚弱，无法训练' : ''" @click="handlePlay">
                <span class="btn-icon">🎾</span>
                <span class="btn-label">训练</span>
              </button>
            </div>
            <div class="points-display">
              <span class="points-label">当前积分</span>
              <span class="points-value">{{ currentPoints }}</span>
              <span class="points-star">⭐</span>
            </div>
            <button
              class="checkin-btn"
              :class="{ checked: checkedInToday }"
              :disabled="checkedInToday || checkinLoading || isDisplayMode"
              @click="handleCheckin"
            >
              <span v-if="checkinLoading" class="checkin-spinner"></span>
              <span v-else-if="checkedInToday">✅ 今日已签到</span>
              <span v-else>📅 每日签到 +5</span>
            </button>
          </div>

          <!-- Score Records -->
          <div class="records-panel">
            <div class="records-header">
              <span class="records-title">📋 得分记录</span>
              <span v-if="records.length" class="records-count">最近 {{ records.length }} 条</span>
            </div>
            <div v-if="records.length" class="records-list">
              <div
                v-for="record in records.slice(0, 15)"
                :key="record.id"
                class="record-item"
              >
                <span class="record-reason">{{ record.reason }}</span>
                <span class="record-points" :class="record.points > 0 ? 'plus' : 'minus'"
                  >{{ record.points > 0 ? '+' : '' }}{{ record.points }}</span
                >
                <span class="record-time">{{ formatTime(record.createdAt) }}</span>
              </div>
            </div>
            <div v-else class="records-empty">暂无得分记录</div>
          </div>

          <div class="market-panel">
            <div class="market-header">
              <span class="market-title">🎒 魔法市集</span>
              <router-link :to="shopLink" class="market-link">
                去购买 <span class="link-arrow">&gt;</span>
              </router-link>
            </div>
            <div v-if="inventory.length" class="market-grid">
              <div
                v-for="inv in inventory"
                :key="inv.id"
                class="market-item"
                :class="{ equipped: inv.isEquipped, usable: isUsable(inv) && !isDisplayMode, disabled: isDisplayMode }"
                @click="!isDisplayMode && handleUseItem(inv)"
              >
                <span class="item-emoji">{{ getItemEmoji(inv.itemId) }}</span>
                <span class="item-name">{{ getItemName(inv.itemId) }}</span>
                <span v-if="getItemUsageType(inv.itemId) === 'charge'" class="item-qty charge">
                  还剩 {{ inv.quantity }} 次
                </span>
                <span v-else-if="getItemUsageType(inv.itemId) === 'rent'" class="item-qty rent">
                  <span v-if="!inv.expiresAt">未开始</span>
                  <span v-else>还剩 {{ Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000)) }} 天</span>
                </span>
                <span v-else class="item-qty">x{{ inv.quantity }}</span>
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

          <!-- 手机端：FIFA 球员卡置于页面最底部 -->
          <FifaPlayerCard
            v-if="playerStats"
            :stats="playerStats"
            theme="light"
            class="fifa-mobile"
            :editable="!isDisplayMode"
            :upload-fn="handleAvatarUpload"
            @update:avatar="handleAvatarChange"
          />
          <div v-else class="card-placeholder fifa-mobile" style="margin-top:12px">
            <p>暂无能力数据</p>
          </div>
        </section>
      </div>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="actionMessage" class="toast toast-success">{{ actionMessage }}</div>
      </Transition>
      <Transition name="toast">
        <div v-if="actionError" class="toast toast-error">{{ actionError }}</div>
      </Transition>

      <!-- 喂食特效 -->
      <div v-if="feedEffectActive" class="feed-effect">
        <span v-for="n in 6" :key="n" class="feed-particle" :class="`p-${n}`">{{ ['❤️', '⭐', '🍖', '✨', '🎉', '💖'][n - 1] }}</span>
      </div>

      <!-- 进化大特效 -->
      <Transition name="evolution">
        <div v-if="evolutionEffectActive" class="evolution-effect">
          <div class="evolution-bg"></div>
          <div class="evolution-text">✨ 进化成功！✨</div>
          <div v-for="n in 20" :key="n" class="confetti" :class="`c-${n}`">{{ ['🎉', '⭐', '✨', '🎊', '💎', '🔥'][n % 6] }}</div>
        </div>
      </Transition>
      </template>

      <!-- No pet - Selection screen -->
      <template v-else>
        <header class="page-header">
          <router-link
            v-if="coachPhone"
            :to="`/screen?c=${coachPhone}`"
            class="back-btn"
          >
            ←
          </router-link>
          <h1 class="page-title">✨ 选择你的第一只宠物</h1>
        </header>
        <div class="pet-selection-body">
          <p class="selection-hint">每只宠物都有 5 个成长阶段，从蛋开始逐步进化到稀有形态！</p>
          <div v-if="speciesLoading" class="loading-state">加载中...</div>
          <div v-else class="species-selection-grid">
            <div
              v-for="s in speciesOptions"
              :key="s.id"
              class="species-option-card"
              :style="{ background: s.backgroundColor || '#e3f2fd' }"
              @click="chooseSpecies(s.id)"
            >
              <!-- 物种标题 -->
              <div class="species-option-header">
                <span v-if="s.emoji" class="species-header-emoji">{{ s.emoji }}</span>
                <span class="species-option-name">{{ s.name }}</span>
              </div>
              <!-- 阶段预览 -->
              <div class="species-stages-preview">
                <div
                  v-for="stage in s.stageList"
                  :key="stage.key"
                  class="stage-preview-item"
                  :title="stage.label"
                >
                  <img
                    v-if="stage.imageUrl"
                    :src="stage.imageUrl"
                    class="stage-preview-img"
                    :alt="stage.label"
                  />
                  <span v-else class="stage-preview-emoji">{{ stage.emoji }}</span>
                  <span class="stage-preview-label">{{ stage.label }}</span>
                </div>
              </div>
              <div class="species-option-tag">{{ s.maxStageLabel }}</div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { publicApi } from '@/api'
import api from '@/api'
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
  status?: string[]
  background?: {
    cssGradient?: string
    imageUrl?: string
  } | null
  accessories?: Array<{
    id: string
    imageUrl: string
    position: { top: string; left: string; scale: number }
  }>
}

interface InventoryItem {
  id: string
  playerId: string
  itemId: string
  quantity: number
  isEquipped: boolean
  acquiredAt: number
  expiresAt?: number | null
}

interface ShopItemDef {
  id: string
  name: string
  emoji?: string
  type: string
  usageType?: string
  usageCount?: number | null
  imageUrl?: string | null
}

interface ScoreRecord {
  id: string
  reason: string
  points: number
  type: string
  createdAt: number
}

const pet = ref<PetData | null>(null)
const playerStats = ref<PlayerStats | null>(null)
const currentPoints = ref(0)
const inventory = ref<InventoryItem[]>([])
const shopItems = ref<ShopItemDef[]>([])
const records = ref<ScoreRecord[]>([])
const loading = ref(true)
const error = ref('')
const actionMessage = ref('')
const actionError = ref('')
const coachPhone = ref('')
const isDisplayMode = ref(false)
const checkedInToday = ref(false)
const checkinLoading = ref(false)
const feedEffectActive = ref(false)
const evolutionEffectActive = ref(false)
interface StagePreview {
  key: string
  emoji: string
  imageUrl: string
  label: string
}
interface SpeciesOption {
  id: string
  name: string
  emoji: string
  backgroundColor: string
  stageList: StagePreview[]
  maxStageLabel: string
}
const speciesOptions = ref<SpeciesOption[]>([])
const speciesLoading = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

function triggerFeedEffect() {
  feedEffectActive.value = true
  setTimeout(() => { feedEffectActive.value = false }, 1200)
}

function triggerEvolutionEffect() {
  evolutionEffectActive.value = true
  setTimeout(() => { evolutionEffectActive.value = false }, 2500)
}

const shopLink = computed(() => {
  const c = route.query.c as string
  return c ? `/player/${playerId}/shop?c=${c}` : `/player/${playerId}/shop`
})

const isPetWeak = computed(() => pet.value?.status?.includes('weak') ?? false)
const isPetSad = computed(() => pet.value?.status?.includes('sad') ?? false)
const petStatusText = computed(() => {
  if (!pet.value?.status?.length) return ''
  const labels: Record<string, string> = { weak: '虚弱', sad: '不开心' }
  return pet.value.status.map((s) => labels[s] || s).join(' · ')
})

const petEffects = computed(() => {
  const effects: string[] = []
  if (!playerStats.value) return effects

  const dims = playerStats.value.dimensions || []
  const overall = playerStats.value.overall || 0

  // 任一维度 ≥ 80 → 光环特效
  if (dims.some((d) => d.score >= 80)) {
    effects.push('aura')
  }

  // 所有维度 ≥ 60 → 黄金皮肤
  if (dims.length > 0 && dims.every((d) => d.score >= 60)) {
    effects.push('gold-skin')
  }

  // 总分 overall ≥ 85 → 金色徽章
  if (overall >= 85) {
    effects.push('gold-badge')
  }

  return effects
})

const panelBgStyle = computed(() => {
  const bg = pet.value?.background
  if (!bg) return {}
  if (bg.imageUrl) {
    return { backgroundImage: `url(${bg.imageUrl})` }
  }
  if (bg.cssGradient) {
    return { background: bg.cssGradient }
  }
  return {}
})

async function loadData() {
  loading.value = true
  error.value = ''
  coachPhone.value = route.query.c as string || ''

  try {
    const [petRes, shopRes, recordsRes] = await Promise.all([
      publicApi.getPlayerPet(playerId),
      publicApi.getPlayerShop(playerId).catch(() => null),
      publicApi.getPlayerRecords(playerId).catch(() => null),
    ])

    pet.value = petRes.data.data || null
    currentPoints.value = petRes.data.data?.currentPoints ?? petRes.data.currentPoints ?? 0

    // 没有宠物时加载物种列表供选择
    if (!pet.value) {
      speciesLoading.value = true
      try {
        const speciesRes = await publicApi.getPetSpecies()
        if (speciesRes.data.success) {
          speciesOptions.value = (speciesRes.data.data || []).map((s: any) => {
            const stages = s.stages || {}
            const STAGE_ORDER = ['egg', 'level1', 'level2', 'level3', 'rare']
            const STAGE_LABELS: Record<string, string> = {
              egg: '蛋', level1: '幼崽', level2: '少年', level3: '成年', rare: '稀有',
            }
            const stageList: StagePreview[] = []
            for (const key of STAGE_ORDER) {
              const st = stages[key]
              if (st) {
                stageList.push({
                  key,
                  emoji: st.emoji || '',
                  imageUrl: st.imageUrl || '',
                  label: st.label || STAGE_LABELS[key] || key,
                })
              }
            }
            // 取最后一个有配置的阶段作为"最高阶段"
            const maxStage = stageList.length > 0 ? stageList[stageList.length - 1] : null
            return {
              id: s.id,
              name: s.name,
              emoji: s.emoji || '',
              backgroundColor: s.backgroundColor || '#e3f2fd',
              stageList,
              maxStageLabel: maxStage ? `最高: ${maxStage.label}` : '稀有形态',
            }
          })
        }
      } catch (e) {
        console.warn('Failed to load species options', e)
      } finally {
        speciesLoading.value = false
      }
    }

    if (shopRes?.data?.success) {
      inventory.value = shopRes.data.data?.inventory || []
      shopItems.value = (shopRes.data.data?.items || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        emoji: i.emoji || (i.type === 'food' ? '🍎' : i.type === 'decoration' ? '🎩' : '✨'),
        type: i.type,
      }))
    }

    if (recordsRes?.data?.success) {
      records.value = recordsRes.data.data || []
    }

    if (coachPhone.value) {
      try {
        const [statsRes, modeRes] = await Promise.all([
          publicApi.getPlayerStats(coachPhone.value, playerId).catch(() => null),
          publicApi.getMode(coachPhone.value).catch(() => null),
        ])
        if (statsRes?.data?.success) {
          playerStats.value = statsRes.data.data
        }
        if (modeRes?.data?.success) {
          isDisplayMode.value = modeRes.data.data?.playerMode === 'display'
        }
      } catch (e) {
        console.warn('Failed to load player stats or mode', e)
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

function getItemType(itemId: string): string {
  return shopItems.value.find(i => i.id === itemId)?.type || ''
}

function getItemUsageType(itemId: string): string {
  const item = shopItems.value.find(i => i.id === itemId)
  return (item as any)?.usageType || item?.type || ''
}

function isUsable(inv: InventoryItem): boolean {
  const type = getItemType(inv.itemId)
  return ['food', 'toy', 'magic'].includes(type)
}

async function handleUseItem(inv: InventoryItem) {
  actionMessage.value = ''
  actionError.value = ''

  const item = shopItems.value.find(i => i.id === inv.itemId)
  if (!item) {
    actionError.value = '未找到该物品信息，请刷新页面'
    return
  }

  const type = item.type
  const usageType = (item as any).usageType || type

  try {
    if (['food', 'toy', 'magic'].includes(type) || usageType === 'consume' || usageType === 'charge') {
      const res = await publicApi.usePlayerShopItem(playerId, inv.id)
      const data = res.data.data
      if (pet.value) {
        pet.value.hunger = data.hunger
        pet.value.mood = data.mood
        pet.value.carePoints = data.carePoints
        pet.value.stage = data.stage
        if (data.level != null) pet.value.level = data.level
        if (data.species) pet.value.species = data.species
      }
      triggerFeedEffect()
      if (usageType === 'charge' && data.destroyed) {
        actionMessage.value = `🎉 宠物玩得很开心！心情 +18\n玩具玩坏了，去商店买新的吧~`
      } else if (usageType === 'charge') {
        actionMessage.value = `🎉 宠物玩得很开心！心情 +18`
      } else {
        actionMessage.value = `✨ 使用了 ${item.emoji || '📦'} ${item.name}`
      }
    } else if (['accessory', 'background'].includes(type) || ['equip', 'replace'].includes(usageType)) {
      const res = await publicApi.equipPlayerShopItem(playerId, inv.id)
      const data = res.data.data
      if (pet.value) {
        if (data.mood != null) pet.value.mood = data.mood
        if (data.accessories) pet.value.accessories = data.accessories
        if (data.background !== undefined) pet.value.background = data.background
      }
      const moodChange = data.moodChange || 0
      if (inv.isEquipped) {
        actionMessage.value = `👒 已卸下 ${item.emoji || '📦'} ${item.name} 心情${moodChange}`
      } else {
        actionMessage.value = `🎩 已装备 ${item.emoji || '📦'} ${item.name} 心情+${moodChange > 0 ? moodChange : 15}`
      }
      // 装备/卸下后重新拉取宠物完整数据，确保背景、配饰等同步
      try {
        const petRes = await publicApi.getPlayerPet(playerId)
        if (petRes.data.success && pet.value) {
          const d = petRes.data.data
          pet.value.hunger = d.hunger
          pet.value.mood = d.mood
          pet.value.carePoints = d.carePoints
          pet.value.stage = d.stage
          pet.value.level = d.level
          pet.value.background = d.background
          pet.value.accessories = d.accessories
        }
      } catch { /* ignore */ }
    } else {
      actionMessage.value = '✨ 物品已激活'
      return
    }

    // refresh inventory and shopItems simultaneously
    const shopRes = await publicApi.getPlayerShop(playerId)
    if (shopRes.data.success) {
      inventory.value = shopRes.data.data?.inventory || []
      shopItems.value = (shopRes.data.data?.items || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        emoji: i.emoji || '📦',
        type: i.type,
        price: i.price,
      }))
    }
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '使用失败'
  }
}

// 头像上传回调（传给 AvatarPicker）
async function handleAvatarUpload(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('avatar', file)
  const res = await api.post(`/public/player/${playerId}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data.url
}

// 头像变更回调（emoji / logo / photo URL）
async function handleAvatarChange(avatar: string) {
  try {
    await api.put(`/public/player/${playerId}/avatar`, { avatar })
    if (playerStats.value) {
      playerStats.value.avatar = avatar
    }
  } catch (e) {
    console.error('头像更新失败', e)
  }
}

function retry() { loadData() }

async function chooseSpecies(speciesId: string) {
  actionMessage.value = ''
  actionError.value = ''
  try {
    await publicApi.createPlayerPet(playerId, speciesId)
    actionMessage.value = '✨ 宠物领养成功！'
    await loadData()
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '领养失败'
  }
}

const GROWTH_THRESHOLDS = [0, 100, 300, 600, 1000]

const growthNext = computed(() => {
  if (!pet.value) return 100
  const cp = pet.value.carePoints
  for (const t of GROWTH_THRESHOLDS) {
    if (cp < t) return t
  }
  return 1000 // 已满级
})

const growthPercent = computed(() => {
  if (!pet.value) return 0
  const cp = pet.value.carePoints
  const prev = GROWTH_THRESHOLDS.slice().reverse().find(t => t <= cp) ?? 0
  const next = growthNext.value
  if (next === prev) return 100
  return Math.min(100, Math.round(((cp - prev) / (next - prev)) * 100))
})

function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
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
      pet.value.mood = data.mood
      pet.value.carePoints = data.carePoints
      pet.value.stage = data.stage
      if (data.level != null) pet.value.level = data.level
      if (data.species) pet.value.species = data.species
    }
    currentPoints.value = data.currentPoints
    triggerFeedEffect()
    if (data.evolutionBlocked) {
      actionMessage.value = '💢 宠物状态不好，先照顾好它再进化吧！'
    } else if (data.evolved) {
      triggerEvolutionEffect()
      actionMessage.value = '✨ 进化成功！'
    } else {
      actionMessage.value = '🍖 已喂食 饱食+25'
    }
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
      if (data.level != null) pet.value.level = data.level
      if (data.species) pet.value.species = data.species
    }
    currentPoints.value = data.currentPoints
    triggerFeedEffect()
    if (data.evolutionBlocked) {
      actionMessage.value = '💢 宠物状态不好，先照顾好它再进化吧！'
    } else if (data.evolved) {
      triggerEvolutionEffect()
      actionMessage.value = '✨ 进化成功！'
    } else {
      actionMessage.value = '🎾 已训练 成长+5 心情+3'
    }
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '操作失败'
  }
}

async function handleCheckin() {
  if (checkedInToday.value || checkinLoading.value || isDisplayMode.value) return
  checkinLoading.value = true
  actionMessage.value = ''
  actionError.value = ''
  try {
    const res = await publicApi.checkin(playerId)
    const data = res.data.data
    currentPoints.value = data.currentPoints
    checkedInToday.value = true
    let msg = `📅 签到成功 +${data.checkinPoints}分`
    if (data.streakBonus?.length) {
      for (const b of data.streakBonus) {
        msg += ` 🎉 ${b.label} +${b.points}分`
      }
    }
    actionMessage.value = msg
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '签到失败'
  } finally {
    checkinLoading.value = false
  }
}

function checkIfCheckedIn() {
  if (!records.value.length) return
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()
  checkedInToday.value = records.value.some(
    (r) =>
      r.type === 'bonus' &&
      r.reason === '每日签到' &&
      r.createdAt >= todayTs
  )
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const [petRes, recordsRes] = await Promise.all([
        publicApi.getPlayerPet(playerId),
        publicApi.getPlayerRecords(playerId).catch(() => null),
      ])
      if (petRes.data.success && pet.value) {
        const d = petRes.data.data
        pet.value.hunger = d.hunger
        pet.value.mood = d.mood
        pet.value.carePoints = d.carePoints
        pet.value.stage = d.stage
        pet.value.level = d.level
        currentPoints.value = d.currentPoints
      }
      if (recordsRes?.data?.success) {
        records.value = recordsRes.data.data || []
        checkIfCheckedIn()
      }
    } catch (e) {
      // silently ignore polling errors
    }
  }, 15000)
}

onMounted(() => {
  loadData().then(() => {
    checkIfCheckedIn()
    startPolling()
  })
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
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

/* FIFA 卡响应式：PC/平板显示左侧版本，手机端显示右侧底部版本 */
.fifa-mobile {
  display: none;
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
  position: relative;
  overflow: hidden;
}

.pet-panel-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 85%;
  background-size: cover;
  background-position: center;
  z-index: 0;
  border-radius: 16px 16px 50% 50%;
  mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
}

.pet-display-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 8px 0;
  position: relative;
  z-index: 1;
}

.pet-vitals {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 420px;
  padding: 0 12px;
  position: relative;
  z-index: 1;
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
  height: 14px;
  background: #f0f0f0;
  border-radius: 7px;
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

.checkin-btn {
  width: 100%;
  padding: 10px 16px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #66bb6a, #43a047);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.checkin-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(67, 160, 71, 0.3);
}

.checkin-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkin-btn.checked {
  background: #e0e0e0;
  color: #666;
}

.checkin-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

/* ===== Records Panel ===== */
.records-panel {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
}

.records-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.records-title {
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

.records-count {
  font-size: 11px;
  color: #999;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 8px;
  border-radius: 10px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding-right: 4px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f8f9fa;
  font-size: 13px;
}

.record-reason {
  flex: 1;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-points {
  font-weight: 700;
  font-family: 'Russo One', sans-serif;
  font-size: 14px;
  flex-shrink: 0;
}

.record-points.plus {
  color: #16a34a;
}

.record-points.minus {
  color: #dc2626;
}

.record-time {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
  width: 60px;
  text-align: right;
}

.records-empty {
  text-align: center;
  font-size: 13px;
  color: #999;
  padding: 12px 0;
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
.item-qty.charge {
  color: #1565c0;
  font-size: 11px;
}
.item-qty.rent {
  color: #e65100;
  font-size: 11px;
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

  /* FIFA 卡：手机端隐藏左侧版本，显示右侧底部版本 */
  .fifa-desktop {
    display: none;
  }
  .fifa-mobile {
    display: block;
  }
}

/* Display mode warning */
.display-warning {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  padding: 10px 16px;
  text-align: center;
  margin-bottom: 12px;
}
.display-warning p {
  margin: 0;
  font-size: 13px;
  color: #c62828;
  font-weight: 600;
}

/* Disabled action buttons */
.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.6);
}

/* Pet Status */
.pet-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.status-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 10px;
  background: #fff3e0;
  color: #e65100;
}

.status-badge.status-weak {
  background: #ffebee;
  color: #c62828;
}

.status-badge.status-sad {
  background: #e3f2fd;
  color: #1565c0;
}

.status-hint {
  font-size: 11px;
  color: #999;
}

/* Pet Effects Bar */
.pet-effects-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
  position: relative;
  z-index: 1;
}

.effects-label {
  font-size: 11px;
  color: #999;
}

.effect-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 10px;
}

.effect-tag-aura {
  background: #fff3e0;
  color: #e65100;
}

.effect-tag-gold-skin {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  color: #b7860b;
}

.effect-tag-gold-badge {
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  color: #b7860b;
}

/* Disabled market items */
.market-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* ===== Feed Effect ===== */
.feed-effect {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  pointer-events: none;
  z-index: 100;
}

.feed-particle {
  position: absolute;
  font-size: 24px;
  animation: particle-float 1.2s ease-out forwards;
  opacity: 0;
}

.feed-particle.p-1 { left: 20%; top: 60%; animation-delay: 0s; }
.feed-particle.p-2 { left: 50%; top: 50%; animation-delay: 0.1s; }
.feed-particle.p-3 { left: 70%; top: 65%; animation-delay: 0.2s; }
.feed-particle.p-4 { left: 30%; top: 40%; animation-delay: 0.15s; }
.feed-particle.p-5 { left: 60%; top: 45%; animation-delay: 0.25s; }
.feed-particle.p-6 { left: 45%; top: 70%; animation-delay: 0.3s; }

@keyframes particle-float {
  0% { transform: translateY(0) scale(0.5); opacity: 1; }
  50% { opacity: 1; }
  100% { transform: translateY(-120px) scale(1.2); opacity: 0; }
}

/* ===== Evolution Effect ===== */
.evolution-effect {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: none;
}

.evolution-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 215, 0, 0.2) 0%, transparent 60%);
  animation: evolution-bg-pulse 2.5s ease-out forwards;
}

@keyframes evolution-bg-pulse {
  0% { opacity: 0; transform: scale(0.5); }
  30% { opacity: 1; transform: scale(1); }
  70% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.2); }
}

.evolution-text {
  position: relative;
  font-size: 36px;
  font-weight: 800;
  color: #ff8f00;
  text-shadow: 0 2px 10px rgba(255, 143, 0, 0.4);
  animation: evolution-text-pop 2.5s ease-out forwards;
  z-index: 2;
}

@keyframes evolution-text-pop {
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  30% { transform: scale(1.1) rotate(2deg); opacity: 1; }
  50% { transform: scale(1) rotate(0deg); }
  80% { opacity: 1; }
  100% { transform: scale(0.9); opacity: 0; }
}

.confetti {
  position: absolute;
  font-size: 28px;
  animation: confetti-fall 2.5s ease-out forwards;
  opacity: 0;
}

.confetti.c-1  { left: 5%;  animation-delay: 0s; }
.confetti.c-2  { left: 10%; animation-delay: 0.1s; }
.confetti.c-3  { left: 15%; animation-delay: 0.2s; }
.confetti.c-4  { left: 20%; animation-delay: 0.05s; }
.confetti.c-5  { left: 25%; animation-delay: 0.15s; }
.confetti.c-6  { left: 30%; animation-delay: 0.25s; }
.confetti.c-7  { left: 35%; animation-delay: 0.1s; }
.confetti.c-8  { left: 40%; animation-delay: 0.2s; }
.confetti.c-9  { left: 45%; animation-delay: 0.3s; }
.confetti.c-10 { left: 50%; animation-delay: 0.05s; }
.confetti.c-11 { left: 55%; animation-delay: 0.15s; }
.confetti.c-12 { left: 60%; animation-delay: 0.25s; }
.confetti.c-13 { left: 65%; animation-delay: 0.1s; }
.confetti.c-14 { left: 70%; animation-delay: 0.2s; }
.confetti.c-15 { left: 75%; animation-delay: 0.3s; }
.confetti.c-16 { left: 80%; animation-delay: 0.05s; }
.confetti.c-17 { left: 85%; animation-delay: 0.15s; }
.confetti.c-18 { left: 90%; animation-delay: 0.25s; }
.confetti.c-19 { left: 95%; animation-delay: 0.1s; }
.confetti.c-20 { left: 50%; animation-delay: 0.35s; }

@keyframes confetti-fall {
  0% { transform: translateY(-40vh) rotate(0deg); opacity: 1; }
  60% { opacity: 1; }
  100% { transform: translateY(40vh) rotate(720deg); opacity: 0; }
}

.evolution-enter-active,
.evolution-leave-active {
  transition: opacity 0.4s ease;
}

.evolution-enter-from,
.evolution-leave-to {
  opacity: 0;
}

/* ===== Pet Selection ===== */
.pet-selection-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
}

.selection-hint {
  font-size: 15px;
  color: #666;
  text-align: center;
  margin: 0;
}

.species-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 900px;
}

.species-option-card {
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.species-option-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
}

.species-option-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.species-header-emoji {
  font-size: 22px;
  line-height: 1;
}

.species-option-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  text-align: center;
}

.species-stages-preview {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.stage-preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  min-width: 44px;
}

.stage-preview-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.stage-preview-emoji {
  font-size: 24px;
  line-height: 1;
}

.stage-preview-label {
  font-size: 10px;
  color: #666;
  font-weight: 500;
}

.species-option-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 10px;
  background: rgba(255, 215, 0, 0.2);
  color: #b8860b;
}

/* ===== Responsive ===== */
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
  .species-selection-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
