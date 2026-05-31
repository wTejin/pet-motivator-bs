<template>
  <div class="pet-species-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-actions">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input v-model="searchQuery" type="text" placeholder="搜索物种名称..." class="search-input" />
        </div>
        <button class="btn-primary" @click="showCreate = true">+ 新增物种</button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-chip">
        <span class="chip-emoji">🐾</span>
        物种总数 {{ speciesList.length }}
      </div>
      <div class="stat-chip">
        <span class="chip-emoji">🥚</span>
        蛋阶段 {{ speciesList.length }}
      </div>
      <div class="stat-chip">
        <span class="chip-emoji">✨</span>
        稀有阶段 {{ speciesList.length }}
      </div>
      <p class="stats-hint">
        每种物种包含 5 个成长阶段：蛋 → 幼崽 → 少年 → 成年 → 稀有
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">加载中...</div>

    <!-- Empty -->
    <div v-else-if="filteredSpecies.length === 0" class="empty-state">
      <span class="empty-icon">🐾</span>
      <p v-if="searchQuery">未找到匹配的物种</p>
      <p v-else>暂无宠物物种，点击上方按钮添加</p>
    </div>

    <!-- Species List -->
    <div v-else class="species-list">
      <div v-for="s in filteredSpecies" :key="s.id" class="species-card">
        <div class="species-summary" @click="toggleExpand(s.id)">
          <div class="species-left">
            <div class="species-emoji">
              <img
                v-if="s.stages?.rare?.imageUrl"
                :src="s.stages.rare.imageUrl"
                class="species-rare-img"
                alt="rare"
              />
              <span v-else>{{ s.stages?.rare?.emoji || s.emoji || '✨' }}</span>
            </div>
            <div class="species-info">
              <div class="species-name">{{ s.name }}</div>
              <div class="species-meta">
                <span class="meta-id">ID: {{ s.id }}</span>
                <span class="meta-category">分类: {{ s.category }}</span>
              </div>
            </div>
          </div>
          <div class="species-right">
            <div class="color-preview">
              <span class="color-dot" :style="{ background: s.backgroundColor }" :title="'背景色: ' + s.backgroundColor"></span>
              <span class="color-dot" :style="{ background: s.accentColor }" :title="'强调色: ' + s.accentColor"></span>
            </div>
            <div class="species-actions">
              <button class="btn-icon" @click.stop="editSpecies(s)">✏️</button>
              <button class="btn-icon danger" @click.stop="confirmDelete(s)">🗑️</button>
            </div>
          </div>
        </div>

        <!-- Expanded Detail -->
        <div v-if="expandedId === s.id" class="species-detail">
          <div class="detail-section">
            <h4 class="section-title">📋 基本信息</h4>
            <div class="config-row">
              <div class="config-field">
                <label>分类</label>
                <select v-model="s.category" class="form-input form-field-select" style="width: 100%;">
                  <option v-for="cat in CATEGORY_OPTIONS" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="config-field">
                <label>Emoji</label>
                <button class="emoji-picker-btn" @click="openEmojiPicker((e: string) => s.emoji = e)">
                  <span class="emoji-preview">{{ s.emoji || '✨' }}</span>
                </button>
              </div>
            </div>
            <div class="config-row" style="margin-top: 8px;">
              <div class="config-field" style="flex: 2;">
                <label>性格描述</label>
                <input v-model="s.description" class="form-input" placeholder="在选宠物时展示给队员看的介绍语" />
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="section-title">🎨 外观配置</h4>
            <div class="config-row">
              <div class="config-field">
                <label>背景色</label>
                <div class="color-input-row">
                  <input v-model="s.backgroundColor" class="form-input" />
                  <span class="color-preview-lg" :style="{ background: s.backgroundColor }"></span>
                </div>
              </div>
              <div class="config-field">
                <label>强调色</label>
                <div class="color-input-row">
                  <input v-model="s.accentColor" class="form-input" />
                  <span class="color-preview-lg" :style="{ background: s.accentColor }"></span>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="section-title">
              📈 成长阶段
              <span class="stage-hint">共 {{ orderedStages(s.stages).length }} 个阶段</span>
            </h4>
            <div class="stages-timeline">
              <div v-for="(stage, idx) in orderedStages(s.stages)" :key="stage.key" class="stage-card">
                <div class="stage-step">{{ idx + 1 }}</div>
                <div class="stage-body">
                  <div class="stage-header-row">
                    <span class="stage-key">{{ stage.label || STAGE_LABELS[stage.key] || stage.key }}</span>
                    <span class="stage-emoji-lg">{{ stage.emoji }}</span>
                  </div>
                  <div class="stage-inputs">
                    <button
                      class="stage-emoji-btn"
                      @click="openEmojiPicker((e: string) => (s.stages as any)[stage.key].emoji = e)"
                    >
                      <span>{{ stage.emoji || '✨' }}</span>
                    </button>
                    <div class="image-upload-row">
                      <input v-model="(s.stages as any)[stage.key].imageUrl" class="stage-input" placeholder="图片URL" />
                      <input
                        :ref="el => setFileInputRef(el as HTMLInputElement, s.id, stage.key)"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        class="hidden-file-input"
                        @change="handleFileChange($event, (s.stages as any)[stage.key])"
                      />
                      <button class="btn-upload" @click="triggerUpload(s.id, stage.key)">📤</button>
                    </div>
                  </div>
                  <img v-if="stage.imageUrl" :src="stage.imageUrl" class="stage-preview" />
                </div>
              </div>
            </div>
          </div>

          <div class="detail-actions">
            <button class="btn-save" @click="saveSpecies(s)">💾 保存修改</button>
            <button class="btn-cancel" @click="expandedId = ''">取消</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增物种弹窗 -->
    <Transition name="modal">
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
        <div class="modal-panel">
          <h3 class="modal-title">➕ 新增物种</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">ID（唯一标识）</label>
              <input v-model="createForm.id" class="form-input" placeholder="如: puppy" />
            </div>
            <div class="form-group">
              <label class="form-label">名称</label>
              <input v-model="createForm.name" class="form-input" placeholder="如: 小狗" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">分类</label>
              <select v-model="createForm.category" class="form-input">
                <option value="" disabled>请选择分类</option>
                <option v-for="cat in CATEGORY_OPTIONS" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">性格描述</label>
              <input v-model="createForm.description" class="form-input" placeholder="比如：它看着威风凛凛，其实是个爱卖萌的守护神！" />
            </div>
            <div class="form-group">
              <label class="form-label">Emoji</label>
              <button class="emoji-picker-btn" @click="openEmojiPicker((e: string) => createForm.emoji = e)">
                <span class="emoji-preview">{{ createForm.emoji || '✨' }}</span>
              </button>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">背景色</label>
              <div class="color-input-row">
                <input v-model="createForm.backgroundColor" class="form-input" />
                <span class="color-preview-lg" :style="{ background: createForm.backgroundColor }"></span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">强调色</label>
              <div class="color-input-row">
                <input v-model="createForm.accentColor" class="form-input" />
                <span class="color-preview-lg" :style="{ background: createForm.accentColor }"></span>
              </div>
            </div>
          </div>
          <div class="detail-section" style="margin-top: 12px;">
            <h4 class="section-title" style="margin-bottom: 10px;">📈 成长阶段配置</h4>
            <div class="stages-timeline" style="gap: 8px;">
              <div
                v-for="(stage, idx) in orderedStages(createForm.stages as Record<string, StageInfo>)"
                :key="stage.key"
                class="stage-card"
                style="min-width: 120px; padding: 10px;"
              >
                <div class="stage-step">{{ idx + 1 }}</div>
                <div class="stage-body">
                  <div class="stage-header-row" style="margin-bottom: 6px;">
                    <span class="stage-key">{{ stage.label || STAGE_LABELS[stage.key] || stage.key }}</span>
                    <span class="stage-emoji-lg">{{ stage.emoji }}</span>
                  </div>
                  <div class="stage-inputs" style="gap: 4px;">
                    <button
                      class="stage-emoji-btn"
                      @click="openEmojiPicker((e: string) => (createForm.stages as any)[stage.key].emoji = e)"
                    >
                      <span>{{ stage.emoji || '✨' }}</span>
                    </button>
                    <div class="image-upload-row">
                      <input
                        v-model="(createForm.stages as any)[stage.key].imageUrl"
                        class="stage-input"
                        placeholder="图片URL"
                      />
                      <input
                        :ref="(el: any) => setCreateFileRef(el as HTMLInputElement, stage.key)"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        class="hidden-file-input"
                        @change="handleCreateStageFile($event, stage.key)"
                      />
                      <button class="btn-upload" @click="triggerCreateUpload(stage.key)">📤</button>
                    </div>
                  </div>
                  <img
                    v-if="stage.imageUrl"
                    :src="stage.imageUrl"
                    class="stage-preview"
                    style="width: 36px; height: 36px; margin-top: 4px;"
                    alt="preview"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-save" @click="submitCreate">创建</button>
            <button class="btn-cancel" @click="showCreate = false">取消</button>
          </div>
        </div>
      </div>
    </Transition>

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
              @click="selectEmojiForPicker(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认 -->
    <Transition name="modal">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-panel">
          <h3 class="modal-title">⚠️ 确认删除</h3>
          <p class="modal-text">
            确定要删除 <strong>{{ deleteTarget?.name }}</strong> 吗？<br />
            该物种下的所有宠物数据将不受影响，但新宠物将无法选择此物种。
          </p>
          <div class="modal-actions">
            <button class="btn-danger" @click="doDelete">删除</button>
            <button class="btn-cancel" @click="showDeleteConfirm = false">取消</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '@/api'

