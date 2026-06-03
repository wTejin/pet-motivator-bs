<template>
  <div class="players-page">
    <!-- ═══ 页面内容区（统一居中容器） ═══ -->
    <div class="page-container">
      <!-- Top Bar: Title + Inline Add Form -->
      <div class="top-bar">
        <div class="top-left">
          <h2 class="page-title">球员管理</h2>
          <span class="page-count">共 {{ players.length }} 人</span>
        </div>
        <div class="top-right">
          <div class="inline-form">
            <input
              v-model="playerForm.name"
              placeholder="姓名"
              class="inline-input"
              @keyup.enter="editingPlayer ? saveEdit() : addPlayer()"
            />
            <input
              v-model.number="playerForm.age"
              type="number"
              placeholder="年龄"
              class="inline-input short"
              @keyup.enter="editingPlayer ? saveEdit() : addPlayer()"
            />
            <select v-model="playerForm.gender" class="inline-select">
              <option value="">性别</option>
              <option value="male">♂️ 男</option>
              <option value="female">♀️ 女</option>
            </select>
            <span class="date-label-wrap">
              <span class="date-label">出生</span>
              <input
                v-model="playerForm.birthDate"
                type="date"
                class="inline-input date-input"
                title="出生日期"
              />
            </span>
            <input
              v-model.number="playerForm.fatherHeightCm"
              type="number"
              step="0.1"
              placeholder="父身高 cm"
              class="inline-input parent-h-input"
              title="父亲身高（Khamis-Roche 遗传预测用）"
            />
            <input
              v-model.number="playerForm.motherHeightCm"
              type="number"
              step="0.1"
              placeholder="母身高 cm"
              class="inline-input parent-h-input"
              title="母亲身高（Khamis-Roche 遗传预测用）"
            />
            <span class="date-label-wrap">
              <span class="date-label">训练始于</span>
              <input
                v-model="playerForm.trainingStartDate"
                type="date"
                class="inline-input date-input"
                title="开始系统训练的日期"
              />
            </span>
            <button class="inline-avatar" @click="openPicker">
              <img
                v-if="isImageAvatar(playerForm.avatar)"
                :src="playerForm.avatar"
                class="inline-avatar-img"
              />
              <span v-else class="inline-avatar-emoji">{{ playerForm.avatar }}</span>
            </button>
            <button class="btn-primary" @click="editingPlayer ? saveEdit() : addPlayer()">
              {{ editingPlayer ? '保存' : '添加' }}
            </button>
            <button
              v-if="editingPlayer"
              class="btn-secondary"
              @click="cancelEdit()"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      <!-- Player Cards Grid (Bio-Leap) -->
      <div v-if="loading" class="loading-state">
        <div v-for="n in 4" :key="n" class="skeleton-card"></div>
      </div>

      <div v-else class="players-grid">
      <div
        v-for="card in cards"
        :key="card.player.id"
        class="player-card-wrapper"
        :class="{ inactive: card.inactive }"
      >
        <!-- Bio-Leap 潜力卡主体 -->
        <BioLeapPlayerCard
          :player="card.player"
          :snapshot="card.snapshot"
          :age="card.age"
          :potentialIndex="card.potentialIndex"
          :potentialTier="card.potentialTier"
        />

        <!-- 管理操作栏 -->
        <div class="card-actions-bar">
          <div class="actions-left">
            <span class="points-badge">💎 {{ card.currentPoints }}</span>
          </div>
          <div class="actions-right">
            <button class="act-btn edit" @click="startEdit(card)">编辑</button>
            <button class="act-btn toggle" @click="toggleActive(card)">
              {{ card.inactive ? '启用' : '停用' }}
            </button>
            <button class="act-btn delete" @click="deletePlayerItem(card.player.id)">删除</button>
          </div>
        </div>
      </div>

      <div v-if="cards.length === 0 && !loading" class="empty-state">
        <span class="empty-icon">👤</span>
        <p>暂无球员，请添加</p>
      </div>
    </div>
    </div><!-- /page-container -->

    <!-- Avatar Picker Modal -->
    <Teleport to="body">
      <div v-if="showPicker" class="modal-overlay" @click.self="showPicker = false">
        <div class="picker-card">
          <div class="picker-header">
            <span class="picker-title">选择头像</span>
            <button class="picker-close" @click="showPicker = false">✕</button>
          </div>
          <div class="picker-tabs">
            <button class="picker-tab" :class="{ active: pickerTab === 'emoji' }" @click="pickerTab = 'emoji'">表情</button>
            <button class="picker-tab" :class="{ active: pickerTab === 'logo' }" @click="pickerTab = 'logo'">队徽</button>
            <button class="picker-tab" :class="{ active: pickerTab === 'photo' }" @click="pickerTab = 'photo'">照片</button>
          </div>
          <div class="picker-body">
            <div v-if="pickerTab === 'emoji'" class="emoji-grid">
              <button
                v-for="emoji in emojiList" :key="emoji"
                class="emoji-option" :class="{ selected: playerForm.avatar === emoji }"
                @click="selectAvatar(emoji)"
              >{{ emoji }}</button>
            </div>
            <div v-if="pickerTab === 'logo'" class="logo-grid">
              <button
                v-for="logo in logoList" :key="logo.file"
                class="logo-option" :class="{ selected: playerForm.avatar === logo.url }"
                @click="selectAvatar(logo.url)" :title="logo.name"
              ><img :src="logo.url" :alt="logo.name" /></button>
            </div>
            <div v-if="pickerTab === 'photo'" class="photo-tab">
              <div
                class="photo-drop"
                :class="{ dragging: isDragging, 'has-preview': isImageAvatar(playerForm.avatar) }"
                @dragenter.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @dragover.prevent
                @drop.prevent="handleDrop"
                @click="fileInput?.click()"
              >
                <template v-if="isImageAvatar(playerForm.avatar)">
                  <img :src="playerForm.avatar" class="photo-preview-img" alt="preview" @error="onPhotoError" />
                  <span class="photo-hint">点击或拖拽更换照片</span>
                </template>
                <template v-else>
                  <span class="photo-icon">📷</span>
                  <span class="photo-hint">点击或拖拽上传照片</span>
                  <span class="photo-sub">支持 JPG / PNG / GIF，最大 2MB</span>
                </template>
              </div>
              <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden-input" @change="handleFileSelect" />
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { coachApi, pipelineApi } from '@/api'
import { brokenImages, onImgError } from '@/composables/useBrokenImages'
import BioLeapPlayerCard from '@/components/BioLeapPlayerCard.vue'

