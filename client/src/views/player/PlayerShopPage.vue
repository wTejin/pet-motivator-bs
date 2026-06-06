<template>
  <div class="min-h-screen px-4 py-6 shop-page">
    <div class="page-container">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <router-link
          :to="backLink"
          class="back-btn"
        >
          <span>&#8592;</span> 返回
        </router-link>
        <h1 class="page-title">🏪 魔法市集</h1>
        <div class="points-badge">
          <span>⭐</span>
          <span>{{ currentPoints }}</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center text-gray-400 py-8">
        <div class="skeleton-light h-24 w-full mb-4"></div>
        <div class="skeleton-light h-24 w-full"></div>
      </div>

      <template v-else>
        <!-- Display Mode Warning -->
        <div v-if="isDisplayMode" class="warning-box">
          <p>🔒 教练已关闭操作权限，无法购买和使用道具</p>
        </div>

        <!-- Category Tabs -->
        <div class="category-tabs">
          <button
            v-for="tab in categoryTabs"
            :key="tab.value"
            class="tab-btn"
            :class="{ active: activeCategory === tab.value }"
            @click="activeCategory = tab.value"
          >
            {{ tab.emoji }} {{ tab.label }}
          </button>
        </div>

        <!-- Shop Items Grid -->
        <div class="shop-section">
          <div class="section-header">
            <h2>🛍️ 可购买</h2>
            <span>{{ filteredItems.length }} 件商品</span>
          </div>

          <div v-if="filteredItems.length === 0" class="empty-box">
            <span>📭</span>
            该分类暂无商品
          </div>

          <div v-else class="item-grid">
            <div
              v-for="item in filteredItems"
              :key="item.id"
              class="item-card"
              :class="{ owned: ownedCount(item.id) > 0 }"
            >
              <!-- 已拥有标记 -->
              <div
                v-if="ownedCount(item.id) > 0"
                class="owned-badge"
              >
                已拥有 {{ ownedCount(item.id) }}
              </div>

              <div class="item-header">
                <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                class="item-emoji"
                alt="icon"
                @error="item.imageUrl = ''"
              />
                <span v-else class="item-emoji">{{ item.emoji || '📦' }}</span>
                <div class="item-info">
                  <h3>{{ item.name }}</h3>
                  <p>{{ item.description }}</p>
                  <div class="item-tags">
                    <span class="tag" :class="item.usageType">
                      {{ usageTypeLabel(item.usageType, item.usageCount) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 效果预览 -->
              <div class="effect-line">
                <EffectTag :effect="item.effect" />
              </div>

              <div class="item-footer">
                <span class="price">{{ item.price }} 分</span>
                <button
                  :disabled="isDisplayMode || currentPoints < item.price"
                  class="buy-btn"
                  :class="{ disabled: isDisplayMode || currentPoints < item.price }"
                  @click="handleBuy(item.id)"
                >
                  {{ ownedCount(item.id) > 0 ? '再买' : '购买' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="divider">
          <div></div>
          <span>🎒 我的背包</span>
          <div></div>
        </div>

        <!-- Owned Inventory -->
        <div>
          <div v-if="inventory.length === 0" class="empty-box">
            <span>🎒</span>
            背包为空，去购买一些道具吧！
          </div>

          <div v-else class="inventory-list">
            <div
              v-for="inv in inventory"
              :key="inv.id"
              class="inv-card"
              :class="{ equipped: inv.isEquipped }"
            >
              <img
                v-if="getItemImage(inv.itemId)"
                :src="getItemImage(inv.itemId)"
                class="inv-emoji"
                alt="icon"
                @error="handleInvImageError(inv.itemId)"
              />
              <span v-else class="inv-emoji">{{ getItemEmoji(inv.itemId) }}</span>
              <div class="inv-info">
                <div class="inv-name">
                  <span>{{ getItemName(inv.itemId) }}</span>
                  <span v-if="inv.isEquipped" class="equipped-tag">已装备</span>
                </div>
                <div class="inv-meta">
                  {{ typeLabel(getItemType(inv.itemId)) }} · 数量 {{ inv.quantity }}
                </div>
              </div>
              <div class="inv-actions">
                <button
                  v-if="['accessory', 'background'].includes(getItemType(inv.itemId) || '')"
                  :disabled="isDisplayMode"
                  class="action-btn"
                  :class="inv.isEquipped ? 'secondary' : 'primary'"
                  @click="handleEquip(inv.id)"
                >
                  {{ inv.isEquipped ? '卸下' : '装备' }}
                </button>
                <button
                  v-if="['food', 'toy', 'magic'].includes(getItemType(inv.itemId) || '')"
                  :disabled="isDisplayMode"
                  class="action-btn use"
                  @click="handleUse(inv.id)"
                >
                  使用
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="statusMessage" class="toast-success">
          {{ statusMessage }}
        </div>
      </Transition>
      <Transition name="toast">
        <div v-if="statusError" class="toast-error">
          {{ statusError }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { playerApi } from '@/api'
import { playPurchase, playEquip } from '@/composables/useSound'

const route = useRoute()
const playerId = route.params.playerId as string
const backLink = computed(() => {
  const c = route.query.c as string
  return c ? `/player/${playerId}?c=${c}` : `/player/${playerId}`
})

interface ShopItemInfo {
  id: string
  name: string
  description: string
  emoji?: string
  type: string
  usageType?: string
  usageCount?: number | null
  price: number
  effect?: any
  imageUrl?: string | null
}

interface InventoryItem {
  id: string
  itemId: string
  quantity: number
  isEquipped: boolean
}

const shopItems = ref<ShopItemInfo[]>([])
const inventory = ref<InventoryItem[]>([])
const currentPoints = ref(0)
const isDisplayMode = ref(false)
const loading = ref(true)
const statusMessage = ref('')
const statusError = ref('')
const activeCategory = ref('all')
const brokenImages = ref(new Set<string>())

const categoryTabs = [
  { value: 'all', label: '全部', emoji: '📦' },
  { value: 'food', label: '食物', emoji: '🍖' },
  { value: 'accessory', label: '配饰', emoji: '🎀' },
  { value: 'background', label: '背景', emoji: '🖼️' },
  { value: 'toy', label: '玩具', emoji: '🧸' },
  { value: 'magic', label: '魔法', emoji: '✨' },
]

const filteredItems = computed(() => {
  if (activeCategory.value === 'all') return shopItems.value
  return shopItems.value.filter((i) => i.type === activeCategory.value)
})

// 快速查找已拥有数量
const inventoryMap = computed(() => {
  const map = new Map<string, number>()
  for (const inv of inventory.value) {
    map.set(inv.itemId, (map.get(inv.itemId) || 0) + inv.quantity)
  }
  return map
})

function ownedCount(itemId: string): number {
  return inventoryMap.value.get(itemId) || 0
}

onMounted(async () => {
  try {
    const [shopRes, modeRes] = await Promise.all([
      playerApi.getShop(playerId),
      playerApi.getMode(playerId),
    ])
    shopItems.value = shopRes.data.data?.items || []
    inventory.value = shopRes.data.data?.inventory || []
    currentPoints.value = shopRes.data.data?.currentPoints || 0
    isDisplayMode.value = modeRes.data.data?.playerMode === 'display'
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
})

function getItemName(itemId: string): string {
  const item = shopItems.value.find((i) => i.id === itemId)
  return item?.name || '未知物品'
}

function getItemEmoji(itemId: string): string {
  const item = shopItems.value.find((i) => i.id === itemId)
  return item?.emoji || '📦'
}

function getItemImage(itemId: string): string | undefined {
  if (brokenImages.value.has(itemId)) return undefined
  const item = shopItems.value.find((i) => i.id === itemId)
  if (item?.imageUrl) return item.imageUrl
  // 徽章类物品显示 SVG 队徽
  if (item?.type === 'badge' && item.effect?.equip?.badgeSvg) {
    return item.effect.equip.badgeSvg
  }
  return undefined
}

function handleInvImageError(itemId: string) {
  brokenImages.value.add(itemId)
}

function getItemType(itemId: string): string {
  const item = shopItems.value.find((i) => i.id === itemId)
  return item?.type || ''
}

function usageTypeLabel(usageType: string | undefined, usageCount: number | null | undefined): string {
  switch (usageType) {
    case 'consume': return '🍽️ 使用一次'
    case 'rent': return `⏳ 首次装备后 ${usageCount ?? 7} 天`
    case 'charge': return `🎮 可用 ${usageCount ?? 5} 次`
    case 'equip': return '👑 永久拥有'
    case 'replace': return '🖼️ 替换背景'
    default: return ''
  }
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    food: '食物', accessory: '配饰', background: '背景',
    toy: '玩具', magic: '魔法',
  }
  return map[type] || type
}

async function handleBuy(itemId: string) {
  statusMessage.value = ''
  statusError.value = ''
  try {
    const res = await playerApi.buy(playerId, itemId)
    currentPoints.value = res.data.data?.currentPoints ?? currentPoints.value
    const shopRes = await playerApi.getShop(playerId)
    shopItems.value = shopRes.data.data?.items || []
    inventory.value = shopRes.data.data?.inventory || []
    currentPoints.value = shopRes.data.data?.currentPoints || 0
    const itemName = getItemName(itemId)
    statusMessage.value = '✅ 购买成功！' + getItemEmoji(itemId) + ' ' + itemName
    playPurchase()
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '购买失败'
  }
}

async function handleEquip(inventoryId: string) {
  statusMessage.value = ''
  statusError.value = ''
  try {
    await playerApi.equip(playerId, inventoryId)
    const shopRes = await playerApi.getShop(playerId)
    inventory.value = shopRes.data.data?.inventory || []
    const inv = inventory.value.find((i) => i.id === inventoryId)
    const itemName = getItemName(inv?.itemId || '')
    const isEquipped = inv?.isEquipped
    statusMessage.value = isEquipped ? '🎩 已装备 ' + itemName : '👒 已卸下 ' + itemName
    playEquip()
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '操作失败'
  }
}

async function handleUse(inventoryId: string) {
  statusMessage.value = ''
  statusError.value = ''
  try {
    await playerApi.use(playerId, inventoryId)
    const shopRes = await playerApi.getShop(playerId)
    inventory.value = shopRes.data.data?.inventory || []
    const inv = inventory.value.find((i) => i.id === inventoryId)
    const itemName = getItemName(inv?.itemId || '')
    statusMessage.value = `✨ 已使用 ${itemName}`
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '使用失败'
  }
}
</script>

<script lang="ts">
// 效果标签组件
import { defineComponent, h } from 'vue'

export const EffectTag = defineComponent({
  props: { effect: Object },
  setup(props) {
    const tags: string[] = []
    const eff = props.effect || {}
    const consume = eff.consume || eff
    if (consume.hunger) tags.push(`🍖 饱食+${consume.hunger}`)
    if (consume.mood) tags.push(`💚 心情+${consume.mood}`)
    if (consume.carePoints) tags.push(`📈 成长+${consume.carePoints}`)
    if (eff.equip?.moodBonus) tags.push(`💚 心情+${eff.equip.moodBonus}`)
    if (eff.equip?.decoration) tags.push(`🎀 装饰`)
    if (eff.equip?.backgroundId) tags.push(`🖼️ 背景`)

    return () => h('span', { class: 'text-[10px] text-white/50' }, tags.join(' · ') || '无效果')
  },
})
</script>

<style scoped>
/* ===== Page Background (与球员个人页面一致) ===== */
.shop-page {
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  display: flex;
  justify-content: center;
}

.page-container {
  width: 100%;
  max-width: 672px;
  margin: 0 auto;
}

/* ===== Header ===== */
.back-btn {
  color: #666;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  transition: color 0.2s;
}
.back-btn:hover {
  color: #333;
}

.page-title {
  font-family: 'ZCOOL KuaiLe', 'PingFang SC', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.points-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Russo One', sans-serif;
  font-size: 16px;
  color: #ff9800;
  background: white;
  padding: 6px 12px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

/* ===== Warning Box ===== */
.warning-box {
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 20px;
  text-align: center;
}
.warning-box p {
  color: #f57c00;
  font-size: 13px;
  margin: 0;
}

/* ===== Category Tabs ===== */
.category-tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.6);
  color: #555;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.9);
}

.tab-btn.active {
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 10px rgba(66, 165, 245, 0.25);
}

/* ===== Section Header ===== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h2 {
  font-family: 'ZCOOL KuaiLe', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.section-header span {
  font-size: 12px;
  color: #999;
}

/* ===== Item Grid ===== */
.item-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.item-grid > .item-card {
  flex: 0 0 calc(50% - 6px);
  max-width: calc(50% - 6px);
}

.item-card {
  background: white;
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.item-card.owned {
  border-color: rgba(255, 152, 0, 0.3);
}

.owned-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #66bb6a, #43a047);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(102, 187, 106, 0.3);
  z-index: 2;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  justify-content: center;
  text-align: center;
}

.item-info {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.item-emoji {
  width: 32px;
  height: 32px;
  object-fit: contain;
  font-size: 32px;
  line-height: 1;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-info h3 {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-info p {
  font-size: 11px;
  color: #999;
  margin: 2px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-tags {
  margin-top: 4px;
}
.item-tags .tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.06);
  color: #666;
}
.item-tags .tag.rent {
  background: rgba(255, 152, 0, 0.12);
  color: #e65100;
}
.item-tags .tag.charge {
  background: rgba(33, 150, 243, 0.12);
  color: #1565c0;
}

.effect-line {
  margin-bottom: 8px;
  text-align: center;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.price {
  font-family: 'Russo One', sans-serif;
  font-size: 15px;
  color: #ff9800;
  font-weight: 700;
}

.buy-btn {
  padding: 6px 14px;
  border-radius: 10px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, #ff9800, #ffb74d);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.2);
}

.buy-btn:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
  transform: translateY(-1px);
}

.buy-btn.disabled {
  background: #e0e0e0;
  color: #999;
  cursor: not-allowed;
  box-shadow: none;
}

/* ===== Divider ===== */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0;
}

.divider div {
  flex: 1;
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
}

.divider span {
  font-size: 12px;
  color: #bbb;
}

/* ===== Empty Box ===== */
.empty-box {
  text-align: center;
  padding: 40px;
  color: #bbb;
  font-size: 14px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.empty-box span {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
  opacity: 0.5;
}

/* ===== Inventory List ===== */
.inventory-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inv-card {
  background: white;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.inv-card.equipped {
  border-color: rgba(76, 175, 80, 0.3);
  background: linear-gradient(135deg, #fff, #f1f8e9);
}

.inv-emoji {
  width: 32px;
  height: 32px;
  object-fit: contain;
  font-size: 32px;
  line-height: 1;
}

.inv-info {
  flex: 1;
  min-width: 0;
}

.inv-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.equipped-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
  font-weight: 700;
}

.inv-meta {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.inv-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  padding: 6px 14px;
  border-radius: 10px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: linear-gradient(135deg, #66bb6a, #43a047);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 187, 106, 0.2);
}

.action-btn.secondary {
  background: rgba(0, 0, 0, 0.06);
  color: #666;
}

.action-btn.use {
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  box-shadow: 0 2px 8px rgba(66, 165, 245, 0.2);
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ===== Toast ===== */
.toast-success {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 50;
}

.toast-error {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  background: #ffebee;
  color: #c62828;
  border: 1px solid rgba(239, 68, 68, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 50;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* ===== Skeleton ===== */
.skeleton-light {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 12px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .item-grid {
    grid-template-columns: 1fr;
  }
}
</style>
