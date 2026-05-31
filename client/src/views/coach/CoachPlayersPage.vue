<template>
  <div class="players-page">
    <!-- Top Bar: Title + Inline Form -->
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

    <!-- Player Grid -->
    <div class="players-grid">
      <div
        v-for="player in players"
        :key="player.id"
        class="player-card"
        :class="{ inactive: !player.isActive }"
      >
        <div class="card-main">
          <img
            v-if="isImageAvatar(player.avatar)"
            :src="player.avatar"
            class="card-avatar-img"
            alt="avatar"
          />
          <span v-else class="card-avatar">{{ player.avatar }}</span>
          <div class="card-info">
            <div class="card-name">{{ player.name }}</div>
            <div class="card-status" :class="player.isActive ? 'active' : 'stopped'">
              {{ player.isActive ? '活跃' : '已停用' }}
            </div>
          </div>
        </div>
        <div class="card-points">
          <div class="points-current">
            <span class="points-num">{{ player.currentPoints }}</span>
            <span class="points-label">当前积分</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="act-btn edit" @click="startEdit(player)">编辑</button>
          <button class="act-btn toggle" @click="toggleActive(player)">
            {{ player.isActive ? '停用' : '启用' }}
          </button>
          <button class="act-btn delete" @click="deletePlayerItem(player.id)">删除</button>
        </div>
      </div>
      <div v-if="players.length === 0" class="empty-state">
        <span class="empty-icon">👤</span>
        <p>暂无球员，请添加</p>
      </div>
    </div>

    <!-- Avatar Picker Modal (Teleport to body for z-index safety) -->
    <Teleport to="body">
      <div v-if="showPicker" class="modal-overlay" @click.self="showPicker = false">
        <div class="picker-card">
          <div class="picker-header">
            <span class="picker-title">选择头像</span>
            <button class="picker-close" @click="showPicker = false">✕</button>
          </div>
          <div class="picker-tabs">
            <button
              class="picker-tab"
              :class="{ active: pickerTab === 'emoji' }"
              @click="pickerTab = 'emoji'"
            >
              表情
            </button>
            <button
              class="picker-tab"
              :class="{ active: pickerTab === 'logo' }"
              @click="pickerTab = 'logo'"
            >
              队徽
            </button>
            <button
              class="picker-tab"
              :class="{ active: pickerTab === 'photo' }"
              @click="pickerTab = 'photo'"
            >
              照片
            </button>
          </div>
          <div class="picker-body">
            <!-- Emoji Tab -->
            <div v-if="pickerTab === 'emoji'" class="emoji-grid">
              <button
                v-for="emoji in emojiList"
                :key="emoji"
                class="emoji-option"
                :class="{ selected: playerForm.avatar === emoji }"
                @click="selectAvatar(emoji)"
              >
                {{ emoji }}
              </button>
            </div>

            <!-- Logo Tab -->
            <div v-if="pickerTab === 'logo'" class="logo-grid">
              <button
                v-for="logo in logoList"
                :key="logo.file"
                class="logo-option"
                :class="{ selected: playerForm.avatar === logo.url }"
                @click="selectAvatar(logo.url)"
                :title="logo.name"
              >
                <img :src="logo.url" :alt="logo.name" />
              </button>
            </div>

            <!-- Photo Tab -->
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
                  <img
                    :src="playerForm.avatar"
                    class="photo-preview-img"
                    alt="preview"
                    @error="onPhotoError"
                  />
                  <span class="photo-hint">点击或拖拽更换照片</span>
                </template>
                <template v-else>
                  <span class="photo-icon">📷</span>
                  <span class="photo-hint">点击或拖拽上传照片</span>
                  <span class="photo-sub">支持 JPG / PNG / GIF，最大 2MB</span>
                </template>
              </div>
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                class="hidden-input"
                @change="handleFileSelect"
              />
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { coachApi } from '@/api'

interface PlayerItem {
  id: string
  name: string
  avatar: string
  age: number | null
  currentPoints: number
  isActive: boolean
}

