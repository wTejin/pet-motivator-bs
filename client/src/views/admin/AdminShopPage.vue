<template>
  <div class="magic-shop" style="color: #333;">
    <!-- Add / Edit Form -->
    <div class="form-card">
      <div class="form-header">{{ editingItem ? '✏️ 编辑商品' : '➕ 添加商品' }}</div>
      <div class="form-body">
        <div class="form-row">
          <div class="form-field short">
            <label class="field-label">图标</label>
            <button class="emoji-picker-btn" @click="showEmojiPicker = true">
              <span class="emoji-preview">{{ shopForm.emoji || '📦' }}</span>
            </button>
          </div>
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
              <option value="toy">玩具类</option>
              <option value="magic">魔法类</option>
            </select>
          </div>
          <div class="form-field">
            <label class="field-label">使用机制</label>
            <select v-model="shopForm.usageType" class="field-input">
              <option value="consume">🍽️ 消耗型（用一次少一个）</option>
              <option value="equip">👑 装备型（永久拥有）</option>
              <option value="rent">⏳ 租赁型（首次装备后计时到期）</option>
              <option value="charge">🎮 次数型（使用 N 次后消失）</option>
              <option value="replace">🖼️ 替换型（背景类，永久）</option>
            </select>
          </div>
          <div class="form-field short" v-if="shopForm.usageType === 'rent' || shopForm.usageType === 'charge'">
            <label class="field-label">
              {{ shopForm.usageType === 'rent' ? '有效期（天）' : '可用次数' }}
            </label>
            <input v-model.number="shopForm.usageCount" type="number" :placeholder="shopForm.usageType === 'rent' ? '7' : '5'" class="field-input" />
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
          <div class="form-field short">
            <label class="field-label">
              <input type="checkbox" v-model="shopForm.isLuckyDrop" style="margin-right:4px" />
              惊喜掉落
            </label>
            <select v-if="shopForm.isLuckyDrop" v-model="shopForm.rarity" class="field-input" style="margin-top:4px">
              <option value="common">🟢 普通 (55%)</option>
              <option value="uncommon">🔵 稀有 (28%)</option>
              <option value="rare">🟣 精良 (12%)</option>
              <option value="epic">🟠 史诗 (4%)</option>
              <option value="legendary">🟡 传说 (1%)</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field flex-2">
            <label class="field-label">描述</label>
            <input v-model="shopForm.description" placeholder="简短描述" class="field-input" />
          </div>
          <div class="form-field">
            <label class="field-label">商品图片</label>
            <div class="image-upload-row">
              <input v-model="shopForm.imageUrl" placeholder="图片 URL 或点击上传" class="field-input" />
              <button class="btn-upload" @click="shopImageInput?.click()">📷 上传</button>
              <input ref="shopImageInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden-input" @change="handleShopImageUpload" />
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field short">
            <label class="field-label">饱食效果</label>
            <input v-model.number="effectForm.hunger" type="number" placeholder="0" class="field-input" />
          </div>
          <div class="form-field short">
            <label class="field-label">心情效果</label>
            <input v-model.number="effectForm.mood" type="number" placeholder="0" class="field-input" />
          </div>
          <div class="form-field short">
            <label class="field-label">成长效果</label>
            <input v-model.number="effectForm.carePoints" type="number" placeholder="0" class="field-input" />
          </div>
          <div class="form-field short">
            <label class="field-label">装备装饰ID</label>
            <input v-model="effectForm.decoration" placeholder="如：bow" class="field-input" />
          </div>
          <div class="form-field short">
            <label class="field-label">背景ID</label>
            <input v-model="effectForm.backgroundId" placeholder="如：forest" class="field-input" />
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

    <!-- Emoji Picker Modal -->
    <Teleport to="body">
      <div v-if="showEmojiPicker" class="modal-overlay" @click.self="showEmojiPicker = false">
        <div class="picker-card">
          <div class="picker-header">
            <span class="picker-title">选择图标</span>
            <button class="picker-close" @click="showEmojiPicker = false">✕</button>
          </div>
          <div class="emoji-grid">
            <button
              v-for="emoji in emojiList"
              :key="emoji"
              class="emoji-option"
              :class="{ selected: shopForm.emoji === emoji }"
              @click="selectEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Items Grid -->
    <div class="items-grid">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="item-card"
        :class="{ inactive: !item.isActive }"
      >
        <div class="item-header">
          <div class="item-preview">
            <img
              v-if="getItemImage(item)"
              :src="getItemImage(item)"
              class="preview-img"
              alt="icon"
              @error="item.imageUrl = ''"
            />
            <span v-else class="preview-emoji">{{ item.emoji || '📦' }}</span>
          </div>
          <div class="item-name">{{ item.name }}</div>
          <span class="item-badge" :class="item.type">{{ typeLabel(item.type) }}</span>
          <span v-if="item.isLuckyDrop" class="item-badge lucky-badge">🎰 惊喜</span>
          <span v-if="item.rarity && item.isLuckyDrop" class="item-badge rarity-badge" :style="{ background: rarityColors[item.rarity] || '#888' }">
            {{ rarityLabels[item.rarity] || item.rarity }}
          </span>
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
          <span v-if="effectValue(item.effect, 'carePoints')" class="eff-tag">成长 {{ effectValue(item.effect, 'carePoints') }}</span>
          <span v-if="effectText(item.effect, 'decoration')" class="eff-tag equip-tag">🎀 {{ effectText(item.effect, 'decoration') }}</span>
          <span v-if="effectText(item.effect, 'backgroundId')" class="eff-tag equip-tag">🖼️ {{ effectText(item.effect, 'backgroundId') }}</span>
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
import type { ShopItemType, ShopItemUsageType } from '../../../../shared/types'

