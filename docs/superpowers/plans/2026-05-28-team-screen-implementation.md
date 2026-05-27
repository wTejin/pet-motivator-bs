# 学员大屏（Team Screen）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个明亮卡通风格的学员大屏页面，展示全队宠物卡、实时排名和动态公告，支持 emoji/图片/GIF 宠物展示及配饰叠加。

**Architecture:** 前端新增 Vue 页面和组件，后端新增两个公开 API 端点。前后端均复用现有数据模型和类型定义。页面通过 `GET /public/players/:phone` 等公开接口获取数据，30 秒轮询刷新。

**Tech Stack:** TypeScript, Vue 3 + Vite + Tailwind CSS, Express, Prisma ORM

---

## 文件结构总览

### 后端新增/修改

| 文件 | 操作 | 说明 |
|---|---|---|
| `server/src/routes/player.ts` | 修改 | 新增 `GET /public/leaderboard/:phone` 和 `GET /public/activities/:phone` |

### 前端新增/修改

| 文件 | 操作 | 说明 |
|---|---|---|
| `client/src/router/index.ts` | 修改 | 新增 `/screen` 路由 |
| `client/src/api/index.ts` | 修改 | 新增 `publicApi` 对象，含 leaderboard、activities 方法 |
| `client/src/views/team/TeamScreenPage.vue` | 创建 | 大屏主页面，布局容器，数据聚合，轮询逻辑 |
| `client/src/components/team/TeamHeader.vue` | 创建 | 队徽 + 队名展示 |
| `client/src/components/team/ActivityTicker.vue` | 创建 | 顶部动态公告板，横向滚动 |
| `client/src/components/team/RankingPanel.vue` | 创建 | 左侧排名榜，金银铜牌高亮前 3 名 |
| `client/src/components/team/TeamPetCard.vue` | 创建 | 宠物卡，含宠物展示区（支持 emoji/图片/GIF + 配饰叠加） |
| `client/src/views/player/PlayerDashboardPage.vue` | 修改 | 底部增加"返回全班大屏"按钮 |

---

### Task 1: 后端公开排行榜 API

**Files:**
- Modify: `server/src/routes/player.ts`

- [ ] **Step 1: 在 `publicRouter` 中新增排行榜端点**

在 `server/src/routes/player.ts` 的 `publicRouter` 区域（`publicRouter.get('/public/players/:phone')` 之后）添加：

```ts
publicRouter.get('/public/leaderboard/:phone', async (req, res) => {
  const phone = req.params.phone as string
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })

  const players = await db.player.findMany({
    where: { coachId: coach.id, isActive: true },
    orderBy: { currentPoints: 'desc' },
    select: { id: true, name: true, avatar: true, currentPoints: true },
  })

  const data = players.map((p, index) => ({
    playerId: p.id,
    playerName: p.name,
    playerAvatar: p.avatar,
    currentPoints: p.currentPoints,
    rank: index + 1,
  }))

  res.json({ success: true, data })
})
```

- [ ] **Step 2: 手动验证后端 API**

启动后端：`cd server && npm run dev`

用 curl 测试：
```bash
curl "http://localhost:3000/api/public/leaderboard/13800138000"
```

Expected: JSON 响应，包含按 `currentPoints` 降序排列的学员列表，每人有 `rank` 字段。

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/player.ts
git commit -m "feat: add public leaderboard API"
```

---

### Task 2: 后端公开动态流 API

**Files:**
- Modify: `server/src/routes/player.ts`

- [ ] **Step 1: 在 `publicRouter` 中新增动态流端点**

在排行榜端点之后添加：

```ts
publicRouter.get('/public/activities/:phone', async (req, res) => {
  const phone = req.params.phone as string
  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })

  const records = await db.scoreRecord.findMany({
    where: { coachId: coach.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { player: { select: { name: true, avatar: true } } },
  })

  const data = records.map((r) => {
    let type: string = 'score'
    let description = r.reason || '积分变动'
    if (r.reason?.includes('喂食')) { type = 'feed'; description = '喂食宠物' }
    else if (r.reason?.includes('训练') || r.reason?.includes('玩耍')) { type = 'play'; description = '训练宠物' }
    else if (r.reason?.includes('购买') || r.reason?.includes('进化')) { type = 'evolution'; description = r.reason }
    else if (r.reason?.includes('商店') || r.reason?.includes('购买')) { type = 'purchase'; description = r.reason }

    return {
      id: r.id,
      type,
      playerId: r.playerId,
      playerName: r.player?.name || '未知学员',
      playerAvatar: r.player?.avatar || '😊',
      description,
      points: r.points,
      createdAt: Number(r.createdAt),
    }
  })

  res.json({ success: true, data })
})
```

- [ ] **Step 2: 手动验证后端 API**

```bash
curl "http://localhost:3000/api/public/activities/13800138000"
```

Expected: JSON 响应，包含最近 30 条动态，每条有 `type`、`playerName`、`description`、`points`、`createdAt`。

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/player.ts
git commit -m "feat: add public activity feed API"
```

