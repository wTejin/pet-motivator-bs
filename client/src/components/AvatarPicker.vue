<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="picker-card">
        <div class="picker-header">
          <span class="picker-title">选择头像</span>
          <button class="picker-close" @click="$emit('close')">✕</button>
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
              :class="{ selected: modelValue === emoji }"
              @click="select(emoji)"
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
              :class="{ selected: modelValue === logo.url }"
              @click="select(logo.url)"
              :title="logo.name"
            >
              <img :src="logo.url" :alt="logo.name" />
            </button>
          </div>

          <!-- Photo Tab -->
          <div v-if="pickerTab === 'photo'" class="photo-tab">
            <div
              class="photo-drop"
              :class="{ dragging: isDragging, 'has-preview': isImageAvatar(modelValue) }"
              @dragenter.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @dragover.prevent
              @drop.prevent="handleDrop"
              @click="fileInput?.click()"
            >
              <template v-if="isImageAvatar(modelValue)">
                <img
                  :src="modelValue"
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  modelValue: string
  uploadFn?: (file: File) => Promise<string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  close: []
}>()

const pickerTab = ref<'emoji' | 'logo' | 'photo'>('emoji')
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Auto-detect active tab based on current avatar
watch(() => props.visible, (show) => {
  if (!show) return
  if (isImageAvatar(props.modelValue)) {
    if (props.modelValue.includes('/logos/')) {
      pickerTab.value = 'logo'
    } else {
      pickerTab.value = 'photo'
    }
  } else {
    pickerTab.value = 'emoji'
  }
})

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

function isImageAvatar(avatar: string): boolean {
  return avatar.startsWith('/')
}

function onPhotoError() {
  console.warn('头像预览加载失败')
}

function select(value: string) {
  emit('update:modelValue', value)
  emit('close')
}

async function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) await upload(file)
  if (target) target.value = ''
}

async function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) await upload(file)
}

async function upload(file: File) {
  if (!props.uploadFn) return
  if (file.size > 2 * 1024 * 1024) {
    alert('文件大小不能超过 2MB')
    return
  }
  try {
    const url = await props.uploadFn(file)
    emit('update:modelValue', url)
    emit('close')
  } catch {
    alert('上传失败，请重试')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
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
