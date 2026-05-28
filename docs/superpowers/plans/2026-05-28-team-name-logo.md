# 球队名称与队徽管理实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让教练可以设置球队名称和上传队徽，显示在教练端顶部导航栏和大屏幕上，并在教练端每个页面底部提供返回大屏幕的快捷入口。

**Architecture:** 在 Coach 表新增 `teamName`/`teamLogo` 字段，新增 `/coach/me` 和 `/public/coach/:phone` API。CoachLayout 负责顶部球队区域展示与编辑弹窗，以及底部返回按钮。TeamScreenPage 通过公共 API 读取真实球队信息渲染到 TeamHeader。

**Tech Stack:** Vue 3 + Vite + Pinia (frontend), Express + Prisma + PostgreSQL (backend), Multer for upload.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `server/prisma/schema.prisma` | Coach model 新增 teamName/teamLogo |
| `server/src/routes/coach.ts` | 新增 GET/PUT `/coach/me`, login 返回新字段 |
| `server/src/routes/player.ts` | 新增 GET `/public/coach/:phone` |
| `client/src/api/index.ts` | 新增 coachApi.getProfile / updateProfile, publicApi.getCoach |
| `client/src/stores/auth.ts` | 新增 refreshUser() |
| `client/src/views/coach/CoachLayout.vue` | 顶部球队区域 + 编辑弹窗 + 底部返回按钮 |
| `client/src/views/team/TeamScreenPage.vue` | 调用公共 API 获取球队信息 |
| `client/src/components/team/TeamHeader.vue` | 支持图片 logo（URL）渲染 |

---

### Task 1: Prisma Schema 与 Migration

**Files:**
- Modify: `server/prisma/schema.prisma:27-28`

- [ ] **Step 1: 新增字段**

在 `Coach` 模型 `playerMode` 字段下方新增：

```prisma
  teamName        String   @default("")
  teamLogo        String   @default("")
```

修改后该模型片段应如下：

```prisma
model Coach {
  id              String @id @default(uuid())
  phone           String @unique
  passwordHash    String
  name            String
  school          String @default("")
  isActive        Boolean @default(true)
  trialUntil      BigInt
  authorizedUntil BigInt
  playerMode      String @default("display")
  teamName        String @default("")
  teamLogo        String @default("")
  createdAt       BigInt
  updatedAt       BigInt

  players          Player[]
  scoreRecords     ScoreRecord[]
  scoreDimensions  ScoreDimension[]
  bonusRules       BonusRule[]
  shopItems        ShopItem[]
  customIndicators CustomIndicator[]
}
```

- [ ] **Step 2: 执行迁移**

Run:
```bash
cd server
npx prisma migrate dev --name add_team_name_logo
npx prisma generate
```

Expected: Migration created successfully, Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/
git commit -m "feat(db): add teamName and teamLogo to Coach model"
```

---

### Task 2: 后端 API

**Files:**
- Modify: `server/src/routes/coach.ts:152-157`
- Modify: `server/src/routes/coach.ts:160`（在 password 路由之后插入）
- Modify: `server/src/routes/player.ts`（在 public 路由区域插入）

- [ ] **Step 1: 修改 login 响应，包含新字段**

修改 `server/src/routes/coach.ts` 中 login 响应体：

```typescript
  res.json({
    success: true,
    data: {
      token,
      coach: {
        id: coach.id, phone: coach.phone, name: coach.name, school: coach.school,
        teamName: coach.teamName, teamLogo: coach.teamLogo,
        playerMode: coach.playerMode,
        trialUntil: Number(coach.trialUntil),
        authorizedUntil: Number(coach.authorizedUntil),
      },
    },
  })
```

- [ ] **Step 2: 新增 GET /coach/me**

在 `server/src/routes/coach.ts` 中 `/password` 路由之后（约第173行后）插入：

```typescript
coachRouter.get('/me', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const coach = await db.coach.findUnique({ where: { id: coachId(req) } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })
  res.json({
    success: true,
    data: {
      id: coach.id, phone: coach.phone, name: coach.name, school: coach.school,
      teamName: coach.teamName, teamLogo: coach.teamLogo,
      playerMode: coach.playerMode,
      trialUntil: Number(coach.trialUntil),
      authorizedUntil: Number(coach.authorizedUntil),
    },
  })
})
```

- [ ] **Step 3: 新增 PUT /coach/me**

紧接着 GET /coach/me 之后插入：

```typescript
coachRouter.put('/me', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, school, teamName, teamLogo } = req.body
  const now = Date.now()
  const coach = await db.coach.update({
    where: { id: coachId(req) },
    data: {
      ...(name !== undefined && { name }),
      ...(school !== undefined && { school }),
      ...(teamName !== undefined && { teamName }),
      ...(teamLogo !== undefined && { teamLogo }),
      updatedAt: now,
    },
  })
  res.json({
    success: true,
    data: {
      id: coach.id, phone: coach.phone, name: coach.name, school: coach.school,
      teamName: coach.teamName, teamLogo: coach.teamLogo,
      playerMode: coach.playerMode,
      trialUntil: Number(coach.trialUntil),
      authorizedUntil: Number(coach.authorizedUntil),
    },
  })
})
```

- [ ] **Step 4: 新增 GET /public/coach/:phone**

在 `server/src/routes/player.ts` 中 public 路由区域（例如 `/public/mode/:phone` 之后）插入：

```typescript
publicRouter.get('/public/coach/:phone', async (req, res) => {
  const phone = req.params.phone as string
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })
  res.json({
    success: true,
    data: {
      phone: coach.phone,
      name: coach.name,
      teamName: coach.teamName,
      teamLogo: coach.teamLogo,
    },
  })
})
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/coach.ts server/src/routes/player.ts
git commit -m "feat(api): add /coach/me and /public/coach/:phone endpoints, include team fields in login"
```

---

### Task 3: 前端 API 层与 Auth Store

**Files:**
- Modify: `client/src/api/index.ts:164`
- Modify: `client/src/api/index.ts:212`
- Modify: `client/src/stores/auth.ts:55`

- [ ] **Step 1: 新增 API 方法**

在 `client/src/api/index.ts` 的 `coachApi` 对象中 `uploadAvatar` 之后插入：

```typescript
  getProfile() {
    return api.get('/coach/me')
  },
  updateProfile(data: Record<string, unknown>) {
    return api.put('/coach/me', data)
  },