interface ShopItem {
  id: string
  name: string
  description: string
  emoji?: string
  type: string
  usageType?: string
  usageCount?: number | null
  price: number
  stock: number
  isActive: boolean
  isLuckyDrop?: boolean
  rarity?: string
  effect: any
  imageUrl?: string
  imageClass: string
  sortOrder: number
}

const items = ref<ShopItem[]>([])
const editingItem = ref<ShopItem | null>(null)
const activeCategory = ref('all')
const showEmojiPicker = ref(false)
const shopImageInput = ref<HTMLInputElement | null>(null)

const emojiList = [
  '🍖', '🥫', '🍫', '🎀', '🧣', '👑', '🌲', '🌌', '⚽', '🥏', '🤖', '🧪', '🧚',
  '📦', '🍎', '🍇', '🥕', '🍗', '🍕', '🍪', '🍩', '🧁', '🍿', '🥤', '🧃',
  '🎁', '🎈', '🎉', '🎊', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧸', '🪀',
  '⭐', '✨', '💫', '🔥', '💎', '💍', '👓', '🕶️', '👜', '👟', '🧤', '🧦',
  '🌟', '🌈', '☀️', '🌙', '⚡', '❄️', '🌊', '🍀', '🌸', '🌺', '🌻', '🌹',
]

const shopForm = ref({
  name: '',
  description: '',
  emoji: '📦',
  type: 'food' as ShopItemType,
  usageType: 'consume' as ShopItemUsageType,
  usageCount: null as number | null,
  price: 0,
  stock: 999,
  imageUrl: '',
  sortOrder: 0,
  isLuckyDrop: false,
  rarity: 'common',
})

const effectForm = ref({ hunger: 0, mood: 0, carePoints: 0, decoration: '', backgroundId: '' })

const categoryTabs = [
  { value: 'all', label: '全部', icon: '📦' },
  { value: 'lucky', label: '惊喜掉落', icon: '🎰' },
  { value: 'food', label: '食物类', icon: '🍎' },
  { value: 'accessory', label: '配饰类', icon: '🎀' },
  { value: 'background', label: '背景类', icon: '🖼️' },
  { value: 'toy', label: '玩具类', icon: '🧸' },
  { value: 'magic', label: '魔法类', icon: '✨' },
]

const rarityLabels: Record<string, string> = {
  common: '普通', uncommon: '稀有', rare: '精良', epic: '史诗', legendary: '传说',
}
const rarityColors: Record<string, string> = {
  common: '#4ade80', uncommon: '#60a5fa', rare: '#c084fc', epic: '#fb923c', legendary: '#fbbf24',
}

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
  if (activeCategory.value === 'lucky') return items.value.filter((i) => i.isLuckyDrop)
  return items.value.filter((i) => i.type === activeCategory.value)
})

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    food: '食物类',
    accessory: '配饰类',
    background: '背景类',
    toy: '玩具类',
    magic: '魔法类',
  }
  return map[type] || type
}

function getItemImage(item: any): string | undefined {
  if (item.imageUrl) return item.imageUrl
  const badgeSvg = item.effect?.equip?.badgeSvg
  if (badgeSvg) return badgeSvg
  return undefined
}

function effectValue(effect: any, key: string): number | null {
  if (!effect || typeof effect !== 'object') return null
  // 优先从 effect.consume 中读取
  const consumeVal = effect.consume?.[key]
  if (consumeVal != null) return Number(consumeVal)
  // 其次从 effect.equip 中读取（装备类的 mood 存为 moodBonus）
  const equipVal = effect.equip?.[key] ?? (key === 'mood' ? effect.equip?.moodBonus : undefined)
  if (equipVal != null) return Number(equipVal)
  // 兼容旧格式直接字段
  const directVal = effect[key]
  if (directVal != null) return Number(directVal)
  return null
}

function effectText(effect: any, key: string): string | null {
  if (!effect || typeof effect !== 'object') return null
  const equipVal = effect.equip?.[key]
  if (equipVal && typeof equipVal === 'string') return equipVal
  return null
}