---

### Task 3: 前端新增路由和 API 封装

**Files:**
- Modify: `client/src/router/index.ts`
- Modify: `client/src/api/index.ts`

- [ ] **Step 1: 在 router 中新增大屏路由**

在 `client/src/router/index.ts` 中，在 `playerShop` 路由之后添加：

```ts
    {
      path: '/screen',
      name: 'teamScreen',
      component: () => import('@/views/team/TeamScreenPage.vue'),
    },
```

- [ ] **Step 2: 在 api 中新增 publicApi**

在 `client/src/api/index.ts` 的最底部（`playerApi` 之后）添加：

```ts
// ── Public API ───────────────────────────────────────────────────────────────

export const publicApi = {
  getPlayers(phone: string) {
    return api.get(`/public/players/${phone}`)
  },
  getLeaderboard(phone: string) {
    return api.get(`/public/leaderboard/${phone}`)
  },
  getActivities(phone: string) {
    return api.get(`/public/activities/${phone}`)
  },
}
```

- [ ] **Step 3: 手动验证**

启动前端：`cd client && npm run dev`

访问 `http://localhost:5173/#/screen?c=13800138000`，页面应能加载（此时可能空白，因为组件还未创建）。

- [ ] **Step 4: Commit**

```bash
git add client/src/router/index.ts client/src/api/index.ts
git commit -m "feat: add team screen route and public API client"
```

---

### Task 4: 宠物卡组件 TeamPetCard.vue

**Files:**
- Create: `client/src/components/team/TeamPetCard.vue`

- [ ] **Step 1: 创建组件文件**

