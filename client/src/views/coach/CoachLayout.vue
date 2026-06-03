<template>
  <div class="coach-layout">
    <!-- Top Nav Bar -->
    <nav class="coach-nav">
      <div class="nav-inner">
        <div class="nav-brand">
          <span class="nav-logo">⚽</span>
          <h1 class="nav-title">星宠契约 · 教练端</h1>
        </div>
        <!-- Team Name / Logo -->
        <div class="nav-team" @click="openTeamEdit">
          <img
            v-if="isImageAvatar(teamLogo) && !brokenImages.has(teamLogo)"
            :src="teamLogo"
            class="nav-team-logo-img"
            alt="team logo"
            @error="onImgError(teamLogo)"
          />
          <span v-else class="nav-team-logo">{{ teamLogo || '⚽' }}</span>
          <span class="nav-team-name">{{ teamName || '我的球队' }}</span>
          <span class="nav-team-edit">✎</span>
        </div>
        <div class="nav-links">
          <router-link
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="nav-link"
            :class="{ active: $route.path === link.to || $route.path.startsWith(link.to + '/') }"
          >
            <span class="link-icon">{{ link.icon }}</span>
            <span class="link-label">{{ link.label }}</span>
          </router-link>
        </div>
        <div class="nav-actions">
          <button
            class="mode-toggle"
            :class="auth.playerMode === 'open' ? 'mode-open' : 'mode-display'"
            @click="togglePlayerMode"
            :title="auth.playerMode === 'open' ? '点击切换为仅展示' : '点击切换为允许操作'"
          >
            <span class="mode-icon">{{ auth.playerMode === 'open' ? '🔓' : '🔒' }}</span>
            <span class="mode-label">{{ auth.playerMode === 'open' ? '允许操作' : '仅展示' }}</span>
          </button>
          <span class="nav-name hidden sm:inline">{{ auth.user?.name }}</span>
          <button class="nav-logout" @click="auth.logout()">退出</button>
        </div>
      </div>
    </nav>

    <!-- Child page renders here -->
    <div class="coach-content">
      <router-view />
    </div>

    <!-- Bottom: Back to Screen -->
    <div class="coach-footer">
      <router-link to="/screen" class="footer-link">
        📺 返回球员大屏幕
      </router-link>
    </div>
  </div>

  <!-- Team Edit Modal -->
  <Teleport to="body">
    <div v-if="showTeamEdit" class="modal-overlay" @click.self="showTeamEdit = false">
      <div class="team-edit-card">
        <div class="team-edit-header">
          <span class="team-edit-title">编辑球队信息</span>
          <button class="team-edit-close" @click="showTeamEdit = false">✕</button>
        </div>
        <div class="team-edit-body">
          <label class="edit-label">
            球队名称
            <input v-model="editForm.teamName" type="text" class="edit-input" placeholder="请输入球队名称" />
          </label>
          <div class="edit-label">
            球队队徽
            <div
              class="logo-upload"
              :class="{ dragging: isDragging }"
              @dragenter.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @dragover.prevent
              @drop.prevent="handleDrop"
              @click="fileInput?.click()"
            >
              <template v-if="editForm.teamLogo && isImageAvatar(editForm.teamLogo) && !brokenImages.has(editForm.teamLogo)">
                <img :src="editForm.teamLogo" class="logo-preview" alt="preview" @error="onImgError(editForm.teamLogo)" />
                <span class="logo-hint">点击或拖拽更换队徽</span>
              </template>
              <template v-else>
                <span class="logo-icon">🏷️</span>
                <span class="logo-hint">点击或拖拽上传队徽</span>
                <span class="logo-sub">支持 JPG / PNG / GIF / WebP，最大 2MB</span>
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
        <div class="team-edit-actions">
          <button class="btn-secondary" @click="showTeamEdit = false">取消</button>
          <button class="btn-primary" @click="saveTeam">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { brokenImages, onImgError } from '@/composables/useBrokenImages'
import { useAuthStore } from '@/stores/auth'
import { coachApi } from '@/api'
import '@/styles/coach-theme.css'

const auth = useAuthStore()

const navLinks = [
  { to: '/coach/score', icon: '📝', label: '快速记分' },
  { to: '/coach/players', icon: '👥', label: '球员管理' },
]

const showTeamEdit = ref(false)
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const teamName = computed(() => (auth.user?.teamName as string) || '')
const teamLogo = computed(() => (auth.user?.teamLogo as string) || '')

const editForm = ref({
  teamName: '',
  teamLogo: '',
})

function openTeamEdit() {
  editForm.value = {
    teamName: teamName.value,
    teamLogo: teamLogo.value,
  }
  showTeamEdit.value = true
}

function isImageAvatar(avatar: string): boolean {
  return avatar?.startsWith('/') ?? false
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
      editForm.value.teamLogo = res.data.data.url
    }
  } catch (e: any) {
    alert(e.response?.data?.error || '上传失败')
  }
}

async function saveTeam() {
  try {
    await coachApi.updateProfile({
      teamName: editForm.value.teamName,
      teamLogo: editForm.value.teamLogo,
    })
    await auth.refreshUser()
    showTeamEdit.value = false
  } catch (e: any) {
    alert(e.response?.data?.error || '保存失败')
  }
}