function startEdit(item: ShopItem) {
  editingItem.value = item
  shopForm.value = {
    name: item.name,
    description: item.description,
    emoji: item.emoji || '📦',
    type: item.type as ShopItemType,
    usageType: (item.usageType || 'consume') as ShopItemUsageType,
    usageCount: item.usageCount ?? null,
    price: item.price,
    stock: item.stock,
    imageUrl: item.imageUrl || '',
    sortOrder: item.sortOrder,
    isLuckyDrop: item.isLuckyDrop || false,
    rarity: item.rarity || 'common',
  }
  const eff = item.effect || {}
  const consumeEff = eff.consume || eff
  const equipEff = eff.equip || {}
  effectForm.value = {
    hunger: consumeEff.hunger || 0,
    mood: consumeEff.mood || consumeEff.experience || 0,
    carePoints: consumeEff.carePoints || 0,
    decoration: equipEff.decoration || '',
    backgroundId: equipEff.backgroundId || '',
  }
}

function cancelEdit() {
  editingItem.value = null
  shopForm.value = { name: '', description: '', emoji: '📦', type: 'food', usageType: 'consume', usageCount: null, price: 0, stock: 999, imageUrl: '', sortOrder: 0, isLuckyDrop: false, rarity: 'common' }
  effectForm.value = { hunger: 0, mood: 0, carePoints: 0, decoration: '', backgroundId: '' }
}

function selectEmoji(emoji: string) {
  shopForm.value.emoji = emoji
  showEmojiPicker.value = false
}

async function handleShopImageUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert('文件大小不能超过 5MB')
    target.value = ''
    return
  }
  const formData = new FormData()
  formData.append('image', file)
  try {
    const res = await adminApi.uploadImage(formData)
    if (res.data.success) {
      shopForm.value.imageUrl = res.data.data.url
    }
  } catch (err: any) {
    alert(err.response?.data?.error || '上传失败，请检查文件格式（支持 JPG/PNG/GIF/WebP/SVG）')
  }
  target.value = ''
}

function buildEffect() {
  const eff: any = {}
  const isBgType = shopForm.value.type === 'background'

  // 背景类始终构建 equip 效果，忽略 usageType
  if (isBgType) {
    const equip: any = {}
    if (effectForm.value.mood) equip.moodBonus = Number(effectForm.value.mood)
    // backgroundId: 优先使用手动填写，否则从名称自动生成
    const bgId = effectForm.value.backgroundId || shopForm.value.name.replace(/[^a-zA-Z0-9一-鿿]/g, '').toLowerCase()
    if (bgId) equip.backgroundId = bgId
    eff.equip = equip
  } else if (shopForm.value.usageType === 'consume') {
    const consume: any = {}
    if (effectForm.value.hunger) consume.hunger = Number(effectForm.value.hunger)
    if (effectForm.value.mood) consume.mood = Number(effectForm.value.mood)
    if (effectForm.value.carePoints) consume.carePoints = Number(effectForm.value.carePoints)
    eff.consume = consume
  } else {
    const equip: any = {}
    if (effectForm.value.mood) equip.moodBonus = Number(effectForm.value.mood)
    if (effectForm.value.decoration) equip.decoration = effectForm.value.decoration
    if (effectForm.value.backgroundId) equip.backgroundId = effectForm.value.backgroundId
    eff.equip = equip
  }
  return eff
}

async function addItem() {
  if (!shopForm.value.name) return alert('请输入物品名称')
  try {
    await adminApi.createShopItem({
      ...shopForm.value,
      effect: buildEffect(),
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
      effect: buildEffect(),
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
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
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

.emoji-picker-btn {
  width: 100%;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}

.emoji-picker-btn:hover {
  border-color: #42a5f5;
}

.emoji-preview {
  font-size: 24px;
  line-height: 1;
}

.image-upload-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.image-upload-row .field-input {
  flex: 1;
}

.btn-upload {
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  background: rgba(66, 165, 245, 0.1);
  color: #1e88e5;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-upload:hover {
  background: rgba(66, 165, 245, 0.2);
}

.hidden-input {
  display: none;
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

.item-preview {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.preview-emoji {
  font-size: 28px;
  line-height: 1;
}

.item-name {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
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
.item-badge.lucky-badge { background: rgba(251, 191, 36, 0.15); color: #b45309; font-size: 10px; }
.item-badge.rarity-badge { color: #fff; font-size: 10px; }

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

.eff-tag.equip-tag {
  background: rgba(168, 85, 247, 0.1);
  color: #9333ea;
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

/* Emoji Picker Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}

.picker-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.picker-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: #666;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.picker-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.emoji-option {
  font-size: 24px;
  padding: 6px;
  border-radius: 10px;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-option:hover {
  background: rgba(0, 0, 0, 0.06);
}

.emoji-option.selected {
  border-color: #42a5f5;
  background: rgba(66, 165, 245, 0.1);
}
</style>