interface StageInfo {
  emoji: string
  imageUrl: string
  label: string
}

const CATEGORY_OPTIONS = ['狗系', '猫系', '玄幻系', '鸟系', '水系']
const STAGE_ORDER = ['egg', 'level1', 'level2', 'level3', 'rare']
const STAGE_LABELS: Record<string, string> = { egg: '蛋', level1: '幼崽', level2: '少年', level3: '成年', rare: '稀有' }

// 将 stages 对象转为固定顺序的数组
function orderedStages(stages: Record<string, StageInfo>): { key: string; emoji: string; imageUrl: string; label: string }[] {
  return STAGE_ORDER.filter(k => stages[k]).map(k => ({ key: k, ...stages[k] }))
}

interface SpeciesItem {
  id: string
  name: string
  category: string
  description: string
  emoji: string
  backgroundColor: string
  accentColor: string
  stages: Record<string, StageInfo>
}

const speciesList = ref<SpeciesItem[]>([])
const loading = ref(true)
const expandedId = ref('')
const showCreate = ref(false)
const searchQuery = ref('')

const defaultStages = () => ({
  egg: { emoji: '🥚', imageUrl: '', label: '蛋' },
  level1: { emoji: '🐣', imageUrl: '', label: '幼崽' },
  level2: { emoji: '🐥', imageUrl: '', label: '少年' },
  level3: { emoji: '🐤', imageUrl: '', label: '成年' },
  rare: { emoji: '✨', imageUrl: '', label: '稀有' },
})

