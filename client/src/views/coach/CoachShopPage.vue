<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold" style="font-family: var(--font-display)">商店管理</h2>

    <!-- Edit Shop Item Form -->
    <div class="glass-card p-4">
      <h3 class="text-sm font-semibold mb-3 text-white/70">{{ editingItem ? '编辑物品' : '物品管理' }}</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input v-model="shopForm.name" placeholder="物品名称" class="input-field" />
        <input v-model="shopForm.description" placeholder="描述" class="input-field" />
        <input v-model.number="shopForm.price" type="number" placeholder="价格" class="input-field" />
        <input v-model.number="shopForm.stock" type="number" placeholder="库存" class="input-field" />
        <select v-model="shopForm.type" class="input-field">
          <option value="food">食物</option>
          <option value="decoration">装饰</option>
          <option value="special">特殊</option>
        </select>
        <input v-model.number="effectForm.hunger" type="number" placeholder="饥饿效果" class="input-field" />
        <input v-model.number="effectForm.mood" type="number" placeholder="心情效果" class="input-field" />
        <input v-model.number="effectForm.experience" type="number" placeholder="经验效果" class="input-field" />
        <div class="flex gap-2">
          <button class="btn-primary" @click="editingItem ? saveEdit() : addItem()">
            {{ editingItem ? '保存' : '添加' }}
          </button>
          <button
            v-if="editingItem"
            class="px-4 py-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
            @click="cancelEdit()"
          >
            取消
          </button>
        </div>
      </div>
      <p class="text-xs text-white/40 mt-2">新增物品需通过后端API直接创建，此处仅支持编辑已有物品</p>
    </div>

    <!-- Shop Items Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="item in items"
        :key="item.id"
        :class="['glass-card p-4 transition-all', !item.isActive && 'opacity-50']"
      >
        <div class="flex items-start justify-between mb-2">
          <div>
            <h4 class="font-semibold">{{ item.name }}</h4>
            <p class="text-xs text-white/40">{{ item.description }}</p>
          </div>
          <span class="text-xs px-2 py-1 bg-white/10 rounded text-white/60">{{ typeLabel(item.type) }}</span>
        </div>
        <div class="flex justify-between text-sm mb-3">
          <span class="text-[#FFD700] font-semibold" style="font-family: var(--font-num)">{{ item.price }} 分</span>
          <span class="text-white/40">库存: {{ item.stock }}</span>
        </div>
        <div class="flex gap-1">
          <button class="px-2 py-1 text-xs bg-white/10 text-white/60 rounded hover:bg-white/20 transition-colors" @click="startEdit(item)">编辑</button>
          <button class="px-2 py-1 text-xs bg-white/10 text-white/60 rounded hover:bg-white/20 transition-colors" @click="toggleActive(item)">
            {{ item.isActive ? '下架' : '上架' }}
          </button>
        </div>
      </div>
      <div v-if="items.length === 0" class="col-span-full text-center text-white/40 py-8">暂无可管理的物品</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { coachApi } from '@/api'

interface ShopItem {
  id: string
  name: string
  description: string
  type: string
  price: number
  stock: number
  isActive: boolean
  effect: any
}

const items = ref<ShopItem[]>([])
const editingItem = ref<ShopItem | null>(null)
const shopForm = ref({ name: '', description: '', type: 'food', price: 0, stock: 0 })
const effectForm = ref({ hunger: 0, mood: 0, experience: 0 })

onMounted(loadItems)

async function loadItems() {
  try {
    const res = await coachApi.getShopItems()
    items.value = (res.data.data || []).filter((i: ShopItem) => i.coachId !== undefined)
  } catch (e) {
    console.error('Failed to load shop items', e)
  }
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { food: '食物', decoration: '装饰', special: '特殊' }
  return map[type] || type
}

function startEdit(item: ShopItem) {
  editingItem.value = item
  shopForm.value = { name: item.name, description: item.description, type: item.type, price: item.price, stock: item.stock }
  const eff = item.effect || {}
  effectForm.value = { hunger: eff.hunger || 0, mood: eff.mood || 0, experience: eff.experience || 0 }
}

function cancelEdit() {
  editingItem.value = null
  shopForm.value = { name: '', description: '', type: 'food', price: 0, stock: 0 }
  effectForm.value = { hunger: 0, mood: 0, experience: 0 }
}

async function saveEdit() {
  if (!editingItem.value) return
  try {
    await coachApi.updateShopItem(editingItem.value.id, {
      name: shopForm.value.name,
      description: shopForm.value.description,
      price: shopForm.value.price,
      stock: shopForm.value.stock,
      effect: { ...effectForm.value },
    })
    editingItem.value = null
    cancelEdit()
    await loadItems()
  } catch (e: any) {
    alert(e.response?.data?.error || '保存失败')
  }
}

async function addItem() {
  alert('请通过管理后台或 API 直接创建新物品')
}

async function toggleActive(item: ShopItem) {
  try {
    await coachApi.updateShopItem(item.id, { isActive: !item.isActive })
    await loadItems()
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}
</script>
