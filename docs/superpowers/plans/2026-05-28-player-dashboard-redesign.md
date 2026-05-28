# 队员个人页（Player Dashboard）改版实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有暗黑奢华风格的队员个人页改为明亮卡通风格，整合 FIFA 能力卡与宠物互动区，实现大屏/手机多场景响应式适配，并完善大屏页面的模式控制。

**Architecture:** 前端重写 `PlayerDashboardPage.vue` 为主布局容器，复用并扩展 `FifaPlayerCard.vue` 和 `RadarChart.vue` 以支持明亮主题；后端新增公开模式查询接口和公开球员统计接口，使无认证访客也能查看学员档案。

**Tech Stack:** TypeScript, Vue 3 + Vite + Tailwind CSS, Express, Prisma ORM, HTML5 Canvas

---

## 文件结构总览

### 后端新增/修改

| 文件 | 操作 | 说明 |
|---|---|---|
| `server/src/routes/player.ts` | 修改 | 新增 `GET /public/mode/:phone` 和 `GET /public/player-stats/:phone/:playerId`；`GET /player/:playerId/pet` 追加 `currentPoints` |

### 前端新增/修改

| 文件 | 操作 | 说明 |
|---|---|---|
| `client/src/api/index.ts` | 修改 | `publicApi` 新增 `getMode`、`getPlayerStats` |
| `client/src/components/RadarChart.vue` | 修改 | 新增 `gridColor`、`labelColor` props，支持明亮主题 |
| `client/src/components/FifaPlayerCard.vue` | 修改 | 新增 `theme: 'dark' \| 'light'` prop，切换配色方案 |
| `client/src/components/player/PlayerPetCard.vue` | 创建 | 个人页宠物展示卡（大尺寸、浮动动画、阶段边框） |
| `client/src/views/player/PlayerDashboardPage.vue` | 重写 | 明亮风格主页面，左右分栏（大屏）/ 垂直堆叠（手机） |
| `client/src/views/team/TeamScreenPage.vue` | 修改 | 加载时获取教练模式，display 模式禁用宠物卡点击并提示 |
| `client/src/components/team/TeamPetCard.vue` | 修改 | 新增 `clickable` prop，控制点击与光标样式 |

---

### Task 1: 后端公开模式与球员统计 API

**Files:**
- Modify: `server/src/routes/player.ts`

- [ ] **Step 1: 新增 `GET /public/mode/:phone`**

在 `publicRouter` 区域（`publicRouter.get('/public/activities/:phone')` 之后）添加：

```ts
publicRouter.get('/public/mode/:phone', async (req, res) => {
  const phone = req.params.phone as string
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })
  res.json({ success: true, data: { playerMode: coach.playerMode } })
})
```

- [ ] **Step 2: 新增 `GET /public/player-stats/:phone/:playerId`**

在 `publicRouter` 区域继续添加：