interface PlayerRaw {
  id: string; name: string; avatar: string; age: number | null
  currentPoints: number; isActive: boolean
  birthDate?: string | null; trainingStartDate?: string | null; gender?: string | null
}

interface CardData {
  player: { id: string; name: string; avatar: string; birthDate: string | null; trainingStartDate?: string | null; gender?: string | null }
  snapshot: any | null
  age: number | null
  potentialIndex: number | null
  potentialTier: string | null
  currentPoints: number
  inactive: boolean
  raw: PlayerRaw
}

const players = ref<PlayerRaw[]>([])
const cards = ref<CardData[]>([])
const loading = ref(true)
const editingPlayer = ref<PlayerRaw | null>(null)
const playerForm = ref({ name: '', avatar: '😊', age: null as number | null, gender: '', birthDate: '', fatherHeightCm: null as number | null, motherHeightCm: null as number | null, trainingStartDate: '' })
const showPicker = ref(false)
const pickerTab = ref<'emoji' | 'logo' | 'photo'>('emoji')
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const emojiList = [
  '😊', '⚽', '🌟', '💪', '🔥', '🎯', '🏆', '😎', '🤩', '👑',
  '🦁', '🐯', '🦅', '🐺', '🐻', '🦊', '🐼', '🐨', '🐸', '🦄',
  '🐲', '🌈', '⚡', '❄️', '🌊', '🔮', '🎖️', '🎗️', '🏅', '🥇',
  '💎', '👊', '🚀', '🌙', '☀️', '🍀', '🎸', '🎹', '🎨', '📚',
]