const createForm = ref({
  id: '',
  name: '',
  category: '',
  description: '',
  emoji: '',
  backgroundColor: '#e3f2fd',
  accentColor: '#42a5f5',
  stages: defaultStages(),
})

const showDeleteConfirm = ref(false)
const deleteTarget = ref<SpeciesItem | null>(null)

const emojiList = [
  '🍖', '🥫', '🍫', '🎀', '🧣', '👑', '🌲', '🌌', '⚽', '🥏', '🤖', '🧪', '🧚',
  '📦', '🍎', '🍇', '🥕', '🍗', '🍕', '🍪', '🍩', '🧁', '🍿', '🥤', '🧃',
  '🎁', '🎈', '🎉', '🎊', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧸', '🪀',
  '⭐', '✨', '💫', '🔥', '💎', '💍', '👓', '🕶️', '👜', '👟', '🧤', '🧦',
  '🌟', '🌈', '☀️', '🌙', '⚡', '❄️', '🌊', '🍀', '🌸', '🌺', '🌻', '🌹',
  '🥚', '🐣', '🐥', '🐤', '🐲', '🐉', '🦁', '🐯', '🦅', '🐺', '🐻', '🦊',
]

// Emoji picker
const showEmojiPicker = ref(false)
const emojiCallback = ref<(emoji: string) => void>(() => {})