```

在 `publicApi` 对象中 `getPlayerRecords` 之后插入：

```typescript
  getCoach(phone: string) {
    return api.get(`/public/coach/${phone}`)
  },
```

- [ ] **Step 2: Auth Store 新增 refreshUser**

在 `client/src/stores/auth.ts` 中 `refreshMode` 函数之后、`setMode` 之前插入：

```typescript
  async function refreshUser() {
    if (role.value === 'coach') {
      const res = await coachApi.getProfile()
      const body = res.data
      if (body.success && body.data && user.value) {
        user.value = { ...user.value, ...body.data }
      }
    }
  }
```

并在 return 对象中加入 `refreshUser`：

```typescript
  return {
    token,
    user,
    role,
    isLoggedIn,
    playerMode,
    loginAsCoach,
    loginAsAdmin,
    logout,
    refreshMode,
    setMode,
    refreshUser,
  }
```

- [ ] **Step 3: Commit**

```bash
git add client/src/api/index.ts client/src/stores/auth.ts
git commit -m "feat(api,store): add getProfile, updateProfile, getCoach, and refreshUser"
```

---

### Task 4: CoachLayout 球队区域、编辑弹窗与底部按钮

**Files:**
- Modify: `client/src/views/coach/CoachLayout.vue`

- [ ] **Step 1: Template 结构改造**

将 `CoachLayout.vue` 的 template 替换为以下内容（保持原有 nav 结构，中间插入球队区域，底部添加返回条）：

```vue
<template>
  <div class="coach-layout">
    <!-- Top Nav Bar -->
    <nav class="coach-nav">
      <div class="nav-brand">
        <span class="nav-logo">⚽</span>
        <h1 class="nav-title">星宠契约 · 教练端</h1>
      </div>

      <!-- Team Name / Logo -->
      <div class="nav-team" @click="showTeamEdit = true">
        <img
          v-if="isImageAvatar(teamLogo)"
          :src="teamLogo"
          class="nav-team-logo-img"
          alt="team logo"
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
        <span class="nav-name hidden sm:inline">{{ auth.user?.name }}</span>
        <button class="nav-logout" @click="auth.logout()">退出</button>
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
                <template v-if="editForm.teamLogo && isImageAvatar(editForm.teamLogo)">
                  <img :src="editForm.teamLogo" class="logo-preview" alt="preview" />
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
  </div>
</template>
```

- [ ] **Step 2: Script 逻辑改造**

将 `<script setup>` 替换为：

```typescript
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { coachApi } from '@/api'
import '@/styles/coach-theme.css'

const auth = useAuthStore()
const route = useRoute()

const navLinks = [
  { to: '/coach/score', icon: '📝', label: '快速记分' },
  { to: '/coach/players', icon: '👥', label: '球员管理' },
  { to: '/coach/player-cards', icon: '🃏', label: '球员卡' },
]

const showTeamEdit = ref(false)
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const teamName = computed(() => (auth.user?.teamName as string) || '')
const teamLogo = computed(() => (auth.user?.teamLogo as string) || '')

const editForm = ref({
  teamName: teamName.value,
  teamLogo: teamLogo.value,
})

// 打开弹窗时同步最新值
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
</script>
```

注意：`openTeamEdit` 暂未绑定，因为 `@click` 直接设置了 `showTeamEdit = true`。如果需要在打开时同步数据，将 `@click="showTeamEdit = true"` 改为 `@click="openTeamEdit()"`。

在 template 的 `nav-team` 上将 `@click="showTeamEdit = true"` 改为 `@click="openTeamEdit()"`。

- [ ] **Step 3: Styles 新增**

在 `<style scoped>` 末尾追加以下样式（保留原有所有样式）：

```css
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