```ts
publicRouter.get('/public/player-stats/:phone/:playerId', async (req, res) => {
  const phone = req.params.phone as string
  const playerId = req.params.playerId as string

  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })

  const player = await db.player.findFirst({ where: { id: playerId, coachId: coach.id } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const dimensions = await db.scoreDimension.findMany({
    where: { coachId: coach.id, isActive: true },
    include: { indicators: { where: { isActive: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0)
  const [todayScores, weekScores] = await Promise.all([
    db.scoreRecord.aggregate({ where: { playerId, createdAt: { gte: todayStart.getTime() } }, _sum: { points: true } }),
    db.scoreRecord.aggregate({ where: { playerId, createdAt: { gte: weekStart.getTime() } }, _sum: { points: true } }),
  ])

  const dimStats = await Promise.all(dimensions.map(async (dim) => {
    const indicatorIds = dim.indicators.map(i => i.id)
    const total = indicatorIds.length > 0 ? await db.scoreRecord.aggregate({
      where: { playerId, indicatorId: { in: indicatorIds } }, _sum: { points: true },
    }) : { _sum: { points: 0 } }
    const maxScore = dim.indicators.reduce((sum, i) => sum + i.dailyLimit * 7, 0)
    const score = total._sum?.points || 0
    return {
      dimensionId: dim.id, dimensionName: dim.name, icon: dim.icon,
      score: Math.min(99, Math.round((score / Math.max(1, maxScore)) * 99)), maxScore,
    }
  }))

  const overall = dimStats.length > 0 ? Math.round(dimStats.reduce((s, d) => s + d.score, 0) / dimStats.length) : 0
  const allPlayers = await db.player.findMany({
    where: { coachId: coach.id }, select: { id: true, currentPoints: true },
    orderBy: { currentPoints: 'desc' },
  })
  const rank = allPlayers.findIndex(p => p.id === playerId) + 1

  res.json({
    success: true,
    data: {
      playerId, playerName: player.name, avatar: player.avatar, overall, dimensions: dimStats,
      totalPoints: player.currentPoints, lifetimePoints: player.lifetimePoints,
      todayPoints: todayScores._sum?.points || 0, weeklyPoints: weekScores._sum?.points || 0, rank,
    },
  })
})
```

- [ ] **Step 3: `GET /player/:playerId/pet` 追加 `currentPoints`**

找到 `playerRouter.get('/:playerId/pet', ...)` 的响应部分，将：

```ts
  res.json({
    success: true,
    data: {
      ...pet,
      lastDecayAt: Number(pet.lastDecayAt), lastFedAt: Number(pet.lastFedAt),
      lastPlayedAt: Number(pet.lastPlayedAt), createdAt: Number(pet.createdAt),
      evolvedAt: Number(pet.evolvedAt),
      species: speciesDef ? { ...speciesDef, stages: JSON.parse(JSON.stringify(speciesDef.stages)) } : null,
    },
  })
```

改为：

```ts
  const player = await db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })

  res.json({
    success: true,
    data: {
      ...pet,
      lastDecayAt: Number(pet.lastDecayAt), lastFedAt: Number(pet.lastFedAt),
      lastPlayedAt: Number(pet.lastPlayedAt), createdAt: Number(pet.createdAt),
      evolvedAt: Number(pet.evolvedAt),
      currentPoints: player?.currentPoints || 0,
      species: speciesDef ? { ...speciesDef, stages: JSON.parse(JSON.stringify(speciesDef.stages)) } : null,
    },
  })
```

- [ ] **Step 4: 手动验证后端 API**

启动后端：`cd server && npm run dev`

```bash
curl "http://localhost:3000/api/public/mode/13800138000"
curl "http://localhost:3000/api/public/player-stats/13800138000/<playerId>"
curl "http://localhost:3000/api/player/<playerId>/pet"
```

Expected: 三个接口均返回正确 JSON，`/pet` 响应中新增 `currentPoints` 字段。

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/player.ts
git commit -m "feat: add public mode and player-stats APIs, include currentPoints in pet response"
```

---

### Task 2: 前端 API 封装

**Files:**
- Modify: `client/src/api/index.ts`

- [ ] **Step 1: 在 `publicApi` 中新增方法**

在 `client/src/api/index.ts` 的 `publicApi` 对象中，现有 `getActivities` 之后添加：

```ts
  getMode(phone: string) {
    return api.get(`/public/mode/${phone}`)
  },
  getPlayerStats(phone: string, playerId: string) {
    return api.get(`/public/player-stats/${phone}/${playerId}`)
  },
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api/index.ts
git commit -m "feat: add publicApi.getMode and publicApi.getPlayerStats"
```

---

### Task 3: RadarChart 支持明亮主题

**Files:**
- Modify: `client/src/components/RadarChart.vue`

- [ ] **Step 1: 新增 `gridColor` 和 `labelColor` props**

将现有的 `withDefaults` 定义改为：

```ts
const props = withDefaults(
  defineProps<{
    dimensions: { label: string; value: number; maxValue?: number }[]
    size?: number
    color?: string
    fillColor?: string
    animated?: boolean
    gridColor?: string
    labelColor?: string
  }>(),
  {
    size: 200,
    color: '#FFD700',
    fillColor: 'rgba(255, 215, 0, 0.2)',
    animated: true,
    gridColor: 'rgba(255, 255, 255, 0.1)',
    labelColor: '#9ca3af',
  },
)
```

- [ ] **Step 2: 在 `draw` 函数中使用 props 替代硬编码颜色**

将 `draw` 函数中的三处硬编码颜色替换为 props：

1. 背景网格线颜色（两处 `ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'`）：
   ```ts
   ctx.strokeStyle = props.gridColor
   ```