function openEmojiPicker(callback: (emoji: string) => void) {
  emojiCallback.value = callback
  showEmojiPicker.value = true
}

function selectEmojiForPicker(emoji: string) {
  emojiCallback.value(emoji)
  showEmojiPicker.value = false
}

const fileInputMap = ref<Record<string, HTMLInputElement>>({})
const createFileInputMap = ref<Record<string, HTMLInputElement>>({})

const filteredSpecies = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return speciesList.value
  return speciesList.value.filter(
    (s) =>
      s.name.includes(q) ||
      s.id.includes(q) ||
      s.category.includes(q)
  )
})

function setFileInputRef(el: HTMLInputElement, speciesId: string, stageKey: string) {
  if (el) fileInputMap.value[`${speciesId}-${stageKey}`] = el
}

function setCreateFileRef(el: HTMLInputElement, stageKey: string) {
  if (el) createFileInputMap.value[stageKey] = el
}

function triggerUpload(speciesId: string, stageKey: string) {
  const key = `${speciesId}-${stageKey}`
  const input = fileInputMap.value[key]
  if (input) input.click()
}

function triggerCreateUpload(stageKey: string) {
  const input = createFileInputMap.value[stageKey]
  if (input) input.click()
}

async function handleFileChange(event: Event, stage: StageInfo) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('image', file)

  try {
    const res = await adminApi.uploadImage(formData)
    if (res.data.success) {
      stage.imageUrl = res.data.data.url
    } else {
      alert(res.data.error || '上传失败')
    }
  } catch (e: any) {
    alert(e.response?.data?.error || '上传失败')
  } finally {
    input.value = ''
  }
}

function handleCreateStageFile(event: Event, stageKey: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('image', file)

  adminApi.uploadImage(formData)
    .then((res: any) => {
      if (res.data.success) {
        (createForm.value.stages as any)[stageKey].imageUrl = res.data.data.url
      } else {
        alert(res.data.error || '上传失败')
      }
    })
    .catch((e: any) => {
      alert(e.response?.data?.error || '上传失败')
    })
    .finally(() => {
      input.value = ''
    })
}

async function loadSpecies() {
  loading.value = true
  try {
    const res = await adminApi.getPetSpecies()
    if (res.data.success) {
      speciesList.value = res.data.data || []
    }
  } catch {
    alert('加载失败')
  } finally {
    loading.value = false
  }
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? '' : id
}

function editSpecies(s: SpeciesItem) {
  expandedId.value = s.id
}

async function saveSpecies(s: SpeciesItem) {
  try {
    const res = await adminApi.updatePetSpecies(s.id, {
      name: s.name,
      category: s.category,
      description: s.description,
      emoji: s.emoji,
      backgroundColor: s.backgroundColor,
      accentColor: s.accentColor,
      stages: s.stages,
    })
    if (res.data.success) {
      expandedId.value = ''
      await loadSpecies()
    }
  } catch {
    alert('保存失败')
  }
}

function confirmDelete(s: SpeciesItem) {
  deleteTarget.value = s
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  try {
    const res = await adminApi.deletePetSpecies(deleteTarget.value.id)
    if (res.data.success) {
      showDeleteConfirm.value = false
      deleteTarget.value = null
      await loadSpecies()
    }
  } catch {
    alert('删除失败')
  }
}