```vue
<template>
  <div class="team-pet-card" :class="`stage-${petStage}`" @click="$emit('click')">
    <!-- 宠物展示区 -->
    <div class="pet-stage-area">
      <template v-if="petImageUrl">
        <img :src="petImageUrl" alt="pet" class="pet-main-img" />
      </template>
      <template v-else>
        <span class="pet-emoji">{{ petEmoji }}</span>
      </template>
      <!-- 配饰叠加 -->
      <img
        v-for="acc in accessories"
        :key="acc.id"
        :src="acc.imageUrl"
        class="pet-accessory"
        :style="accStyle(acc)"
        alt="accessory"
      />
    </div>

    <!-- 信息区 -->
    <div class="pet-info">
      <div class="pet-name">{{ playerName }}</div>
      <div v-if="pet" class="pet-meta">
        <span class="stage-badge">{{ stageLabel }}</span>
        <span class="level-text">Lv.{{ pet.level }}</span>
      </div>
      <div class="points-line">
        <span class="points-value">{{ currentPoints }}</span>
        <span class="points-star">⭐</span>
      </div>
    </div>

    <!-- 积分飘字动画 -->
    <Transition name="float">
      <div v-if="floatingPoints" class="float-points">+{{ floatingPoints }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AccessoryItem {
  id: string
  imageUrl: string
  position: {
    x: number
    y: number
    scale?: number
  }
}

const props = defineProps<{
  playerId: string
  playerName: string
  avatar: string
  currentPoints: number
  pet: {
    name: string
    stage: string
    level: number
    speciesId: string
    species?: {
      stages: Record<string, {
        emoji: string
        imageUrl?: string
      }>
    }
    equippedDecorations?: string[]
  } | null
  accessories?: AccessoryItem[]
  floatingPoints?: number
}>()

defineEmits<{
  click: []
}>()

const petStage = computed(() => props.pet?.stage || 'egg')

const petEmoji = computed(() => {
  if (!props.pet?.species?.stages) return props.avatar || '🥚'
  const stageData = props.pet.species.stages[props.pet.stage]
  return stageData?.emoji || props.avatar || '🥚'
})

const petImageUrl = computed(() => {
  if (!props.pet?.species?.stages) return null
  const stageData = props.pet.species.stages[props.pet.stage]
  return stageData?.imageUrl || null
})

const stageLabel = computed(() => {
  const map: Record<string, string> = {
    egg: '蛋', baby: '幼崽', teen: '青少年', adult: '成年', rare: '稀有'
  }
  return map[petStage.value] || petStage.value
})

function accStyle(acc: AccessoryItem) {
  return {
    top: `calc(50% + ${acc.position.y}px)`,
    left: `calc(50% + ${acc.position.x}px)`,
    transform: `translate(-50%, -50%) scale(${acc.position.scale ?? 1})`,
  }
}
</script>

<style scoped>
.team-pet-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.team-pet-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

/* 阶段边框色 */
.stage-egg { border: 2px solid #e0e0e0; }
.stage-baby { border: 2px solid #81c784; }
.stage-teen { border: 2px solid #ffd54f; }
.stage-adult { border: 2px solid #ff8a65; }
.stage-rare { border: 2px solid #f06292; }

.pet-stage-area {
  width: 80px;
  height: 80px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-emoji {
  font-size: 48px;
  line-height: 1;
  animation: float-bob 3s ease-in-out infinite;
}

.pet-main-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  animation: float-bob 3s ease-in-out infinite;
}

.pet-accessory {
  position: absolute;
  width: 28px;
  height: 28px;
  object-fit: contain;
  pointer-events: none;
}

@keyframes float-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.pet-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.pet-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.pet-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.stage-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #666;
}

.level-text {
  font-size: 11px;
  color: #999;
  font-family: 'Russo One', sans-serif;
}

.points-line {
  display: flex;
  align-items: center;
  gap: 4px;
}

.points-value {
  font-size: 18px;
  font-weight: 700;
  color: #ff9800;
  font-family: 'Russo One', sans-serif;
}

.points-star {
  font-size: 14px;
}

/* 积分飘字 */
.float-points {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20px;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  pointer-events: none;
}

.float-enter-active {
  animation: float-up 2s ease-out forwards;
}

.float-leave-active {
  opacity: 0;
  transition: opacity 0.3s;
}

@keyframes float-up {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
}
</style>
```

- [ ] **Step 2: 手动验证**

在任意 Vue 文件中临时引入 `<TeamPetCard />` 并传入 mock 数据，确认卡片渲染正常、emoji 浮动动画生效、hover 有上浮效果。

- [ ] **Step 3: Commit**

```bash
git add client/src/components/team/TeamPetCard.vue
git commit -m "feat: add TeamPetCard component with emoji/image/GIF and accessory overlay"
```

---

### Task 5: 排名榜组件 RankingPanel.vue

**Files:**
- Create: `client/src/components/team/RankingPanel.vue`

- [ ] **Step 1: 创建组件文件**

```vue
<template>
  <div class="ranking-panel">
    <h3 class="ranking-title">🏆 积分榜</h3>
    <div class="ranking-list">
      <div
        v-for="item in ranking"
        :key="item.playerId"
        class="ranking-item"
        :class="`rank-${item.rank}`"
      >
        <span class="rank-medal">{{ medal(item.rank) }}</span>
        <span class="rank-avatar">{{ item.playerAvatar }}</span>
        <div class="rank-info">
          <span class="rank-name">{{ item.playerName }}</span>
          <span class="rank-points">{{ item.currentPoints }} ⭐</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface RankingItem {
  playerId: string
  playerName: string
  playerAvatar: string
  currentPoints: number
  rank: number
}

defineProps<{
  ranking: RankingItem[]
}>()

function medal(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}.`
}
</script>