/* Modal styles */
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
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/coach/CoachLayout.vue
git commit -m "feat(coach): team name/logo display, edit modal, and back-to-screen footer"
```

---

### Task 5: TeamScreenPage 与 TeamHeader 支持真实球队信息

**Files:**
- Modify: `client/src/views/team/TeamScreenPage.vue:128`
- Modify: `client/src/components/team/TeamHeader.vue:1-60`

- [ ] **Step 1: TeamScreenPage 调用公共 API**

在 `client/src/views/team/TeamScreenPage.vue` 中：

1. 引入 `publicApi.getCoach`：
   在现有的 `import { publicApi } from '@/api'` 下方确认已有，无需修改。

2. 修改 `teamName` 默认值和新增 `teamLogo` ref：

```typescript
const teamName = ref('星宠小队')
const teamLogo = ref('')
```

3. 在 `loadData()` 函数中，添加 `getCoach` 调用：

找到现有的 `loadData` 函数：

```typescript
async function loadData() {
  if (!phone) {
    loading.value = false
    return
  }

  try {
    const [playersRes, rankRes, actRes, modeRes] = await Promise.all([
      publicApi.getPlayers(phone),
      publicApi.getLeaderboard(phone),
      publicApi.getActivities(phone),
      publicApi.getMode(phone),
    ])
    // ...
```

将其改为：

```typescript
async function loadData() {
  if (!phone) {
    loading.value = false
    return
  }

  try {
    const [playersRes, rankRes, actRes, modeRes, coachRes] = await Promise.all([
      publicApi.getPlayers(phone),
      publicApi.getLeaderboard(phone),
      publicApi.getActivities(phone),
      publicApi.getMode(phone),
      publicApi.getCoach(phone),
    ])

    // existing data assignments
    players.value = playersRes.data.data || []
    ranking.value = rankRes.data.data || []
    activities.value = actRes.data.data || []
    isOpenMode.value = modeRes.data.data?.playerMode === 'open'

    const coachData = coachRes.data.data
    if (coachData?.teamName) {
      teamName.value = coachData.teamName
    }
    if (coachData?.teamLogo) {
      teamLogo.value = coachData.teamLogo
    }
  } catch (e) {
    console.error('Failed to load screen data', e)
    error.value = '加载失败，请检查网络'
  } finally {
    loading.value = false
  }
}
```

注意：原文件中 `isOpenMode.value = modeRes.data.data?.playerMode === 'open'` 已存在，保留即可。

4. 修改 `TeamHeader` 的 props 绑定：

将 `<TeamHeader :team-name="teamName" :activities="activities" />`
改为 `<TeamHeader :team-name="teamName" :logo="teamLogo" :activities="activities" />`

- [ ] **Step 2: TeamHeader 支持图片 Logo**

将 `client/src/components/team/TeamHeader.vue` 的 template 替换为：

```vue
<template>
  <div class="team-header">
    <div class="team-brand">
      <img
        v-if="logo && isImageLogo(logo)"
        :src="logo"
        class="team-logo-img"
        alt="team logo"
      />
      <span v-else class="team-logo">{{ logo || '⚽' }}</span>
      <h1 class="team-name">{{ teamName }}</h1>
    </div>
    <ActivityTicker :activities="activities" />
  </div>
</template>
```

在 `<script setup>` 中添加 `isImageLogo` 函数：

```typescript
function isImageLogo(logo: string): boolean {
  return logo?.startsWith('/') ?? false
}
```

在 `<style scoped>` 中添加图片样式：

```css
.team-logo-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 50%;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/views/team/TeamScreenPage.vue client/src/components/team/TeamHeader.vue
git commit -m "feat(screen): display real team name and logo from coach profile"
```

---

### Task 6: 构建验证

**Files:**
- N/A（验证步骤）

- [ ] **Step 1: 后端编译检查**

Run:
```bash
cd server
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: 前端构建**

Run:
```bash
cd client
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: resolve build errors for team name/logo feature" || echo "No fixes needed"
```

---

## Self-Review

**1. Spec coverage:**
- Prisma schema 新增字段 ✅ Task 1
- `/coach/me` GET/PUT ✅ Task 2
- Login 返回新字段 ✅ Task 2
- `/public/coach/:phone` ✅ Task 2
- 前端 API 层 ✅ Task 3
- Auth store refreshUser ✅ Task 3
- CoachLayout 顶部球队区域 ✅ Task 4
- CoachLayout 编辑弹窗 ✅ Task 4
- CoachLayout 底部返回按钮 ✅ Task 4
- TeamScreenPage 读取真实信息 ✅ Task 5
- TeamHeader 支持图片 logo ✅ Task 5

**2. Placeholder scan:** 无 TBD、TODO、placeholder。

**3. Type consistency:**
- `teamName`/`teamLogo` 在 schema、API、store、组件中命名一致
- `isImageAvatar` / `isImageLogo` 函数签名一致
- `publicApi.getCoach` 命名与端点一致

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-28-team-name-logo.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