const players = ref<PlayerItem[]>([])
const editingPlayer = ref<PlayerItem | null>(null)
const playerForm = ref({ name: '', avatar: '😊', age: null as number | null })
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
  { file: 'AJ-Auxerre-v2006.svg', name: '欧塞尔', url: '/logos/AJ-Auxerre-v2006.svg' },
  { file: 'Angers-SCO-v2021.svg', name: '昂热', url: '/logos/Angers-SCO-v2021.svg' },
  { file: 'Argentina-National-Team-v2024.svg', name: '阿根廷', url: '/logos/Argentina-National-Team-v2024.svg' },
  { file: 'Arsenal-FC-v2002.svg', name: '阿森纳', url: '/logos/Arsenal-FC-v2002.svg' },
  { file: 'Atalanta-BC-v1993.svg', name: '亚特兰大', url: '/logos/Atalanta-BC-v1993.svg' },
  { file: 'Borussia-Dortmund-v1993.svg', name: '多特蒙德', url: '/logos/Borussia-Dortmund-v1993.svg' },
  { file: 'Brazil-National-Team-v2019.svg', name: '巴西', url: '/logos/Brazil-National-Team-v2019.svg' },
  { file: 'Chelsea-FC-v2006.svg', name: '切尔西', url: '/logos/Chelsea-FC-v2006.svg' },
  { file: 'England-National-Team-v2013.svg', name: '英格兰', url: '/logos/England-National-Team-v2013.svg' },
  { file: 'FC-Barcelona-v2002.svg', name: '巴塞罗那', url: '/logos/FC-Barcelona-v2002.svg' },
  { file: 'FC-Bayern-Munchen-v2024.svg', name: '拜仁慕尼黑', url: '/logos/FC-Bayern-Munchen-v2024.svg' },
  { file: 'FC-Kairat-Almaty-v2019.svg', name: '卡拉干达', url: '/logos/FC-Kairat-Almaty-v2019.svg' },
  { file: 'johor-dt-v0000.svg', name: '柔佛DT', url: '/logos/johor-dt-v0000.svg' },
  { file: 'Juventus-FC-v2017.svg', name: '尤文图斯', url: '/logos/Juventus-FC-v2017.svg' },
  { file: 'Le-Havre-AC-v2012.svg', name: '勒阿弗尔', url: '/logos/Le-Havre-AC-v2012.svg' },
  { file: 'Manchester-City-v2016.svg', name: '曼城', url: '/logos/Manchester-City-v2016.svg' },
  { file: 'Newcastle-United-Football-Club-v1988.svg', name: '纽卡斯尔', url: '/logos/Newcastle-United-Football-Club-v1988.svg' },
  { file: 'Paris-Saint-Germain-v2013.svg', name: '巴黎圣日耳曼', url: '/logos/Paris-Saint-Germain-v2013.svg' },
  { file: 'Portuguese-National-Team-v1966.svg', name: '葡萄牙', url: '/logos/Portuguese-National-Team-v1966.svg' },
  { file: 'Racing-Club-de-Lens-v2014.svg', name: '朗斯', url: '/logos/Racing-Club-de-Lens-v2014.svg' },
  { file: 'Real-Madrid-CF-v2002.svg', name: '皇家马德里', url: '/logos/Real-Madrid-CF-v2002.svg' },
  { file: 'shanghai-port-v2021.svg', name: '上海海港', url: '/logos/shanghai-port-v2021.svg' },
  { file: 'Sport-Lisboa-e-Benfica-v1999.svg', name: '本菲卡', url: '/logos/Sport-Lisboa-e-Benfica-v1999.svg' },
  { file: 'Stade-Brestois-29-v2010.svg', name: '布雷斯特', url: '/logos/Stade-Brestois-29-v2010.svg' },
  { file: 'Tottenham-Hotspur-Football-Club-v2024.svg', name: '托特纳姆热刺', url: '/logos/Tottenham-Hotspur-Football-Club-v2024.svg' },
]

onMounted(loadPlayers)

async function loadPlayers() {
  try {
    const res = await coachApi.getPlayers()
    players.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load players', e)
  }
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
    if (playerForm.value.avatar.includes('/logos/')) {
      pickerTab.value = 'logo'
    } else {
      pickerTab.value = 'photo'
    }
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
  if (file.size > 2 * 1024 * 1024) {
    alert('文件大小不能超过 2MB')
    return
  }
  const formData = new FormData()
  formData.append('avatar', file)
  try {
    const res = await coachApi.uploadAvatar(formData)
    if (res.data.success) {
      playerForm.value.avatar = res.data.data.url
      pickerTab.value = 'photo'
    }
  } catch (e: any) {
    alert(e.response?.data?.error || '上传失败')
  }
}

