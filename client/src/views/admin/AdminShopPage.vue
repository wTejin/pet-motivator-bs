<template>
  <div class="magic-shop -m-4 md:-m-6 p-4 md:p-6 min-h-[calc(100vh-48px)]" style="background: linear-gradient(135deg, #e3f2fd, #e8f5e9); color: #333;">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="page-title">🏪 魔法集市</h2>
      <span class="page-sub">管理全局商品配置</span>
    </div>

    <!-- Add / Edit Form -->
    <div class="form-card">
      <div class="form-header">{{ editingItem ? '✏️ 编辑商品' : '➕ 添加商品' }}</div>
      <div class="form-body">
        <div class="form-row">
          <div class="form-field">
            <label class="field-label">物品名称</label>
            <input v-model="shopForm.name" placeholder="如：能量果实" class="field-input" />
          </div>
          <div class="form-field">
            <label class="field-label">物品类型</label>
            <select v-model="shopForm.type" class="field-input">
              <option value="food">食物类</option>
              <option value="accessory">配饰类</option>
              <option value="background">背景类</option>
              <option value="magic">魔法类</option>
            </select>
          </div>
          <div class="form-field short">
            <label class="field-label">价格</label>
            <input v-model.number="shopForm.price" type="number" placeholder="0" class="field-input" />
          </div>
          <div class="form-field short">
            <label class="field-label">库存</label>
            <input v-model.number="shopForm.stock" type="number" placeholder="999" class="field-input" />
          </div>
          <div class="form-field short">
            <label class="field-label">排序</label>
            <input v-model.number="shopForm.sortOrder" type="number" placeholder="0" class="field-input" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field flex-2">
            <label class="field-label">描述</label>
            <input v-model="shopForm.description" placeholder="简短描述" class="field-input" />
          </div>
          <div class="form-field short">
            <label class="field-label">饥饿效果</label>
            <input v-model.number="effectForm.hunger" type="number" placeholder="0" class="field-input" />
          </div>
          <div class="form-field short">
            <label class="field-label">心情效果</label>
            <input v-model.number="effectForm.mood" type="number" placeholder="0" class="field-input" />
          </div>
          <div class="form-field short">
            <label class="field-label">经验效果</label>
            <input v-model.number="effectForm.experience" type="number" placeholder="0" class="field-input" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-primary" @click="editingItem ? saveEdit() : addItem()">
            {{ editingItem ? '保存' : '添加' }}
          </button>
          <button v-if="editingItem" class="btn-secondary" @click="cancelEdit()">取消</button>
        </div>
      </div>
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
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- Items Grid -->
    <div class="items-grid">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="item-card"
        :class="{ inactive: !item.isActive }"
      >
        <div class="item-header">
          <div class="item-name">{{ item.name }}</div>
          <span class="item-badge" :class="item.type">{{ typeLabel(item.type) }}</span>
        </div>
        <div class="item-desc">{{ item.description || '暂无描述' }}</div>
        <div class="item-meta">
          <span class="meta-price">{{ item.price }} 分</span>
          <span class="meta-stock">库存 {{ item.stock }}</span>
          <span v-if="item.sortOrder" class="meta-sort">排序 {{ item.sortOrder }}</span>
        </div>
        <div class="item-effects">
          <span v-if="effectValue(item.effect, 'hunger')" class="eff-tag">饥饿 {{ effectValue(item.effect, 'hunger') }}</span>
          <span v-if="effectValue(item.effect, 'mood')" class="eff-tag">心情 {{ effectValue(item.effect, 'mood') }}</span>
          <span v-if="effectValue(item.effect, 'experience')" class="eff-tag">经验 {{ effectValue(item.effect, 'experience') }}</span>
        </div>
        <div class="item-actions">
          <button class="act-btn edit" @click="startEdit(item)">编辑</button>
          <button class="act-btn toggle" @click="toggleActive(item)">
            {{ item.isActive ? '下架' : '上架' }}
          </button>
          <button class="act-btn delete" @click="deleteItem(item.id)">删除</button>
        </div>
      </div>
      <div v-if="filteredItems.length === 0" class="empty-state">
        <span class="empty-icon">🏪</span>
        <p>该分类下暂无商品</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/api'

interface ShopItem {
  id: string
  name: string
  description: string
  type: string
  price: number
  stock: number
  isActive: boolean
  effect: any
  imageClass: string
  sortOrder: number
}

const items = ref<ShopItem[]>([])
const editingItem = ref<ShopItem | null>(null)
const activeCategory = ref('all')

const shopForm = ref({
  name: '',
  description: '',
  type: 'food',
  price: 0,
  stock: 999,
  sortOrder: 0,
})

const effectForm = ref({ hunger: 0, mood: 0, experience: 0 })