2. 轴线颜色（`ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'`）：
   ```ts
   ctx.strokeStyle = props.gridColor
   ```

3. 标签颜色（`ctx.fillStyle = '#9ca3af'`）：
   ```ts
   ctx.fillStyle = props.labelColor
   ```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/RadarChart.vue
git commit -m "feat: add gridColor and labelColor props to RadarChart for light theme"
```

---

### Task 4: FifaPlayerCard 支持主题切换

**Files:**
- Modify: `client/src/components/FifaPlayerCard.vue`

- [ ] **Step 1: 新增 `theme` prop 并定义明亮主题配色**

在 `<script setup>` 的 `defineProps` 中添加 `theme`：

```ts
const props = defineProps<{
  stats: PlayerStats
  theme?: 'dark' | 'light'
}>()
```

新增计算属性：

```ts
const isLight = computed(() => props.theme === 'light')

const cardBg = computed(() => {
  if (isLight.value) return '#FFFFFF'
  switch (ratingTier.value) {
    case 'gold': return 'linear-gradient(135deg, #1a1a2e 0%, #2d1f0a 100%)'
    case 'silver': return 'linear-gradient(135deg, #1a1a2e 0%, #1f2937 100%)'
    case 'bronze': return 'linear-gradient(135deg, #1a1a2e 0%, #2a1f0f 100%)'
  }
})