async function addPlayer() {
  if (!playerForm.value.name) return
  try {
    await coachApi.createPlayer({ ...playerForm.value })
    playerForm.value = { name: '', avatar: '😊', age: null }
    await loadPlayers()
  } catch (e: any) {
    alert(e.response?.data?.error || '添加失败')
  }
}

function startEdit(player: PlayerItem) {
  editingPlayer.value = player
  playerForm.value = { name: player.name, avatar: player.avatar, age: player.age }
}

function cancelEdit() {
  editingPlayer.value = null
  playerForm.value = { name: '', avatar: '😊', age: null }
}

async function saveEdit() {
  if (!editingPlayer.value) return
  try {
    await coachApi.updatePlayer(editingPlayer.value.id, { ...playerForm.value })
    editingPlayer.value = null
    playerForm.value = { name: '', avatar: '😊', age: null }
    await loadPlayers()
  } catch (e: any) {
    alert(e.response?.data?.error || '保存失败')
  }
}

async function toggleActive(player: PlayerItem) {
  try {
    await coachApi.updatePlayer(player.id, { isActive: !player.isActive })
    await loadPlayers()
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

async function deletePlayerItem(id: string) {
  if (!confirm('确认删除该球员？此操作不可撤销。')) return
  try {
    await coachApi.deletePlayer(id)
    await loadPlayers()
  } catch (e: any) {
    alert(e.response?.data?.error || '删除失败')
  }
}

</script>

<style scoped>
.players-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Top Bar */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
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
  background: rgba(0, 0, 0, 0.05);
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
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 8px 12px;
}

.inline-input {
  width: 120px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: #333;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.inline-input.short {
  width: 60px;
  text-align: center;
}

.inline-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.15);
}

.inline-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
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

.inline-avatar:hover {
  transform: scale(1.1);
}

.inline-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.inline-avatar-emoji {
  font-size: 20px;
  line-height: 1;
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
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-secondary {
  padding: 8px 16px;
  border-radius: 10px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: #666;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Players Grid */
.players-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

@media (max-width: 1200px) {
  .players-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 1024px) {
  .players-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .players-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 480px) {
  .players-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .top-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .top-right {
    justify-content: flex-end;
  }
}

.player-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s;
}

.player-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.player-card.inactive {
  opacity: 0.55;
}

.card-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-avatar {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.card-avatar-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-status {
  font-size: 11px;
  font-weight: 500;
  margin-top: 2px;
}

.card-status.active {
  color: #16a34a;
}

.card-status.stopped {
  color: #999;
}

.card-points {
  display: flex;
  gap: 6px;
}

.points-current {
  flex: 1;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  padding: 6px;
  text-align: center;
}

.points-num {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: #ff9800;
  font-family: var(--font-num);
  line-height: 1.2;
}

.points-label {
  font-size: 10px;
  color: #999;
}

.card-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.act-btn {
  padding: 4px 0;
  border-radius: 6px;
  border: none;
  font-size: 11px;
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

/* Avatar Picker Modal */
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
  max-width: 480px;
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

.picker-tabs {
  display: flex;
  gap: 6px;
}

.picker-tab {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: #666;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.picker-tab.active {
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
}

.picker-body {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
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

.logo-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.logo-option {
  padding: 8px;
  border-radius: 12px;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.15s;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-option:hover {
  background: rgba(0, 0, 0, 0.06);
}

.logo-option.selected {
  border-color: #42a5f5;
  background: rgba(66, 165, 245, 0.1);
}

.logo-option img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.photo-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.photo-drop {
  width: 100%;
  padding: 32px 20px;
  border-radius: 16px;
  border: 2px dashed rgba(0, 0, 0, 0.15);
  background: rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.photo-drop:hover,
.photo-drop.dragging {
  border-color: #42a5f5;
  background: rgba(66, 165, 245, 0.05);
}

.photo-icon {
  font-size: 36px;
}

.photo-hint {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.photo-sub {
  font-size: 12px;
  color: #999;
}

.hidden-input {
  display: none;
}

.photo-drop.has-preview {
  gap: 10px;
}

.photo-preview-img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 14px;
  border: 2px solid rgba(0, 0, 0, 0.08);
}

</style>