const categoryTabs = [
  { value: 'all', label: '全部', icon: '📦' },
  { value: 'food', label: '食物类', icon: '🍎' },
  { value: 'accessory', label: '配饰类', icon: '🎀' },
  { value: 'background', label: '背景类', icon: '🖼️' },
  { value: 'magic', label: '魔法类', icon: '✨' },
]

onMounted(loadItems)

async function loadItems() {
  try {
    const res = await adminApi.getShopItems()
    items.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load shop items', e)
  }
}

const filteredItems = computed(() => {
  if (activeCategory.value === 'all') return items.value
  return items.value.filter((i) => i.type === activeCategory.value)
})

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    food: '食物类',
    accessory: '配饰类',
    background: '背景类',
    magic: '魔法类',
  }
  return map[type] || type
}

function effectValue(effect: any, key: string): number | null {
  if (!effect || typeof effect !== 'object') return null
  const val = effect[key]
  return val ? Number(val) : null
}

function startEdit(item: ShopItem) {
  editingItem.value = item
  shopForm.value = {
    name: item.name,
    description: item.description,
    type: item.type,
    price: item.price,
    stock: item.stock,
    sortOrder: item.sortOrder || 0,
  }
  const eff = item.effect || {}
  effectForm.value = {
    hunger: eff.hunger || 0,
    mood: eff.mood || 0,
    experience: eff.experience || 0,
  }
}

function cancelEdit() {
  editingItem.value = null
  shopForm.value = { name: '', description: '', type: 'food', price: 0, stock: 999, sortOrder: 0 }
  effectForm.value = { hunger: 0, mood: 0, experience: 0 }
}

async function addItem() {
  if (!shopForm.value.name) return alert('请输入物品名称')
  try {
    await adminApi.createShopItem({
      ...shopForm.value,
      effect: { ...effectForm.value },
    })
    cancelEdit()
    await loadItems()
  } catch (e: any) {
    alert(e.response?.data?.error || '添加失败')
  }
}

async function saveEdit() {
  if (!editingItem.value) return
  try {
    await adminApi.updateShopItem(editingItem.value.id, {
      ...shopForm.value,
      effect: { ...effectForm.value },
    })
    cancelEdit()
    await loadItems()
  } catch (e: any) {
    alert(e.response?.data?.error || '保存失败')
  }
}

async function toggleActive(item: ShopItem) {
  try {
    await adminApi.updateShopItem(item.id, { isActive: !item.isActive })
    await loadItems()
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

async function deleteItem(id: string) {
  if (!confirm('确认删除该商品？此操作不可撤销。')) return
  try {
    await adminApi.deleteShopItem(id)
    await loadItems()
  } catch (e: any) {
    alert(e.response?.data?.error || '删除失败')
  }
}
</script>

<style scoped>
.magic-shop {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-title {
  font-size: 18px;
  font-weight: 800;
  color: #1a1a2e;
  font-family: var(--font-display);
  margin: 0;
}

.page-sub {
  font-size: 13px;
  color: #999;
}

/* Form Card */
.form-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.form-header {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #333;
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.form-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.form-field.short {
  flex: 0 0 80px;
}

.form-field.flex-2 {
  flex: 2;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.field-input {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: #333;
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.15);
}

.form-actions {
  display: flex;
  gap: 10px;
}

.btn-primary {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: #666;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Category Tabs */
.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

/* Items Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 1200px) {
  .items-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .items-grid {
    grid-template-columns: 1fr;
  }
}

.item-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.item-card.inactive {
  opacity: 0.5;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-name {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  flex-shrink: 0;
}

.item-badge.food { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
.item-badge.accessory { background: rgba(236, 72, 153, 0.1); color: #db2777; }
.item-badge.background { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.item-badge.magic { background: rgba(168, 85, 247, 0.1); color: #9333ea; }

.item-desc {
  font-size: 12px;
  color: #888;
  line-height: 1.4;
  min-height: 18px;
}

.item-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.meta-price {
  font-size: 14px;
  font-weight: 800;
  color: #ff9800;
  font-family: var(--font-num);
}

.meta-stock,
.meta-sort {
  font-size: 11px;
  color: #999;
}

.item-effects {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.eff-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  color: #666;
}

.item-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.act-btn {
  padding: 6px 0;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.act-btn.edit {
  background: rgba(66, 165, 245, 0.1);
  color: #1e88e5;
}

.act-btn.edit:hover {
  background: rgba(66, 165, 245, 0.2);
}

.act-btn.toggle {
  background: rgba(255, 152, 0, 0.1);
  color: #f57c00;
}

.act-btn.toggle:hover {
  background: rgba(255, 152, 0, 0.2);
}

.act-btn.delete {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.act-btn.delete:hover {
  background: rgba(239, 68, 68, 0.2);
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

.empty-icon {
  font-size: 40px;
  opacity: 0.5;
}
</style>