const textColor = computed(() => isLight.value ? '#333333' : '#FFFFFF')
const subTextColor = computed(() => isLight.value ? '#666666' : '#9ca3af')
const trackBg = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)')
const statBoxBg = computed(() => isLight.value ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)')
```

- [ ] **Step 2: 修改模板中的动态样式**

1. 根元素 `color`：`<div class="fifa-card" ... :style="{ background: cardBg, color: textColor }">`
2. `player-points` 颜色：`:style="{ color: subTextColor }"`
3. `bar-track` 背景：`:style="{ background: trackBg }"`
4. `dim-score` 颜色：`:style="{ color: subTextColor }"`
5. `stat` 背景：`:style="{ background: statBoxBg }"`
6. `stat label` 颜色：`:style="{ color: subTextColor }"`
7. `RadarChart` 调用传入 `gridColor` 和 `labelColor`：
   ```vue
   <RadarChart
     :dimensions="radarDimensions"
     :size="140"
     :color="accentColor"
     :fill-color="accentFillColor"
     :grid-color="isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'"
     :label-color="isLight ? '#666666' : '#9ca3af'"
   />
   ```

- [ ] **Step 3: 修改 `progressColor` 函数以匹配明亮主题进度条语义**

```ts
function progressColor(score: number): string {
  if (isLight.value) {
    if (score >= 80) return 'linear-gradient(90deg, #4caf50, #66bb6a)'
    if (score >= 60) return 'linear-gradient(90deg, #ff9800, #ffb74d)'
    return 'linear-gradient(90deg, #f44336, #ef5350)'
  }
  if (score >= 80) return 'linear-gradient(90deg, #FFD700, #FFA500)'
  if (score >= 60) return 'linear-gradient(90deg, #22c55e, #16a34a)'
  return 'linear-gradient(90deg, #3b82f6, #2563eb)'
}
```

- [ ] **Step 4: 添加 `.fifa-card.light` 样式覆盖**

在 `<style scoped>` 末尾添加：

```css
.fifa-card.light {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
```

并在根元素 `:class` 中绑定 light 类：`:class="[`rating-${ratingTier}`, { light: isLight }]`"

- [ ] **Step 5: Commit**

```bash
git add client/src/components/FifaPlayerCard.vue
git commit -m "feat: add light theme support to FifaPlayerCard"
```

---

### Task 5: PlayerPetCard 组件

**Files:**
- Create: `client/src/components/player/PlayerPetCard.vue`

- [ ] **Step 1: 创建组件**

```vue
<template>
  <div class="player-pet-card" :class="`stage-${petStage}`">
    <div class="pet-stage-area">
      <template v-if="petImageUrl">
        <img :src="petImageUrl" alt="pet" class="pet-main-img" />
      </template>
      <template v-else>
        <span class="pet-emoji">{{ petEmoji }}</span>
      </template>
      <img
        v-for="acc in accessories"
        :key="acc.id"
        :src="acc.imageUrl"
        class="pet-accessory"
        :style="accStyle(acc)"
        alt="accessory"
      />
    </div>
    <div class="pet-meta">
      <span class="stage-badge">{{ stageLabel }}</span>
      <span class="level-text">Lv.{{ pet?.level ?? 1 }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AccessoryItem {
  id: string
  imageUrl: string
  position: { top: string; left: string; scale: number }
}

const props = defineProps<{
  pet: {
    name: string
    stage: string
    level: number
    speciesId: string
    species?: {
      stages: Record<string, { emoji: string; imageUrl?: string }>
    }
    equippedDecorations?: string[]
  } | null
  accessories?: AccessoryItem[]
}>()

const petStage = computed(() => props.pet?.stage || 'egg')

const petEmoji = computed(() => {
  if (!props.pet?.species?.stages) return '🥚'
  const stageData = props.pet.species.stages[props.pet.stage]
  return stageData?.emoji || '🥚'
})

const petImageUrl = computed(() => {
  if (!props.pet?.species?.stages) return null
  const stageData = props.pet.species.stages[props.pet.stage]
  return stageData?.imageUrl || null
})

const stageLabel = computed(() => {
  const map: Record<string, string> = { egg: '蛋', baby: '幼崽', teen: '成长', adult: '成熟', rare: '臻藏' }
  return map[petStage.value] || petStage.value
})

function accStyle(acc: AccessoryItem) {
  return {
    top: acc.position.top,
    left: acc.position.left,
    transform: `translate(-50%, -50%) scale(${acc.position.scale ?? 1})`,
  }
}
</script>

<style scoped>
.player-pet-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.pet-stage-area {
  width: 120px;
  height: 120px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
}

.pet-emoji {
  font-size: 72px;
  line-height: 1;
  animation: float-bob 3s ease-in-out infinite;
}

.pet-main-img {
  width: 96px;
  height: 96px;
  object-fit: contain;
  animation: float-bob 3s ease-in-out infinite;
}

.pet-accessory {
  position: absolute;
  width: 36px;
  height: 36px;
  object-fit: contain;
  pointer-events: none;
}

@keyframes float-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.pet-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stage-badge {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 12px;
  background: #f5f5f5;
  color: #666;
  font-weight: 600;
}

.level-text {
  font-size: 13px;
  color: #999;
  font-family: 'Russo One', sans-serif;
}

/* 阶段边框色（作用于外部容器时由父级控制，此处仅提供配色映射） */
.stage-egg .pet-stage-area { border: 3px solid #e0e0e0; }
.stage-baby .pet-stage-area { border: 3px solid #81c784; }
.stage-teen .pet-stage-area { border: 3px solid #ffd54f; }
.stage-adult .pet-stage-area { border: 3px solid #ff8a65; }
.stage-rare .pet-stage-area { border: 3px solid #f06292; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/player/PlayerPetCard.vue
git commit -m "feat: add PlayerPetCard component for dashboard"
```

---

### Task 6: 重写 PlayerDashboardPage.vue

**Files:**
- Rewrite: `client/src/views/player/PlayerDashboardPage.vue`

- [ ] **Step 1: 重写页面为明亮卡通风格**

将 `PlayerDashboardPage.vue` 替换为：

```vue
<template>
  <div class="dashboard-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p class="error-icon">😕</p>
      <p class="error-msg">{{ error }}</p>
      <button class="retry-btn" @click="retry">重试</button>
    </div>

    <!-- Main Content -->
    <main v-else-if="pet" class="main-content">
      <!-- Header -->
      <header class="page-header">
        <router-link
          v-if="coachPhone"
          :to="`/screen?c=${coachPhone}`"
          class="back-btn"
        >
          ←
        </router-link>
        <h1 class="page-title">{{ pet.name }}的宠物档案</h1>
      </header>

      <div class="dashboard-body">
        <!-- Left: FIFA Card -->
        <section class="card-section">
          <FifaPlayerCard
            v-if="playerStats"
            :stats="playerStats"
            theme="light"
          />
          <div v-else class="card-placeholder">
            <p>暂无能力数据</p>
          </div>
        </section>

        <!-- Right: Pet Interaction -->
        <section class="pet-section">
          <div class="pet-card-wrapper">
            <PlayerPetCard :pet="pet" />
            <div class="pet-name-display">{{ pet.name }}</div>
          </div>

          <!-- Vitals -->
          <div class="vitals">
            <div class="vital-row">
              <span class="vital-label">饱食</span>
              <div class="vital-track">
                <div
                  class="vital-fill"
                  :style="{ width: pet.hunger + '%', background: hungerGradient(pet.hunger) }"
                ></div>
              </div>
              <span class="vital-value">{{ pet.hunger }}</span>
            </div>
            <div class="vital-row">
              <span class="vital-label">心情</span>
              <div class="vital-track">
                <div
                  class="vital-fill"
                  :style="{ width: pet.mood + '%', background: moodGradient(pet.mood) }"
                ></div>
              </div>
              <span class="vital-value">{{ pet.mood }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="actions">
            <button class="action-btn action-feed" @click="handleFeed">
              <span class="btn-icon">🍖</span>
              <span class="btn-label">喂食</span>
            </button>
            <button class="action-btn action-play" @click="handlePlay">
              <span class="btn-icon">🎾</span>
              <span class="btn-label">训练</span>
            </button>
          </div>

          <!-- Points -->
          <div class="points-display">
            <span class="points-label">当前积分</span>
            <span class="points-value">{{ currentPoints }}</span>
            <span class="points-star">⭐</span>
          </div>

          <!-- Links -->
          <router-link :to="`/player/${playerId}/shop`" class="link-row">
            🏪 去商店 <span class="link-arrow">&gt;</span>
          </router-link>
          <router-link
            v-if="coachPhone"
            :to="`/screen?c=${coachPhone}`"
            class="link-row"
          >
            👀 返回全班大屏 <span class="link-arrow">&gt;</span>
          </router-link>
        </section>
      </div>

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="actionMessage" class="toast toast-success">{{ actionMessage }}</div>
      </Transition>
      <Transition name="toast">
        <div v-if="actionError" class="toast toast-error">{{ actionError }}</div>
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { playerApi, publicApi } from '@/api'
import FifaPlayerCard from '@/components/FifaPlayerCard.vue'
import PlayerPetCard from '@/components/player/PlayerPetCard.vue'
import type { PlayerStats } from '@shared/types'

const route = useRoute()
const playerId = route.params.playerId as string

interface PetData {
  name: string
  stage: string
  level: number
  carePoints: number
  hunger: number
  mood: number
  speciesId: string
  currentPoints: number
  species: {
    stages: Record<string, { emoji: string; imageUrl?: string }>
  } | null
}

const pet = ref<PetData | null>(null)
const playerStats = ref<PlayerStats | null>(null)
const currentPoints = ref(0)
const loading = ref(true)
const error = ref('')
const actionMessage = ref('')
const actionError = ref('')
const coachPhone = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  coachPhone.value = route.query.c as string || ''

  try {
    const petRes = await playerApi.getPet(playerId)
    pet.value = petRes.data.data
    currentPoints.value = petRes.data.data?.currentPoints || 0

    if (coachPhone.value) {
      try {
        const statsRes = await publicApi.getPlayerStats(coachPhone.value, playerId)
        if (statsRes.data.success) {
          playerStats.value = statsRes.data.data
        }
      } catch (e) {
        console.warn('Failed to load player stats', e)
      }
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

function retry() { loadData() }
onMounted(loadData)

function hungerGradient(v: number): string {
  if (v > 60) return 'linear-gradient(90deg, #4caf50, #66bb6a)'
  if (v > 30) return 'linear-gradient(90deg, #ff9800, #ffb74d)'
  return 'linear-gradient(90deg, #f44336, #ef5350)'
}

function moodGradient(v: number): string {
  if (v > 60) return 'linear-gradient(90deg, #42a5f5, #64b5f6)'
  if (v > 30) return 'linear-gradient(90deg, #ff9800, #ffb74d)'
  return 'linear-gradient(90deg, #f44336, #ef5350)'
}

async function handleFeed() {
  actionMessage.value = ''
  actionError.value = ''
  try {
    const res = await playerApi.feed(playerId)
    const data = res.data.data
    if (pet.value) {
      pet.value.hunger = data.hunger
      pet.value.carePoints = data.carePoints
      pet.value.stage = data.stage
    }
    currentPoints.value = data.currentPoints
    actionMessage.value = data.evolved ? '✨ 进化！' : '🍖 已喂食'
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '操作失败'
  }
}

async function handlePlay() {
  actionMessage.value = ''
  actionError.value = ''
  try {
    const res = await playerApi.play(playerId)
    const data = res.data.data
    if (pet.value) {
      pet.value.mood = data.mood
      pet.value.carePoints = data.carePoints
      pet.value.stage = data.stage
    }
    currentPoints.value = data.currentPoints
    actionMessage.value = data.evolved ? '✨ 进化！' : '🎾 已训练'
  } catch (e: any) {
    actionError.value = e.response?.data?.error || '操作失败'
  }
}
</script>

<style scoped>
/* ===== Page ===== */
.dashboard-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  padding: 16px;
}

/* ===== Loading / Error ===== */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  color: #666;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #42a5f5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
}

.error-msg {
  font-size: 16px;
  color: #999;
}

.retry-btn {
  padding: 8px 24px;
  border-radius: 24px;
  border: none;
  background: #42a5f5;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

/* ===== Main Content ===== */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== Header ===== */
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #666;
  font-size: 18px;
  flex-shrink: 0;
}

.page-title {
  font-family: 'ZCOOL KuaiLe', 'PingFang SC', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

/* ===== Body Layout ===== */
.dashboard-body {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.card-section {
  flex: 0 0 55%;
  min-width: 0;
}

.pet-section {
  flex: 0 0 45%;
  min-width: 0;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.card-placeholder {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  color: #999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* ===== Pet Display ===== */
.pet-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pet-name-display {
  font-family: 'ZCOOL KuaiLe', sans-serif;
  font-size: 20px;
  color: #333;
}

/* ===== Vitals ===== */
.vitals {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vital-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vital-label {
  font-size: 14px;
  color: #666;
  width: 40px;
  flex-shrink: 0;
  font-weight: 600;
}

.vital-track {
  flex: 1;
  height: 10px;
  background: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
}

.vital-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.6s ease-out;
}

.vital-value {
  font-size: 14px;
  color: #333;
  width: 36px;
  text-align: right;
  font-weight: 700;
  font-family: 'Russo One', sans-serif;
}

/* ===== Actions ===== */
.actions {
  width: 100%;
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.action-feed {
  background: linear-gradient(135deg, #ff9800, #ffb74d);
  color: white;
}

.action-play {
  background: linear-gradient(135deg, #2196f3, #64b5f6);
  color: white;
}

.btn-icon {
  font-size: 24px;
}

/* ===== Points ===== */
.points-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
}

.points-label {
  color: #666;
  font-size: 14px;
}

.points-value {
  font-family: 'Russo One', sans-serif;
  font-size: 28px;
  color: #ff9800;
}

.points-star {
  font-size: 20px;
}

/* ===== Links ===== */
.link-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f8f9fa;
  color: #333;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.link-row:hover {
  background: #e3f2fd;
}

.link-arrow {
  color: #999;
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 28px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  z-index: 10;
  pointer-events: none;
}

.toast-success {
  color: #2e7d32;
  background: #e8f5e9;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.toast-error {
  color: #c62828;
  background: #ffebee;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.toast-enter-active {
  transition: all 0.4s ease;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

/* ===== Responsive: Tablet ===== */
@media (max-width: 1024px) {
  .dashboard-body {
    flex-direction: column;
    align-items: stretch;
  }
  .card-section,
  .pet-section {
    flex: 1 1 auto;
    width: 80%;
    margin: 0 auto;
  }
}

/* ===== Responsive: Mobile ===== */
@media (max-width: 768px) {
  .dashboard-page {
    padding: 12px;
  }
  .card-section,
  .pet-section {
    width: 100%;
  }
  .page-title {
    font-size: 18px;
  }
}
</style>
```

- [ ] **Step 2: 手动验证**

启动前端：`cd client && npm run dev`

访问 `http://localhost:5173/#/player/<playerId>?c=<phone>`：
- 页面背景为蓝绿渐变
- 左侧（或上方）显示白色 FIFA 能力卡，金银铜边框保留
- 右侧（或下方）显示白色宠物互动卡片
- 宠物有浮动动画
- 饱食/心情进度条为绿色/黄色/红色
- 喂食按钮橙色，训练按钮蓝色
- 点击操作后显示 toast 提示
- 有"去商店"和"返回全班大屏"入口

- [ ] **Step 3: Commit**

```bash
git add client/src/views/player/PlayerDashboardPage.vue
git commit -m "feat: redesign PlayerDashboardPage with bright theme and FIFA card integration"
```

---

### Task 7: 大屏页面模式控制

**Files:**
- Modify: `client/src/views/team/TeamScreenPage.vue`
- Modify: `client/src/components/team/TeamPetCard.vue`

- [ ] **Step 1: TeamPetCard 新增 `clickable` prop**

在 `client/src/components/team/TeamPetCard.vue` 中：

1. `defineProps` 中新增 `clickable`（默认 `true`）：
   ```ts
   clickable: {
     type: Boolean,
     default: true,
   }
   ```

2. 将 `@click="$emit('click')"` 改为条件触发：
   ```vue
   <div
     class="team-pet-card"
     :class="[`stage-${petStage}`, { disabled: !clickable }]"
     @click="clickable && $emit('click')"
   >
   ```

3. 添加 disabled 样式：
   ```css
   .team-pet-card.disabled {
     cursor: not-allowed;
     opacity: 0.7;
   }
   .team-pet-card.disabled:hover {
     transform: none;
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
   }
   ```

- [ ] **Step 2: TeamScreenPage 获取模式并控制点击行为**

在 `client/src/views/team/TeamScreenPage.vue` 中：

1. `<script setup>` 中新增：
   ```ts
   import { ref, onMounted, onUnmounted } from 'vue'
   // ... 现有导入

   const isOpenMode = ref(true)
   const modeLoading = ref(false)
   ```

2. `loadData()` 中追加模式获取：
   ```ts
   async function loadData() {
     if (!phone) {
       error.value = '缺少教练手机号参数，请通过 ?c=手机号 访问'
       loading.value = false
       return
     }

     try {
       const [playersRes, rankRes, actRes, modeRes] = await Promise.all([
         publicApi.getPlayers(phone),
         publicApi.getLeaderboard(phone),
         publicApi.getActivities(phone),
         publicApi.getMode(phone).catch(() => ({ data: { success: false } })),
       ])

       // ... 现有 players/ranking/activities 处理

       if (modeRes.data.success) {
         isOpenMode.value = modeRes.data.data?.playerMode === 'open'
       }
     } catch (e: any) {
       error.value = e.response?.data?.error || '加载失败，请检查网络'
     } finally {
       loading.value = false
     }
   }
   ```

3. 修改 `goToPlayer`：
   ```ts
   function goToPlayer(playerId: string) {
     if (!isOpenMode.value) {
       showToast('教练已暂停操作')
       return
     }
     router.push(`/player/${playerId}?c=${phone}`)
   }
   ```

4. 新增 toast 逻辑：
   ```ts
   const toastMsg = ref('')
   let toastTimer: ReturnType<typeof setTimeout> | null = null

   function showToast(msg: string) {
     toastMsg.value = msg
     if (toastTimer) clearTimeout(toastTimer)
     toastTimer = setTimeout(() => { toastMsg.value = '' }, 2000)
   }
   ```

5. 模板中 `TeamPetCard` 传入 `clickable`：
   ```vue
   <TeamPetCard
     v-for="player in players"
     :key="player.id"
     :player-id="player.id"
     :player-name="player.name"
     :avatar="player.avatar"
     :current-points="player.currentPoints"
     :pet="player.pet"
     :clickable="isOpenMode"
     @click="goToPlayer(player.id)"
   />
   ```

6. 模板底部添加 toast：
   ```vue
   <Transition name="toast">
     <div v-if="toastMsg" class="screen-toast">{{ toastMsg }}</div>
   </Transition>
   ```

7. 添加 toast 样式：
   ```css
   .screen-toast {
     position: fixed;
     bottom: 2rem;
     left: 50%;
     transform: translateX(-50%);
     padding: 10px 24px;
     border-radius: 24px;
     background: rgba(0, 0, 0, 0.75);
     color: white;
     font-size: 14px;
     z-index: 100;
     pointer-events: none;
   }
   ```

- [ ] **Step 3: 手动验证**

1. 将教练模式设为 `open`，访问大屏，点击宠物卡应正常跳转个人页
2. 将教练模式设为 `display`，访问大屏：
   - 宠物卡 hover 时显示 `not-allowed` 光标
   - 点击宠物卡无跳转，页面底部出现 toast "教练已暂停操作"

- [ ] **Step 4: Commit**

```bash
git add client/src/views/team/TeamScreenPage.vue client/src/components/team/TeamPetCard.vue
git commit -m "feat: add display mode control on team screen"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 视觉风格统一（明亮卡通、渐变、白色圆角卡片）→ 页面背景 + card-section/pet-section 样式
- ✅ FIFA 能力卡整合 → FifaPlayerCard theme="light"
- ✅ 六维雷达图 → RadarChart gridColor/labelColor props
- ✅ 多场景适配 → 响应式 @media（≥1024px 左右分栏、<1024px 垂直堆叠、<768px 全宽）
- ✅ 大屏模式控制 → `GET /public/mode/:phone` + TeamScreenPage 点击拦截 + TeamPetCard clickable prop
- ✅ 个人页不再需要展示模式横幅 → 已移除 isDisplayMode 和 mode banner
- ✅ 返回全班大屏链接 → pet-section 中的 router-link
- ✅ 公开球员统计 → `GET /public/player-stats/:phone/:playerId`
- ✅ pet API 返回 currentPoints → 减少个人页额外请求

**2. Placeholder scan:** 无 TBD、TODO、implement later。每步均有完整代码。

**3. Type consistency:**
- `PlayerStats` 类型复用 `@shared/types` 中的定义，字段名一致
- `PetData` 接口与后端 `GET /player/:playerId/pet` 返回结构一致
- `publicApi.getPlayerStats(phone, playerId)` 签名与后端路由参数顺序一致

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-28-player-dashboard-redesign.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