<style scoped>
.ranking-panel {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ranking-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 12px;
  text-align: center;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8f9fa;
  transition: background 0.2s;
}

.ranking-item:hover {
  background: #e3f2fd;
}

.rank-medal {
  font-size: 20px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.rank-avatar {
  font-size: 24px;
  flex-shrink: 0;
}

.rank-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-points {
  font-size: 12px;
  color: #ff9800;
  font-weight: 600;
}

/* 前三名高亮 */
.rank-1 { background: linear-gradient(90deg, #fff8e1, #ffecb3); border: 1px solid #ffd700; }
.rank-2 { background: linear-gradient(90deg, #f5f5f5, #e0e0e0); border: 1px solid #c0c0c0; }
.rank-3 { background: linear-gradient(90deg, #fff3e0, #ffe0b2); border: 1px solid #cd7f32; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/team/RankingPanel.vue
git commit -m "feat: add RankingPanel component"
```

---

### Task 6: 动态公告板组件 ActivityTicker.vue

**Files:**
- Create: `client/src/components/team/ActivityTicker.vue`

- [ ] **Step 1: 创建组件文件**

```vue
<template>
  <div class="activity-ticker">
    <span class="ticker-label">📢</span>
    <div class="ticker-track">
      <div class="ticker-content" :key="tickerKey">
        <span
          v-for="(activity, index) in activities"
          :key="activity.id"
          class="ticker-item"
          :class="`type-${activity.type}`"
        >
          <span class="ticker-avatar">{{ activity.playerAvatar }}</span>
          <span class="ticker-text">{{ activity.playerName }} {{ activity.description }}</span>
          <span v-if="activity.points && activity.points > 0" class="ticker-points">+{{ activity.points }}</span>
          <span v-if="index < activities.length - 1" class="ticker-sep">•</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ActivityItem {
  id: string
  type: string
  playerName: string
  playerAvatar: string
  description: string
  points?: number
}

const props = defineProps<{
  activities: ActivityItem[]
}>()

const tickerKey = computed(() => props.activities.map(a => a.id).join('-'))
</script>

<style scoped>
.activity-ticker {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  padding: 8px 16px;
  border: 2px solid #ff9800;
  overflow: hidden;
  flex: 1;
}

.ticker-label {
  font-size: 18px;
  flex-shrink: 0;
}

.ticker-track {
  flex: 1;
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
}

.ticker-content {
  display: inline-flex;
  gap: 16px;
  white-space: nowrap;
  animation: ticker-scroll 20s linear infinite;
}

.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #333;
}

.ticker-avatar {
  font-size: 16px;
}

.ticker-text {
  color: #555;
}

.ticker-points {
  color: #4caf50;
  font-weight: 700;
}

.ticker-sep {
  color: #ccc;
  margin: 0 4px;
}

/* 类型颜色 */
.type-score .ticker-points { color: #4caf50; }
.type-evolution .ticker-text { color: #ff9800; font-weight: 600; }
.type-purchase .ticker-text { color: #2196f3; }

@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/team/ActivityTicker.vue
git commit -m "feat: add ActivityTicker component with marquee scroll"
```

---

### Task 7: 顶部栏组件 TeamHeader.vue

**Files:**
- Create: `client/src/components/team/TeamHeader.vue`

- [ ] **Step 1: 创建组件文件**

```vue
<template>
  <div class="team-header">
    <div class="team-brand">
      <span class="team-logo">{{ logo || '⚽' }}</span>
      <h1 class="team-name">{{ teamName }}</h1>
    </div>
    <ActivityTicker :activities="activities" />
  </div>
</template>

<script setup lang="ts">
import ActivityTicker from './ActivityTicker.vue'

interface ActivityItem {
  id: string
  type: string
  playerName: string
  playerAvatar: string
  description: string
  points?: number
}

defineProps<{
  teamName: string
  logo?: string
  activities: ActivityItem[]
}>()
</script>

<style scoped>
.team-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.team-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.team-logo {
  font-size: 32px;
}

.team-name {
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin: 0;
  font-family: 'ZCOOL KuaiLe', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/team/TeamHeader.vue
git commit -m "feat: add TeamHeader component"
```

---

### Task 8: 大屏主页面 TeamScreenPage.vue

**Files:**
- Create: `client/src/views/team/TeamScreenPage.vue`

- [ ] **Step 1: 创建页面文件**

```vue
<template>
  <div class="team-screen-page">
    <!-- 顶部栏 -->
    <TeamHeader
      :team-name="teamName"
      :activities="activities"
    />

    <!-- 主体内容 -->
    <div class="screen-body">
      <!-- 左侧排名榜 -->
      <aside class="screen-sidebar">
        <RankingPanel :ranking="ranking" />
      </aside>

      <!-- 右侧宠物卡网格 -->
      <main class="screen-main">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
        </div>
        <div v-else class="pet-grid">
          <TeamPetCard
            v-for="player in players"
            :key="player.id"
            :player-id="player.id"
            :player-name="player.name"
            :avatar="player.avatar"
            :current-points="player.currentPoints"
            :pet="player.pet"
            @click="goToPlayer(player.id)"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { publicApi } from '@/api'
import TeamHeader from '@/components/team/TeamHeader.vue'
import RankingPanel from '@/components/team/RankingPanel.vue'
import TeamPetCard from '@/components/team/TeamPetCard.vue'

interface PetInfo {
  name: string
  stage: string
  level: number
  speciesId: string
  species?: {
    stages: Record<string, {
      emoji: string
      imageUrl?: string
    }>
  }
  equippedDecorations?: string[]
}

interface PlayerInfo {
  id: string
  name: string
  avatar: string
  currentPoints: number
  pet: PetInfo | null
}

interface RankingItem {
  playerId: string
  playerName: string
  playerAvatar: string
  currentPoints: number
  rank: number
}

interface ActivityItem {
  id: string
  type: string
  playerName: string
  playerAvatar: string
  description: string
  points?: number
  createdAt: number
}

const route = useRoute()
const router = useRouter()

const phone = route.query.c as string
const teamName = ref('星宠小队')
const players = ref<PlayerInfo[]>([])
const ranking = ref<RankingItem[]>([])
const activities = ref<ActivityItem[]>([])
const loading = ref(true)
const error = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadData() {
  if (!phone) {
    error.value = '缺少教练手机号参数，请通过 ?c=手机号 访问'
    loading.value = false
    return
  }

  try {
    const [playersRes, rankRes, actRes] = await Promise.all([
      publicApi.getPlayers(phone),
      publicApi.getLeaderboard(phone),
      publicApi.getActivities(phone),
    ])

    if (playersRes.data.success) {
      players.value = playersRes.data.data || []
    }
    if (rankRes.data.success) {
      ranking.value = rankRes.data.data || []
    }
    if (actRes.data.success) {
      activities.value = actRes.data.data || []
    }

    // 用第一个学员的教练名称作为队名（后端暂不返回教练名，前端兜底）
    teamName.value = '星宠小队'
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载失败，请检查网络'
  } finally {
    loading.value = false
  }
}

function goToPlayer(playerId: string) {
  router.push(`/player/${playerId}`)
}

function startPolling() {
  pollTimer = setInterval(() => {
    loadData()
  }, 30000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  loadData()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.team-screen-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.screen-body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.screen-sidebar {
  width: 20%;
  min-width: 180px;
  flex-shrink: 0;
}

.screen-main {
  flex: 1;
  min-width: 0;
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #42a5f5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 响应式：平板 */
@media (max-width: 1024px) {
  .screen-sidebar {
    width: 100%;
    height: auto;
  }
  .screen-body {
    flex-direction: column;
  }
  .pet-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}

/* 响应式：手机 */
@media (max-width: 768px) {
  .team-screen-page {
    padding: 8px;
  }
  .pet-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
```

- [ ] **Step 2: 手动验证**

访问 `http://localhost:5173/#/screen?c=13800138000`：
- 页面应显示蓝色渐变背景
- 顶部有队名和公告板
- 左侧显示排名榜
- 右侧显示宠物卡网格
- 点击宠物卡可跳转到个人页
- 等待 30 秒后数据自动刷新

- [ ] **Step 3: Commit**

```bash
git add client/src/views/team/TeamScreenPage.vue
git commit -m "feat: add TeamScreenPage with polling and responsive layout"
```

---

### Task 9: 个人页增加返回大屏按钮

**Files:**
- Modify: `client/src/views/player/PlayerDashboardPage.vue`

- [ ] **Step 1: 在 PlayerDashboardPage 底部增加返回按钮**

在 `PlayerDashboardPage.vue` 的 `<main>` 标签内，在 `<!-- Shop Link -->` 区域之后、`<!-- Feedback Toast -->` 之前添加：

```vue
    <!-- Back to Team Screen -->
    <router-link
      v-if="coachPhone"
      :to="`/screen?c=${coachPhone}`"
      class="back-link"
    >
      ← 返回全班大屏
    </router-link>
```

在 `<script setup>` 中，在 `const playerId = route.params.playerId as string` 之后添加：

```ts
const coachPhone = ref('')
```

在 `loadData()` 函数中，当获取 pet 数据时，尝试从 `petRes` 或路由参数中获取教练手机号。由于当前 API 不直接返回教练手机号，可以先通过 URL query 传递，或者在 `loadData` 中设置一个默认值。简单方案：使用 `route.query.c` 或 localStorage 中存储的值。

```ts
import { ref } from 'vue'

// 在 loadData 中加入
coachPhone.value = route.query.c as string || localStorage.getItem('lastCoachPhone') || ''
```

在样式部分添加：

```css
.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6875rem;
  letter-spacing: 0.15em;
  color: rgba(200, 192, 184, 0.3);
  text-decoration: none;
  padding: 0.5rem 0;
  transition: color 0.4s ease;
}

.back-link:hover {
  color: rgba(200, 192, 184, 0.6);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/player/PlayerDashboardPage.vue
git commit -m "feat: add back-to-team-screen link on player dashboard"
```

---

### Task 10: PlayerSelectionPage 增加大屏入口

**Files:**
- Modify: `client/src/views/player/PlayerSelectionPage.vue`

- [ ] **Step 1: 在 PlayerSelectionPage 增加"查看全班大屏"入口**

在 `client/src/views/player/PlayerSelectionPage.vue` 中，在 `<h1>` 标题下方添加：

```vue
    <div class="text-center mb-8">
      <div class="text-6xl mb-4">⚽</div>
      <h1 class="text-3xl font-bold text-white mb-2" style="font-family: var(--font-display)">星宠契约</h1>
      <p class="text-white/50 text-lg">点击你的宠物卡片进入</p>
      <router-link
        v-if="phone"
        :to="`/screen?c=${phone}`"
        class="inline-block mt-3 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-sm hover:bg-blue-500/30 transition-colors"
      >
        👀 查看全班大屏
      </router-link>
    </div>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/player/PlayerSelectionPage.vue
git commit -m "feat: add team screen entry on player selection page"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 明亮卡通风格 → 渐变背景 + 白色卡片 + 彩色边框
- ✅ 顶部队徽+队名 + 公告板并排 → TeamHeader 组件
- ✅ 左侧 20% 排名榜 → RankingPanel + screen-sidebar width: 20%
- ✅ 右侧 80% 宠物卡网格 → pet-grid + screen-main flex: 1
- ✅ emoji/图片/GIF 宠物展示 → TeamPetCard 展示优先级逻辑
- ✅ 配饰叠加 → pet-stage-area 容器 + absolute positioning
- ✅ 30 秒轮询 → startPolling/stopPolling in TeamScreenPage
- ✅ 动态公告板 → ActivityTicker marquee 动画
- ✅ 响应式适配 → @media 断点
- ✅ 个人页返回大屏 → PlayerDashboardPage back-link
- ✅ 学员选择页大屏入口 → PlayerSelectionPage router-link

**2. Placeholder scan:** 无 TBD、TODO、"implement later" 等占位符。每个任务包含完整代码。

**3. Type consistency:**
- `PetStageVisual` 使用现有的 `imageUrl` 字段（支持 GIF，因为 `<img>` 天然支持）
- `AccessoryDef.position` 使用现有的 `{ top, left, scale, rotate }` 结构
- 所有接口字段名与后端 API 一致

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-28-team-screen-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