const logoList = [
  { file: 'AFC-Ajax-v2025.svg', name: '阿贾克斯', url: '/logos/AFC-Ajax-v2025.svg' },
  { file: 'Arsenal-FC-v2002.svg', name: '阿森纳', url: '/logos/Arsenal-FC-v2002.svg' },
  { file: 'Atalanta-BC-v1993.svg', name: '亚特兰大', url: '/logos/Atalanta-BC-v1993.svg' },
  { file: 'Borussia-Dortmund-v1993.svg', name: '多特蒙德', url: '/logos/Borussia-Dortmund-v1993.svg' },
  { file: 'Brazil-National-Team-v2019.svg', name: '巴西', url: '/logos/Brazil-National-Team-v2019.svg' },
  { file: 'Chelsea-FC-v2006.svg', name: '切尔西', url: '/logos/Chelsea-FC-v2006.svg' },
  { file: 'England-National-Team-v2013.svg', name: '英格兰', url: '/logos/England-National-Team-v2013.svg' },
  { file: 'FC-Barcelona-v2002.svg', name: '巴塞罗那', url: '/logos/FC-Barcelona-v2002.svg' },
  { file: 'FC-Bayern-Munchen-v2024.svg', name: '拜仁慕尼黑', url: '/logos/FC-Bayern-Munchen-v2024.svg' },
  { file: 'Juventus-FC-v2017.svg', name: '尤文图斯', url: '/logos/Juventus-FC-v2017.svg' },
  { file: 'Manchester-City-v2016.svg', name: '曼城', url: '/logos/Manchester-City-v2016.svg' },
  { file: 'Paris-Saint-Germain-v2013.svg', name: '巴黎圣日耳曼', url: '/logos/Paris-Saint-Germain-v2013.svg' },
  { file: 'Portuguese-National-Team-v1966.svg', name: '葡萄牙', url: '/logos/Portuguese-National-Team-v1966.svg' },
  { file: 'Real-Madrid-CF-v2002.svg', name: '皇家马德里', url: '/logos/Real-Madrid-CF-v2002.svg' },
  { file: 'shanghai-port-v2021.svg', name: '上海海港', url: '/logos/shanghai-port-v2021.svg' },
  { file: 'Tottenham-Hotspur-Football-Club-v2024.svg', name: '热刺', url: '/logos/Tottenham-Hotspur-Football-Club-v2024.svg' },
]

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const res = await coachApi.getPlayers()
    players.value = res.data.data || []
    // 异步加载 pipeline 快照
    await loadSnapshots()
  } catch (e) {
    console.error('Failed to load players', e)
  } finally {
    loading.value = false
  }
}

async function loadSnapshots() {
  const cardPromises = players.value.map(async (p) => {
    try {
      const [snapRes, detailRes] = await Promise.allSettled([
        pipelineApi.latest(p.id),
        coachApi.getPlayerDetail(p.id),
      ])

      const snapshot = snapRes.status === 'fulfilled' ? snapRes.value?.data?.data : null
      const detail = detailRes.status === 'fulfilled' ? (detailRes.value as any)?.data?.data : null

      const birthDate = detail?.player?.birthDate || p.birthDate || null
      const trainingStartDate = detail?.player?.trainingStartDate || p.trainingStartDate || null
      const gender = detail?.player?.gender || p.gender || null

      let age: number | null = null
      if (birthDate) {
        const birth = new Date(birthDate)
        age = Math.round(((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000)) * 10) / 10
      } else if (p.age != null) {
        age = p.age
      }

      return {
        player: { id: p.id, name: p.name, avatar: p.avatar || '😊', birthDate, trainingStartDate, gender },
        snapshot,
        age,
        potentialIndex: snapshot?.potentialIndex ?? null,
        potentialTier: snapshot?.potentialTier ?? null,
        currentPoints: p.currentPoints,
        inactive: !p.isActive,
        raw: p,
      } as CardData
    } catch {
      return {
        player: { id: p.id, name: p.name, avatar: p.avatar || '😊', birthDate: null, gender: null },
        snapshot: null, age: null, potentialIndex: null, potentialTier: null,
        currentPoints: p.currentPoints, inactive: !p.isActive, raw: p,
      } as CardData
    }
  })

  cards.value = await Promise.all(cardPromises)
  cards.value.sort((a, b) => (b.snapshot?.overall ?? -1) - (a.snapshot?.overall ?? -1))
}

function isImageAvatar(avatar: string): boolean {
  return avatar.startsWith('/')
}

function onPhotoError() {
  console.warn('头像预览加载失败:', playerForm.value.avatar)
}

function openPicker() {
  showPicker.value = true
  if (isImageAvatar(playerForm.value.avatar)) {
    pickerTab.value = playerForm.value.avatar.includes('/logos/') ? 'logo' : 'photo'
  } else {
    pickerTab.value = 'emoji'
  }
}

function selectAvatar(value: string) {
  playerForm.value.avatar = value
  showPicker.value = false
}

async function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) await uploadFile(file)
  if (target) target.value = ''
}

async function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) await uploadFile(file)
}