async function togglePlayerMode() {
  const newMode = auth.playerMode === 'open' ? 'display' : 'open'
  try {
    await auth.setMode(newMode)
  } catch (e: any) {
    alert(e.response?.data?.error || '切换失败')
  }
}
</script>

<style scoped>
.coach-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
  display: flex;
  flex-direction: column;
}

.coach-nav {
  position: sticky;
  top: 0;
  z-index: 30;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

/* ── Nav 内容居中容器（与页面内容区对齐） ── */
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 12px 0;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-logo {
  font-size: 24px;
  font-family: var(--font-display);
}

.nav-title {
  font-size: 18px;
  font-weight: 800;
  color: #1a1a2e;
  font-family: var(--font-display);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: #555;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.9);
}

.nav-link.active {
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 10px rgba(66, 165, 245, 0.25);
}

.link-icon {
  font-size: 16px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-name {
  font-size: 14px;
  color: #666;
}

.nav-logout {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-logout:hover {
  background: rgba(239, 68, 68, 0.2);
}

.coach-content {
  flex: 1;
  padding: 16px 20px 24px;
  min-height: 0;
}

/*
 * ════════════════════════════════════════════════════════
 *  响应式断点
 *  📱 手机 ≤640px     → 导航折叠 + 紧凑间距
 *  📱➜💻 平板 641-1024 → 标准导航
 *  💻 桌面 1025-1400  → 宽松间距（默认）
 *  🖥️ 智慧屏 ≥1401    → 大字号 + 宽间距
 * ════════════════════════════════════════════════════════
 */

/* ── 手机 (≤640px) ── */
@media (max-width: 640px) {
  .coach-nav {
    padding: 0 12px;
  }
  .nav-inner {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 0;
  }
  .nav-title {
    font-size: 15px;
  }
  .nav-links {
    order: 3;
    width: 100%;
    justify-content: center;
  }
  .coach-content {
    padding: 12px 12px 20px;
  }
}

/* ── 智慧大屏 (≥1401px)  教室触屏 / 投影 ── */
@media (min-width: 1401px) {
  .coach-nav {
    padding: 0 32px;
  }
  .nav-inner {
    max-width: 1600px;
    padding: 16px 0;
  }
  .nav-logo {
    font-size: 32px;
  }
  .nav-title {
    font-size: 24px;
  }
  .nav-link {
    font-size: 16px;
    padding: 10px 20px;
    border-radius: 12px;
  }
  .link-icon {
    font-size: 20px;
  }
  .nav-name {
    font-size: 16px;
  }
  .nav-logout {
    font-size: 15px;
    padding: 8px 18px;
  }
  .nav-team-name {
    font-size: 16px;
  }
  .nav-team-logo {
    font-size: 24px;
  }
  .nav-team-logo-img {
    width: 32px;
    height: 32px;
  }
  .mode-toggle {
    font-size: 14px;
    padding: 8px 16px;
  }
  .mode-icon {
    font-size: 16px;
  }

  .coach-content {
    padding: 24px 32px 32px;
  }

  .coach-footer {
    padding: 16px 32px;
  }
  .footer-link {
    font-size: 16px;
    padding: 10px 24px;
  }
}

/* Team area in nav */
.nav-team {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.nav-team:hover {
  background: rgba(255, 255, 255, 0.9);
}
.nav-team-logo {
  font-size: 20px;
  line-height: 1;
}
.nav-team-logo-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 50%;
}
.nav-team-name {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  white-space: nowrap;
}
.nav-team-edit {
  font-size: 12px;
  color: #999;
  opacity: 0;
  transition: opacity 0.2s;
}
.nav-team:hover .nav-team-edit {
  opacity: 1;
}

/* Footer */
.coach-footer {
  padding: 12px 20px;
  text-align: center;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s;
}
.footer-link:hover {
  opacity: 0.9;
}

/* Modal */
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
.team-edit-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.team-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.team-edit-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}
.team-edit-close {
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
.team-edit-close:hover {
  background: rgba(0, 0, 0, 0.1);
}
.team-edit-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.edit-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}
.edit-input {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: #333;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.edit-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.15);
}
.logo-upload {
  width: 100%;
  padding: 28px 20px;
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
.logo-upload:hover,
.logo-upload.dragging {
  border-color: #42a5f5;
  background: rgba(66, 165, 245, 0.05);
}
.logo-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 14px;
  border: 2px solid rgba(0, 0, 0, 0.08);
}
.logo-icon {
  font-size: 32px;
}
.logo-hint {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.logo-sub {
  font-size: 12px;
  color: #999;
}
.hidden-input {
  display: none;
}
.team-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
}

/* Mode toggle */
.mode-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.mode-toggle.mode-open {
  background: rgba(76, 175, 80, 0.12);
  color: #2e7d32;
}
.mode-toggle.mode-open:hover {
  background: rgba(76, 175, 80, 0.2);
}
.mode-toggle.mode-display {
  background: rgba(239, 68, 68, 0.1);
  color: #c62828;
}
.mode-toggle.mode-display:hover {
  background: rgba(239, 68, 68, 0.18);
}
.mode-icon {
  font-size: 14px;
}
.mode-label {
  display: none;
}
@media (min-width: 640px) {
  .mode-label {
    display: inline;
  }
}
</style>