async function submitCreate() {
  if (!createForm.value.id || !createForm.value.name || !createForm.value.category) {
    alert('ID、名称、分类必填')
    return
  }
  try {
    const res = await adminApi.createPetSpecies(createForm.value)
    if (res.data.success) {
      showCreate.value = false
      createForm.value = {
        id: '', name: '', category: '', description: '', emoji: '',
        backgroundColor: '#e3f2fd', accentColor: '#42a5f5',
        stages: defaultStages(),
      }
      await loadSpecies()
    }
  } catch {
    alert('创建失败')
  }
}

onMounted(loadSpecies)
</script>

<style scoped>
.pet-species-page {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border-radius: 12px;
  padding: 8px 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.search-icon {
  font-size: 14px;
  opacity: 0.5;
}

.search-input {
  border: none;
  outline: none;
  font-size: 13px;
  color: #333;
  background: transparent;
  width: 160px;
}

.search-input::placeholder {
  color: #bbb;
}

.btn-primary {
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Stats Bar */
.stats-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border-radius: 20px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.chip-emoji {
  font-size: 14px;
}

.stats-hint {
  font-size: 12px;
  color: #999;
  margin: 0 0 0 auto;
}

/* Loading & Empty */
.loading-state {
  text-align: center;
  padding: 60px;
  color: #999;
  background: white;
  border-radius: 14px;
}

.empty-state {
  text-align: center;
  padding: 60px;
  background: white;
  border-radius: 14px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
  opacity: 0.4;
}

/* Species List */
.species-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.species-card {
  background: white;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.species-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.species-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.species-summary:hover {
  background: #fafafa;
}

.species-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.species-emoji {
  font-size: 32px;
  line-height: 1;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.species-rare-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 8px;
}

.species-info {
  flex: 1;
  min-width: 0;
}

.species-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 2px;
}

.species-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.meta-id {
  font-family: 'Courier New', monospace;
  background: rgba(0, 0, 0, 0.04);
  padding: 1px 6px;
  border-radius: 4px;
}

.species-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-preview {
  display: flex;
  gap: 4px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.species-actions {
  display: flex;
  gap: 6px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.08);
}

.btn-icon.danger:hover {
  background: rgba(220, 38, 38, 0.1);
}

/* Detail */
.species-detail {
  padding: 20px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #555;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-hint {
  font-size: 11px;
  color: #999;
  font-weight: 400;
  margin-left: auto;
}

.config-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.config-field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 6px;
}

.color-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-preview-lg {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

/* Stages Timeline */
.stages-timeline {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stage-card {
  display: flex;
  gap: 10px;
  background: white;
  border-radius: 12px;
  padding: 14px;
  flex: 1;
  min-width: 160px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.stage-step {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stage-body {
  flex: 1;
  min-width: 0;
}

.stage-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stage-key {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.stage-emoji-lg {
  font-size: 22px;
  line-height: 1;
}

.stage-inputs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stage-input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
  color: #333;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

.stage-input:focus {
  border-color: #42a5f5;
}

.emoji-picker-btn {
  width: 100%;
  padding: 6px;
  border-radius: 8px;
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
  font-size: 22px;
  line-height: 1;
}

.stage-emoji-btn {
  width: 100%;
  padding: 5px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: border-color 0.2s;
}

.stage-emoji-btn:hover {
  border-color: #42a5f5;
}

/* Emoji Picker */
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.emoji-option {
  font-size: 22px;
  padding: 5px;
  border-radius: 8px;
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

.image-upload-row {
  display: flex;
  gap: 6px;
  width: 100%;
}

.image-upload-row .stage-input {
  flex: 1;
}

.hidden-file-input {
  display: none;
}

.btn-upload {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s;
}

.btn-upload:hover {
  background: rgba(0, 0, 0, 0.08);
}

.stage-preview {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
  margin-top: 6px;
}

.detail-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.btn-save {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-save:hover {
  opacity: 0.9;
}

.btn-cancel {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Form Inputs */
.form-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: #333;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.12);
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 6px;
}

.form-group {
  flex: 1;
  min-width: 0;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin: 0 0 16px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}

.modal-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 16px;
}

.modal-text {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}

.btn-danger {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #ef5350, #c62828);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-danger:hover {
  opacity: 0.9;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