async function uploadFile(file: File) {
  if (file.size > 2 * 1024 * 1024) { alert('文件大小不能超过 2MB'); return }
  const formData = new FormData()
  formData.append('avatar', file)
  try {
    const res = await coachApi.uploadAvatar(formData)
    if (res.data.success) { playerForm.value.avatar = res.data.data.url; pickerTab.value = 'photo' }
  } catch (e: any) { alert(e.response?.data?.error || '上传失败') }
}

async function addPlayer() {
  if (!playerForm.value.name) return
  try {
    const payload: Record<string, unknown> = { name: playerForm.value.name, avatar: playerForm.value.avatar, age: playerForm.value.age }
    if (playerForm.value.gender) payload.gender = playerForm.value.gender
    if (playerForm.value.birthDate) payload.birthDate = new Date(playerForm.value.birthDate).toISOString()
    if (playerForm.value.fatherHeightCm != null) payload.fatherHeightCm = playerForm.value.fatherHeightCm
    if (playerForm.value.motherHeightCm != null) payload.motherHeightCm = playerForm.value.motherHeightCm
    if (playerForm.value.trainingStartDate) payload.trainingStartDate = playerForm.value.trainingStartDate
    await coachApi.createPlayer(payload)
    playerForm.value = { name: '', avatar: '😊', age: null, gender: '', birthDate: '', fatherHeightCm: null, motherHeightCm: null, trainingStartDate: '' }
    await loadAll()
  } catch (e: any) { alert(e.response?.data?.error || '添加失败') }
}

function startEdit(card: CardData) {
  const p = card.raw
  editingPlayer.value = p
  const bd = card.player.birthDate
  playerForm.value = {
    name: p.name, avatar: p.avatar, age: p.age,
    gender: p.gender || '',
    birthDate: bd ? new Date(bd).toISOString().slice(0, 10) : '',
    fatherHeightCm: p.fatherHeightCm ?? null,
    motherHeightCm: p.motherHeightCm ?? null,
    trainingStartDate: p.trainingStartDate || '',
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit() {
  editingPlayer.value = null
  playerForm.value = { name: '', avatar: '😊', age: null, gender: '', birthDate: '', fatherHeightCm: null, motherHeightCm: null, trainingStartDate: '' }
}

async function saveEdit() {
  if (!editingPlayer.value) return
  try {
    const payload: Record<string, unknown> = { name: playerForm.value.name, avatar: playerForm.value.avatar, age: playerForm.value.age }
    if (playerForm.value.gender) payload.gender = playerForm.value.gender
    if (playerForm.value.birthDate) payload.birthDate = new Date(playerForm.value.birthDate).toISOString()
    if (playerForm.value.fatherHeightCm != null) payload.fatherHeightCm = playerForm.value.fatherHeightCm
    if (playerForm.value.motherHeightCm != null) payload.motherHeightCm = playerForm.value.motherHeightCm
    if (playerForm.value.trainingStartDate) payload.trainingStartDate = playerForm.value.trainingStartDate
    await coachApi.updatePlayer(editingPlayer.value.id, payload)
    editingPlayer.value = null
    playerForm.value = { name: '', avatar: '😊', age: null, gender: '', birthDate: '', fatherHeightCm: null, motherHeightCm: null, trainingStartDate: '' }
    await loadAll()
  } catch (e: any) { alert(e.response?.data?.error || '保存失败') }
}

async function toggleActive(card: CardData) {
  try {
    await coachApi.updatePlayer(card.player.id, { isActive: card.inactive })
    await loadAll()
  } catch (e: any) { alert(e.response?.data?.error || '操作失败') }
}

async function deletePlayerItem(id: string) {
  if (!confirm('确认删除该球员？此操作不可撤销。')) return
  try {
    await coachApi.deletePlayer(id)
    await loadAll()
  } catch (e: any) { alert(e.response?.data?.error || '删除失败') }
}
</script>

<style scoped>
/* ════════════════════════════════════
   页面根层 — 全宽背景
   ════════════════════════════════════ */
.players-page {
  display: flex;
  flex-direction: column;
}

/* ════════════════════════════════════
   统一居中容器（与卡片网格对齐）
   四端：手机全宽 / 平板 720 / 桌面 1100 / 智慧屏 1600
   ════════════════════════════════════ */
.page-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 4px;
}

/* ── Top Bar ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  padding: 12px 16px;
}
.top-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-title {
  font-size: 18px;
  font-weight: 800;
  color: #333;
  font-family: var(--font-display);
  margin: 0;
}
.page-count {
  font-size: 13px;
  color: #999;
  background: rgba(0,0,0,0.05);
  padding: 4px 12px;
  border-radius: 20px;
}
.top-right {
  display: flex;
  align-items: center;
}
.inline-form {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.06);
  padding: 8px 12px;
}
.inline-input {
  width: 120px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.1);
  background: white;
  color: #333;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.inline-input.short { width: 60px; text-align: center; }
.inline-input.date-input { width: 130px; font-size: 13px; }
.inline-input.parent-h-input { width: 82px; text-align: center; font-size: 13px; }

/* Date label wrappers */
.date-label-wrap { display: inline-flex; align-items: center; gap: 2px; }
.date-label { font-size: 11px; color: #888; white-space: nowrap; }
.inline-select {
  padding: 8px 8px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.1);
  background: white;
  color: #333;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.inline-select:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66,165,245,0.15);
}
.inline-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66,165,245,0.15);
}
.inline-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.1);
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 0.2s;
}
.inline-avatar:hover { transform: scale(1.1); }
.inline-avatar-img { width: 100%; height: 100%; object-fit: contain; }
.inline-avatar-emoji { font-size: 20px; line-height: 1; }
.btn-primary {
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary {
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  background: rgba(0,0,0,0.06);
  color: #666;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-secondary:hover { background: rgba(0,0,0,0.1); }

/* ── Loading ── */
.loading-state {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.skeleton-card {
  height: 360px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.03));
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ── Players Grid ── */
.players-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
}

/* ── Card Wrapper ── */
.player-card-wrapper {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  width: 100%;
  max-width: 540px;
  justify-self: center;
}
.player-card-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
}
.player-card-wrapper.inactive {
  opacity: 0.55;
}
.player-card-wrapper.inactive:hover {
  opacity: 0.75;
}

