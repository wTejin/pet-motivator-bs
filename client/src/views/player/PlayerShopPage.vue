<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 px-4 py-6">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <router-link
          :to="`/player/${playerId}`"
          class="text-white/60 hover:text-white transition-colors flex items-center gap-1"
        >
          <span class="text-lg">&#8592;</span> 返回
        </router-link>
        <h1 class="text-xl font-bold text-white">商店</h1>
        <div class="text-yellow-400 font-bold">{{ currentPoints }} 分</div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center text-white/60 py-8">加载中...</div>

      <template v-else>
        <!-- Display Mode Warning -->
        <div v-if="isDisplayMode" class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6 text-center">
          <p class="text-yellow-400 text-sm">教练已关闭操作权限，无法购买和使用道具</p>
        </div>

        <!-- Shop Items Grid -->
        <div class="mb-8">
          <h2 class="text-lg font-semibold text-white mb-4">可购买物品</h2>
          <div v-if="shopItems.length === 0" class="text-center text-white/40 py-4">暂无商品</div>
          <div v-else class="grid grid-cols-2 gap-3">
            <div
              v-for="item in shopItems"
              :key="item.id"
              class="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col"
            >
              <div class="flex-1">
                <h3 class="font-semibold text-white">{{ item.name }}</h3>
                <p class="text-xs text-white/50 mt-1">{{ item.description }}</p>
              </div>
              <div class="flex items-center justify-between mt-3">
                <span class="text-yellow-400 text-sm font-semibold">{{ item.price }} 分</span>
                <button
                  :disabled="isDisplayMode || currentPoints < item.price"
                  class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 disabled:text-white/30 text-white rounded-lg transition-colors"
                  @click="handleBuy(item.id)"
                >
                  购买
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Owned Inventory -->
        <div>
          <h2 class="text-lg font-semibold text-white mb-4">我的背包</h2>
          <div v-if="inventory.length === 0" class="text-center text-white/40 py-4">背包为空</div>
          <div v-else class="space-y-3">
            <div
              v-for="inv in inventory"
              :key="inv.id"
              :class="[
                'bg-white/5 border rounded-xl p-3 flex items-center justify-between',
                inv.isEquipped ? 'border-blue-500/50' : 'border-white/10',
              ]"
            >
              <div>
                <div class="text-sm font-medium text-white">
                  {{ getItemName(inv.itemId) }}
                  <span v-if="inv.isEquipped" class="text-blue-400 text-xs ml-1">[已装备]</span>
                </div>
                <div class="text-xs text-white/40">数量: {{ inv.quantity }}</div>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="getItemType(inv.itemId) === 'decoration'"
                  :disabled="isDisplayMode"
                  class="px-3 py-1 text-xs rounded-lg transition-colors"
                  :class="inv.isEquipped ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-white/10 text-white/60 hover:bg-white/20'"
                  @click="handleEquip(inv.id)"
                >
                  {{ inv.isEquipped ? '卸下' : '装备' }}
                </button>
                <button
                  v-if="getItemType(inv.itemId) === 'food'"
                  :disabled="isDisplayMode"
                  class="px-3 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-30"
                  @click="handleUse(inv.id)"
                >
                  使用
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Status -->
      <div v-if="statusMessage" class="mt-4 text-sm text-green-400 text-center">{{ statusMessage }}</div>
      <div v-if="statusError" class="mt-4 text-sm text-red-400 text-center">{{ statusError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { playerApi } from '@/api'

const route = useRoute()
const playerId = route.params.playerId as string

interface ShopItemInfo {
  id: string
  name: string
  description: string
  type: string
  price: number
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

function getItemType(itemId: string): string {
  const item = shopItems.value.find((i) => i.id === itemId)
  return item?.type || ''
}

async function handleBuy(itemId: string) {
  statusMessage.value = ''
  statusError.value = ''
  try {
    const res = await playerApi.buy(playerId, itemId)
    currentPoints.value = res.data.data?.currentPoints ?? currentPoints.value
    // Refresh shop data
    const shopRes = await playerApi.getShop(playerId)
    shopItems.value = shopRes.data.data?.items || []
    inventory.value = shopRes.data.data?.inventory || []
    currentPoints.value = shopRes.data.data?.currentPoints || 0
    statusMessage.value = '购买成功！'
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '购买失败'
  }
}

async function handleEquip(inventoryId: string) {
  statusMessage.value = ''
  statusError.value = ''
  try {
    await playerApi.equip(playerId, inventoryId)
    // Refresh inventory
    const shopRes = await playerApi.getShop(playerId)
    inventory.value = shopRes.data.data?.inventory || []
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
    statusMessage.value = '使用成功！'
  } catch (e: any) {
    statusError.value = e.response?.data?.error || '使用失败'
  }
}
</script>