/* ── Action Bar ── */
.card-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0,0,0,0.06);
  border-top: none;
  border-radius: 0 0 16px 16px;
  gap: 8px;
  flex-wrap: wrap;
}
.actions-left { display: flex; align-items: center; }
.points-badge {
  font-size: 14px;
  font-weight: 700;
  color: #f57c00;
  font-family: var(--font-num);
}
.actions-right { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.act-btn {
  padding: 5px 10px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
}
.act-btn.detail { background: rgba(66,165,245,0.1); color: #1e88e5; }
.act-btn.detail:hover { background: rgba(66,165,245,0.2); }
.act-btn.assess { background: rgba(16,185,129,0.1); color: #10b981; }
.act-btn.assess:hover { background: rgba(16,185,129,0.2); }
.act-btn.edit { background: rgba(139,92,246,0.1); color: #7c3aed; }
.act-btn.edit:hover { background: rgba(139,92,246,0.2); }
.act-btn.toggle { background: rgba(245,158,11,0.1); color: #d97706; }
.act-btn.toggle:hover { background: rgba(245,158,11,0.2); }
.act-btn.delete { background: rgba(239,68,68,0.1); color: #dc2626; }
.act-btn.delete:hover { background: rgba(239,68,68,0.2); }

/* ── Empty State ── */
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
.empty-icon { font-size: 40px; opacity: 0.5; }

/* ── Avatar Picker Modal ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
  padding: 16px;
}
.picker-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.2);
  box-sizing: border-box;
  display: flex; flex-direction: column; gap: 14px;
}
.picker-header { display: flex; align-items: center; justify-content: space-between; }
.picker-title { font-size: 16px; font-weight: 700; color: #333; }
.picker-close {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; background: rgba(0,0,0,0.06); color: #666;
  font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
}
.picker-close:hover { background: rgba(0,0,0,0.1); }
.picker-tabs { display: flex; gap: 6px; }
.picker-tab {
  flex: 1; padding: 8px; border-radius: 10px; border: none;
  background: rgba(0,0,0,0.04); color: #666;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.picker-tab.active { background: linear-gradient(135deg, #42a5f5, #1e88e5); color: white; }
.picker-body { max-height: 320px; overflow-y: auto; padding-right: 4px; }
.emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
.emoji-option {
  font-size: 24px; padding: 6px; border-radius: 10px;
  border: 2px solid transparent; background: rgba(0,0,0,0.03);
  cursor: pointer; transition: all 0.15s; line-height: 1;
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
}
.emoji-option:hover { background: rgba(0,0,0,0.06); }
.emoji-option.selected { border-color: #42a5f5; background: rgba(66,165,245,0.1); }
.logo-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.logo-option {
  padding: 8px; border-radius: 12px; border: 2px solid transparent;
  background: rgba(0,0,0,0.03); cursor: pointer; transition: all 0.15s;
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
}
.logo-option:hover { background: rgba(0,0,0,0.06); }
.logo-option.selected { border-color: #42a5f5; background: rgba(66,165,245,0.1); }
.logo-option img { width: 100%; height: 100%; object-fit: contain; }
.photo-tab { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.photo-drop {
  width: 100%; padding: 32px 20px; border-radius: 16px;
  border: 2px dashed rgba(0,0,0,0.15); background: rgba(0,0,0,0.02);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: pointer; transition: all 0.2s;
}
.photo-drop:hover, .photo-drop.dragging { border-color: #42a5f5; background: rgba(66,165,245,0.05); }
.photo-icon { font-size: 36px; }
.photo-hint { font-size: 14px; font-weight: 600; color: #333; }
.photo-sub { font-size: 12px; color: #999; }
.hidden-input { display: none; }
.photo-drop.has-preview { gap: 10px; }
.photo-preview-img {
  width: 120px; height: 120px; object-fit: cover;
  border-radius: 14px; border: 2px solid rgba(0,0,0,0.08);
}

/*
 * ════════════════════════════════════════════════════════
 *  响应式断点
 *  📱 手机 ≤768px     → 单列 + 顶栏竖排
 *  📱➜💻 平板 769-1024 → 2列 + 紧凑间距
 *  💻 桌面 1025-1400  → 2列 + 标准间距（默认）
 *  🖥️ 智慧屏 ≥1401    → 3列 + 放大字号
 * ════════════════════════════════════════════════════════
 */

/* ── 平板 (≤1024px) ── */
@media (max-width: 1024px) {
  .page-container {
    max-width: 720px;
  }
  .loading-state {
    grid-template-columns: 1fr;
  }
  .skeleton-card {
    height: 320px;
  }
  .players-grid {
    gap: 12px;
  }
}

/* ── 手机 (≤768px) ── */
@media (max-width: 768px) {
  .page-container {
    max-width: 100%;
    padding: 0 2px;
    gap: 10px;
  }
  .top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    border-radius: 12px;
    padding: 10px 12px;
  }
  .top-left {
    justify-content: space-between;
  }
  .top-right {
    width: 100%;
  }
  .inline-form {
    width: 100%;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px;
  }
  .inline-input {
    width: 100%;
    flex: 1 1 100%;
    min-width: 0;
  }
  .inline-input.short {
    width: 80px;
    flex: 0 0 auto;
  }
  .inline-input.date-input {
    width: auto;
    flex: 1 1 auto;
    min-width: 100px;
  }

  .players-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .player-card-wrapper {
    max-width: 100%;
  }

  .card-actions-bar {
    padding: 8px 10px;
    gap: 6px;
  }
  .actions-right { gap: 3px; }
  .act-btn {
    padding: 4px 7px;
    font-size: 10px;
  }
  .points-badge { font-size: 13px; }

  .page-title { font-size: 16px; }

  .picker-card { padding: 14px; border-radius: 16px; }
  .emoji-grid { grid-template-columns: repeat(6, 1fr); }
  .logo-grid { grid-template-columns: repeat(4, 1fr); }
  .photo-drop { padding: 20px 12px; }
  .photo-preview-img { width: 80px; height: 80px; }
}

/* ── 桌面 (1025-1400px) 默认值，无需覆盖 ── */

/* ── 智慧大屏 (≥1401px)  教室触屏 / 投影 ── */
@media (min-width: 1401px) {
  .page-container {
    max-width: 1600px;
    gap: 20px;
  }

  /* 3 列布局 */
  .players-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .loading-state {
    grid-template-columns: repeat(3, 1fr);
  }
  .skeleton-card {
    height: 400px;
  }
  .player-card-wrapper {
    max-width: 520px;
  }

  /* 大字：教室后排也能看清 */
  .top-bar {
    padding: 16px 24px;
    border-radius: 20px;
  }
  .page-title {
    font-size: 24px;
  }
  .page-count {
    font-size: 15px;
  }
  .inline-input {
    font-size: 16px;
    padding: 10px 14px;
  }
  .inline-select {
    font-size: 15px;
  }
  .btn-primary, .btn-secondary {
    font-size: 15px;
    padding: 10px 20px;
  }

  /* 卡片操作区字号 */
  .points-badge {
    font-size: 16px;
  }
  .act-btn {
    font-size: 14px;
    padding: 6px 14px;
  }
}
</style>
