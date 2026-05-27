# 星宠契约 B/S 版本 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将星宠契约从本地 IndexedDB 应用重构为 B/S 多租户平台，支持管理员、教练、学生三种角色，包含 FIFA 风格球员卡与六维雷达图。

**Architecture:** Monorepo（client + server + shared），Express + Prisma 后端，Vue 3 前端，PostgreSQL 数据库，Docker Compose 部署。

**Tech Stack:** TypeScript, Vue 3 + Vite + Pinia + Tailwind CSS, Express, Prisma ORM, PostgreSQL, JWT, Docker

---

## 文件结构总览

```
pet-motivator-bs/
├── shared/
│   └── types.ts                        # 前后端共享类型
├── server/
│   ├── prisma/
│   │   ├── schema.prisma               # 数据库模型
│   │   └── seed.ts                     # 种子数据（足球模板 + 管理员）
│   ├── src/
│   │   ├── index.ts                    # Express 入口
│   │   ├── config.ts                   # 环境变量配置
│   │   ├── middleware/
│   │   │   ├── auth.ts                 # JWT 验证中间件
│   │   │   └── errorHandler.ts         # 全局错误处理
│   │   ├── routes/
│   │   │   ├── admin.ts                # /api/admin/*
│   │   │   ├── coach.ts                # /api/coach/*
│   │   │   └── player.ts               # /api/player/*
│   │   └── services/
│   │       ├── auth.ts                 # 密码哈希 + JWT
│   │       ├── pet.ts                  # 宠物成长、离线衰减
│   │       ├── score.ts                # 积分 + 维度 + 指标 + 奖励
│   │       ├── shop.ts                 # 商店 + 背包
│   │       └── importService.ts        # 数据导入
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts                # API 调用封装（axios）
│   │   ├── components/
│   │   │   ├── PetCard.vue             # 宠物卡片（复用原项目）
│   │   │   ├── PetDisplay.vue          # 宠物展示动画
│   │   │   ├── RadarChart.vue          # 六维雷达图（Canvas）
│   │   │   ├── FifaPlayerCard.vue      # FIFA 风格球员卡
│   │   │   ├── ScoreButton.vue         # 快速记分按钮
│   │   │   └── ModeSwitch.vue          # 教练模式开关
│   │   ├── views/
│   │   │   ├── admin/
│   │   │   │   ├── AdminLoginPage.vue
│   │   │   │   ├── AdminDashboardPage.vue
│   │   │   │   └── AdminCoachesPage.vue
│   │   │   ├── coach/
│   │   │   │   ├── CoachLoginPage.vue
│   │   │   │   ├── CoachDashboardPage.vue
│   │   │   │   ├── CoachScorePage.vue       # 快速记分
│   │   │   │   ├── CoachScoreConfigPage.vue # 维度/指标配置
│   │   │   │   ├── CoachPlayersPage.vue     # 球员管理
│   │   │   │   ├── CoachPlayerCardsPage.vue # 球员卡总览
│   │   │   │   └── CoachShopPage.vue
│   │   │   └── player/
│   │   │       ├── PlayerSelectionPage.vue
│   │   │       ├── PlayerDashboardPage.vue
│   │   │       └── PlayerShopPage.vue
│   │   ├── stores/
│   │   │   ├── auth.ts
│   │   │   ├── pets.ts
│   │   │   ├── players.ts
│   │   │   ├── scores.ts
│   │   │   └── shop.ts
│   │   ├── router/
│   │   │   └── index.ts
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

### Task 1: Monorepo 项目脚手架

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/tailwind.config.js`, `client/index.html`
- Create: `shared/types.ts`

- [ ] **Step 1: 创建 shared 类型定义**

从原项目 `D:\claudeCode\pet-motivator\src\types\index.ts` 复制类型，新增维度和教练相关类型。

```typescript
// shared/types.ts

// =============== 枚举（复用原项目） ===============
export type PetStage = 'egg' | 'baby' | 'teen' | 'adult' | 'rare'
export type PetCategory = 'dog' | 'cat' | 'dragon' | 'fantasy' | 'ocean' | 'cute'
export type ScoreType = 'earn' | 'spend' | 'bonus' | 'penalty' | 'system'
export type OperatorType = 'coach' | 'system'
export type ShopItemType = 'food' | 'decoration' | 'special'
export type AccessorySlotType = 'head' | 'neck' | 'body' | 'back' | 'face'
export type PlayerModeType = 'open' | 'display'

// =============== 宠物视觉（复用） ===============
export interface PetStageVisual {
  emoji: string
  imageUrl?: string
  scale: number
  animation: string
  filter?: string
  label: string
}

export interface PetSpecies {
  id: string
  name: string
  category: PetCategory
  description: string
  emoji: string
  backgroundColor: string
  accentColor: string
  stages: Record<PetStage, PetStageVisual>
}

export interface AccessoryDef {
  id: string
  name: string
  slot: AccessorySlotType
  emoji: string
  imageUrl?: string
  position: { top: string; left: string; scale: number; rotate?: number }
}

export interface PetBackgroundDef {
  id: string
  name: string
  cssGradient: string
  imageUrl?: string
  thumbnailColor: string
}

// =============== 数据实体（新增 coachId + 扩展） ===============
export interface Admin {
  id: string
  username: string
  passwordHash: string
  createdAt: number
}

export interface Coach {
  id: string
  phone: string
  passwordHash: string
  name: string
  school: string
  isActive: boolean
  trialUntil: number
  authorizedUntil: number
  playerMode: PlayerModeType
  createdAt: number
  updatedAt: number
}

export interface Player {
  id: string
  coachId: string
  name: string
  avatar: string
  currentPoints: number
  lifetimePoints: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface Pet {
  id: string
  playerId: string
  speciesId: string
  name: string
  stage: PetStage
  carePoints: number
  level: number
  hunger: number
  mood: number
  currentSkin: string
  equippedDecorations: string[]
  lastDecayAt: number
  lastFedAt: number
  lastPlayedAt: number
  createdAt: number
  evolvedAt: number
}

export interface ScoreDimension {
  id: string
  coachId: string
  name: string
  icon: string
  sortOrder: number
  isActive: boolean
}

export interface ScoreIndicator {
  id: string
  dimensionId: string
  name: string
  criteria: string
  defaultPoints: number
  dailyLimit: number
  isActive: boolean
  sortOrder: number
}

export interface ScoreRecord {
  id: string
  coachId: string
  playerId: string
  ruleId: string | null
  indicatorId: string | null
  sessionId: string | null
  points: number
  type: ScoreType
  reason: string
  operatorType: OperatorType
  operatorId: string
  createdAt: number
}

export interface BonusRule {
  id: string
  coachId: string
  name: string
  points: number
  frequency: 'weekly' | 'monthly'
  criteria: string
  isActive: boolean
}

export interface ShopItem {
  id: string
  coachId: string | null
  name: string
  description: string
  type: ShopItemType
  price: number
  effect: {
    hunger?: number
    mood?: number
    experience?: number
    decoration?: string
  }
  imageClass: string
  stock: number
  isActive: boolean
  sortOrder: number
  createdAt: number
}

export interface PlayerInventory {
  id: string
  playerId: string
  itemId: string
  quantity: number
  isEquipped: boolean
  acquiredAt: number
}

// =============== API 响应包装 ===============
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface LoginResponse {
  token: string
  coach?: Omit<Coach, 'passwordHash'>
  admin?: Omit<Admin, 'passwordHash'>
}

// =============== 请求体类型 ===============
export interface CoachRegisterInput {
  phone: string
}

export interface CoachLoginInput {
  phone: string
  password: string
}

export interface AdminLoginInput {
  username: string
  password: string
}

export interface CreatePlayerInput {
  name: string
  avatar: string
}

export interface ScoreInput {
  playerId: string
  indicatorId?: string | null
  points: number
  type: ScoreType
  reason: string
  sessionId?: string | null
}

export interface CreateDimensionInput {
  name: string
  icon: string
  sortOrder?: number
}

export interface CreateIndicatorInput {
  dimensionId: string
  name: string
  criteria: string
  defaultPoints: number
  dailyLimit: number
  sortOrder?: number
}

export interface PlayerStats {
  playerId: string
  playerName: string
  avatar: string
  overall: number
  dimensions: {
    dimensionId: string
    dimensionName: string
    icon: string
    score: number
    maxScore: number
  }[]
  totalPoints: number
  weeklyPoints: number
  todayPoints: number
  rank: number
}
```

- [ ] **Step 2: 初始化 server/package.json 并安装依赖**

```bash
cd /d/claudeCode/pet-motivator-bs/server
npm init -y
npm install express cors jsonwebtoken bcryptjs
npm install -D typescript @types/express @types/cors @types/jsonwebtoken @types/bcryptjs tsx prisma @prisma/client
```

```json
{
  "name": "pet-motivator-bs-server",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "tsx": "^4.19.0",
    "prisma": "^5.22.0"
  }
}
```

```json
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 初始化 client 项目**

```bash
cd /d/claudeCode/pet-motivator-bs/client
npm create vite@latest . -- --template vue-ts
# 选择 Vue + TypeScript
npm install
npm install pinia vue-router axios
npm install -D tailwindcss @tailwindcss/vite
```

配置 `vite.config.ts`（alias + proxy）：

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

配置 `client/index.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>星宠契约</title>
  </head>
  <body class="bg-gray-50">
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: 提交**

```bash
cd /d/claudeCode/pet-motivator-bs
git init
git add shared/ server/ client/
git commit -m "feat: monorepo scaffolding with shared types"
```

---

### Task 2: Prisma 数据库 Schema

**Files:**
- Create: `server/prisma/schema.prisma`

- [ ] **Step 1: 编写完整 Prisma Schema**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Admin {
  id           String @id @default(uuid())
  username     String @unique
  passwordHash String
  createdAt    BigInt
}

model Coach {
  id              String @id @default(uuid())
  phone           String @unique
  passwordHash    String
  name            String
  school          String @default("")
  isActive        Boolean @default(true)
  trialUntil      BigInt
  authorizedUntil BigInt
  playerMode      String @default("display") // "open" | "display"
  createdAt       BigInt
  updatedAt       BigInt

  players          Player[]
  scoreRecords     ScoreRecord[]
  scoreDimensions  ScoreDimension[]
  bonusRules       BonusRule[]
  shopItems        ShopItem[]
}

model Player {
  id             String @id @default(uuid())
  coachId        String
  name           String
  avatar         String @default("😊")
  currentPoints  Int @default(0)
  lifetimePoints Int @default(0)
  isActive       Boolean @default(true)
  createdAt      BigInt
  updatedAt      BigInt

  coach      Coach @relation(fields: [coachId], references: [id], onDelete: Cascade)
  pet        Pet?
  scoreRecords ScoreRecord[]
  inventory  PlayerInventory[]
}

model Pet {
  id                  String @id @default(uuid())
  playerId            String @unique
  speciesId           String
  name                String
  stage               String @default("egg")
  carePoints          Int @default(0)
  level               Int @default(1)
  hunger              Int @default(100)
  mood                Int @default(100)
  currentSkin         String @default("default")
  equippedDecorations String[] @default([])
  lastDecayAt         BigInt
  lastFedAt           BigInt
  lastPlayedAt        BigInt @default(0)
  createdAt           BigInt
  evolvedAt           BigInt

  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)
}

model ScoreDimension {
  id        String @id @default(uuid())
  coachId   String
  name      String
  icon      String @default("⭐")
  sortOrder Int @default(0)
  isActive  Boolean @default(true)

  coach      Coach @relation(fields: [coachId], references: [id], onDelete: Cascade)
  indicators ScoreIndicator[]
}

model ScoreIndicator {
  id            String @id @default(uuid())
  dimensionId   String
  name          String
  criteria      String @default("")
  defaultPoints Int @default(5)
  dailyLimit    Int @default(20)
  isActive      Boolean @default(true)
  sortOrder     Int @default(0)

  dimension ScoreDimension @relation(fields: [dimensionId], references: [id], onDelete: Cascade)
}

model ScoreRecord {
  id           String @id @default(uuid())
  coachId      String
  playerId     String
  ruleId       String?
  indicatorId  String?
  sessionId    String?
  points       Int
  type         String // earn | spend | bonus | penalty | system
  reason       String
  operatorType String @default("coach")
  operatorId   String @default("system")
  createdAt    BigInt

  coach  Coach  @relation(fields: [coachId], references: [id], onDelete: Cascade)
  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@index([playerId, createdAt])
}

model BonusRule {
  id        String @id @default(uuid())
  coachId   String
  name      String
  points    Int
  frequency String // "weekly" | "monthly"
  criteria  String @default("")
  isActive  Boolean @default(true)

  coach Coach @relation(fields: [coachId], references: [id], onDelete: Cascade)
}

model ShopItem {
  id          String @id @default(uuid())
  coachId     String?
  name        String
  description String @default("")
  type        String // food | decoration | special
  price       Int
  effect      Json
  imageClass  String @default("")
  stock       Int @default(999)
  isActive    Boolean @default(true)
  sortOrder   Int @default(0)
  createdAt   BigInt

  coach Coach? @relation(fields: [coachId], references: [id], onDelete: SetNull)
}

model PlayerInventory {
  id         String @id @default(uuid())
  playerId   String
  itemId     String
  quantity   Int @default(1)
  isEquipped Boolean @default(false)
  acquiredAt BigInt

  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@index([playerId, itemId])
}

model PetSpeciesDef {
  id              String @id
  name            String
  category        String
  description     String @default("")
  emoji           String
  backgroundColor String
  accentColor     String
  stages          Json
}

model AccessoryDef {
  id       String @id
  name     String
  slot     String
  emoji    String
  imageUrl String?
  position Json
}

model PetBackgroundDef {
  id             String @id
  name           String
  cssGradient    String
  imageUrl       String?
  thumbnailColor String
}

model CustomData {
  id         String @id @default(uuid())
  coachId    String?
  type       String
  data       Json
  importedAt BigInt
}
```

- [ ] **Step 2: 生成 Prisma Client 并运行初始迁移**

```bash
cd /d/claudeCode/pet-motivator-bs/server
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pet-motivator"' > .env
npx prisma generate
# 迁移将在 Task 13 (Docker) 后执行
```

- [ ] **Step 3: 提交**

```bash
git add server/prisma/schema.prisma server/package.json server/tsconfig.json
git commit -m "feat: prisma schema with 14 models"
```

---

### Task 3: 后端认证服务

**Files:**
- Create: `server/src/services/auth.ts`
- Create: `server/src/config.ts`

- [ ] **Step 1: 编写 config.ts**

```typescript
// server/src/config.ts
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'pet-motivator-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  superAdminUsername: process.env.SUPER_ADMIN_USERNAME || 'admin',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || 'admin123',
  trialDays: 7,
  defaultPasswordDigits: 6,
}

export function getDefaultPassword(phone: string): string {
  return phone.slice(-config.defaultPasswordDigits)
}
```

- [ ] **Step 2: 编写 auth 服务**

```typescript
// server/src/services/auth.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: { id: string; role: 'admin' | 'coach' }): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

export function verifyToken(token: string): { id: string; role: 'admin' | 'coach' } | null {
  try {
    return jwt.verify(token, config.jwtSecret) as { id: string; role: 'admin' | 'coach' }
  } catch {
    return null
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add server/src/config.ts server/src/services/auth.ts
git commit -m "feat: auth service with bcrypt + JWT"
```

---

### Task 4: 后端中间件

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: 编写 JWT 中间件**

```typescript
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/auth'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: 'admin' | 'coach'
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' })
  }

  const payload = verifyToken(header.slice(7))
  if (!payload) {
    return res.status(401).json({ success: false, error: '令牌无效或已过期' })
  }

  req.userId = payload.id
  req.userRole = payload.role
  next()
}

export function requireRole(role: 'admin' | 'coach') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.userRole !== role) {
      return res.status(403).json({ success: false, error: '权限不足' })
    }
    next()
  }
}
```

- [ ] **Step 2: 编写错误处理器**

```typescript
// server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err.message)
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
  })
}
```

- [ ] **Step 3: 编写 Express 入口**

```typescript
// server/src/index.ts
import express from 'express'
import cors from 'cors'
import { config } from './config'
import { errorHandler } from './middleware/errorHandler'
import { adminRouter } from './routes/admin'
import { coachRouter } from './routes/coach'
import { playerRouter } from './routes/player'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/admin', adminRouter)
app.use('/api/coach', coachRouter)
app.use('/api/player', playerRouter)

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`)
})

export default app
```

- [ ] **Step 4: 验证服务器能启动**

```bash
cd /d/claudeCode/pet-motivator-bs/server
npx tsx src/index.ts
# Expected: "Server running on http://localhost:3000"
# Ctrl+C to stop
```

- [ ] **Step 5: 提交**

```bash
git add server/src/
git commit -m "feat: express server with JWT auth middleware"
```

---

### Task 5: Admin API 路由

**Files:**
- Create: `server/src/routes/admin.ts`

- [ ] **Step 1: 编写 Admin 路由**

```typescript
// server/src/routes/admin.ts
import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { hashPassword, verifyPassword, signToken } from '../services/auth'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { config, getDefaultPassword } from '../config'

const db = new PrismaClient()
export const adminRouter = Router()

// 管理员登录
adminRouter.post('/login', async (req: AuthRequest, res: Response) => {
  const { username, password } = req.body

  if (username === config.superAdminUsername && password === config.superAdminPassword) {
    // 首次登录自动创建超级管理员
    let admin = await db.admin.findUnique({ where: { username } })
    if (!admin) {
      admin = await db.admin.create({
        data: {
          username,
          passwordHash: await hashPassword(password),
          createdAt: Date.now(),
        },
      })
    }
    const token = signToken({ id: admin.id, role: 'admin' })
    return res.json({ success: true, data: { token, admin: { id: admin.id, username: admin.username } } })
  }

  const admin = await db.admin.findUnique({ where: { username } })
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return res.status(401).json({ success: false, error: '账号或密码错误' })
  }

  const token = signToken({ id: admin.id, role: 'admin' })
  res.json({ success: true, data: { token, admin: { id: admin.id, username: admin.username } } })
})

// 获取教练列表（含统计）
adminRouter.get('/coaches', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const coaches = await db.coach.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { players: true } },
    },
  })

  const data = await Promise.all(
    coaches.map(async (c) => {
      const playerIds = (await db.player.findMany({ where: { coachId: c.id }, select: { id: true } })).map(p => p.id)
      const totalScores = await db.scoreRecord.aggregate({
        where: { coachId: c.id },
        _sum: { points: true },
      })
      return {
        id: c.id,
        phone: c.phone,
        name: c.name,
        school: c.school,
        isActive: c.isActive,
        trialUntil: Number(c.trialUntil),
        authorizedUntil: Number(c.authorizedUntil),
        playerMode: c.playerMode,
        playerCount: c._count.players,
        totalScores: totalScores._sum.points || 0,
        createdAt: Number(c.createdAt),
      }
    })
  )

  res.json({ success: true, data })
})

// 创建教练账号
adminRouter.post('/coaches', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { phone } = req.body
  if (!phone) return res.status(400).json({ success: false, error: '手机号必填' })

  const existing = await db.coach.findUnique({ where: { phone } })
  if (existing) return res.status(400).json({ success: false, error: '该手机号已注册' })

  const now = Date.now()
  const trialUntil = now + config.trialDays * 24 * 3600 * 1000

  const coach = await db.coach.create({
    data: {
      phone,
      passwordHash: await hashPassword(getDefaultPassword(phone)),
      name: phone,
      trialUntil,
      authorizedUntil: trialUntil,
      createdAt: now,
      updatedAt: now,
    },
  })

  res.json({
    success: true,
    data: { id: coach.id, phone: coach.phone, name: coach.name, trialUntil: Number(coach.trialUntil) },
  })
})

// 更新教练状态
adminRouter.put('/coaches/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { isActive, authorizedUntil } = req.body
  const now = Date.now()

  const coach = await db.coach.update({
    where: { id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(authorizedUntil !== undefined && { authorizedUntil, updatedAt: now }),
    },
    select: { id: true, phone: true, isActive: true, authorizedUntil: true },
  })

  res.json({ success: true, data: { ...coach, authorizedUntil: Number(coach.authorizedUntil) } })
})

// 全局统计
adminRouter.get('/stats', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const [coachCount, playerCount, petCount] = await Promise.all([
    db.coach.count(),
    db.player.count(),
    db.pet.count(),
  ])

  res.json({
    success: true,
    data: { coachCount, playerCount, petCount },
  })
})

// 批量导入宠物物种
adminRouter.post('/pet-species', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { species } = req.body
  if (!Array.isArray(species)) return res.status(400).json({ success: false, error: 'species 必须是数组' })

  for (const s of species) {
    await db.petSpeciesDef.upsert({
      where: { id: s.id },
      create: s,
      update: s,
    })
  }

  res.json({ success: true, data: { count: species.length } })
})

// 批量导入配饰
adminRouter.post('/accessories', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { accessories } = req.body
  if (!Array.isArray(accessories)) return res.status(400).json({ success: false, error: 'accessories 必须是数组' })

  for (const a of accessories) {
    await db.accessoryDef.upsert({
      where: { id: a.id },
      create: a,
      update: a,
    })
  }

  res.json({ success: true, data: { count: accessories.length } })
})

// 批量导入背景
adminRouter.post('/backgrounds', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { backgrounds } = req.body
  if (!Array.isArray(backgrounds)) return res.status(400).json({ success: false, error: 'backgrounds 必须是数组' })

  for (const b of backgrounds) {
    await db.petBackgroundDef.upsert({
      where: { id: b.id },
      create: b,
      update: b,
    })
  }

  res.json({ success: true, data: { count: backgrounds.length } })
})
```

- [ ] **Step 2: 测试 Admin 登录**

```bash
# 启动服务器后
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Expected: {"success":true,"data":{"token":"...","admin":{...}}}
```

- [ ] **Step 3: 提交**

```bash
git add server/src/routes/admin.ts server/src/index.ts
git commit -m "feat: admin API routes (login, coaches CRUD, import, stats)"
```

---

### Task 6: Coach API 路由

**Files:**
- Create: `server/src/routes/coach.ts`

- [ ] **Step 1: 编写 Coach 路由**

```typescript
// server/src/routes/coach.ts
import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { hashPassword, verifyPassword, signToken } from '../services/auth'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { config, getDefaultPassword } from '../config'
import { generateId } from '../utils/id'

const db = new PrismaClient()
export const coachRouter = Router()

function coachId(req: AuthRequest): string {
  return req.userId!
}

// 教练自注册
coachRouter.post('/register', async (req: AuthRequest, res: Response) => {
  const { phone } = req.body
  if (!phone || !/^\d{11}$/.test(phone)) {
    return res.status(400).json({ success: false, error: '请输入有效的11位手机号' })
  }

  const existing = await db.coach.findUnique({ where: { phone } })
  if (existing) return res.status(400).json({ success: false, error: '该手机号已注册' })

  const now = Date.now()
  const trialUntil = now + config.trialDays * 24 * 3600 * 1000

  const coach = await db.coach.create({
    data: {
      phone,
      passwordHash: await hashPassword(getDefaultPassword(phone)),
      name: phone,
      trialUntil,
      authorizedUntil: trialUntil,
      createdAt: now,
      updatedAt: now,
    },
  })

  res.json({ success: true, data: { id: coach.id, phone: coach.phone, name: coach.name } })
})

// 教练登录
coachRouter.post('/login', async (req: AuthRequest, res: Response) => {
  const { phone, password } = req.body

  const coach = await db.coach.findUnique({ where: { phone } })
  if (!coach || !(await verifyPassword(password, coach.passwordHash))) {
    return res.status(401).json({ success: false, error: '手机号或密码错误' })
  }

  if (!coach.isActive) {
    return res.status(403).json({ success: false, error: '账号已被停用，请联系管理员' })
  }

  const now = Date.now()
  if (now > coach.authorizedUntil) {
    return res.status(403).json({ success: false, error: '授权已过期，请联系管理员续期' })
  }

  const token = signToken({ id: coach.id, role: 'coach' })
  res.json({
    success: true,
    data: {
      token,
      coach: {
        id: coach.id,
        phone: coach.phone,
        name: coach.name,
        school: coach.school,
        playerMode: coach.playerMode,
        trialUntil: Number(coach.trialUntil),
        authorizedUntil: Number(coach.authorizedUntil),
      },
    },
  })
})

// 修改密码
coachRouter.put('/password', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body
  const coach = await db.coach.findUnique({ where: { id: coachId(req) } })
  if (!coach || !(await verifyPassword(oldPassword, coach.passwordHash))) {
    return res.status(400).json({ success: false, error: '原密码错误' })
  }

  await db.coach.update({
    where: { id: coachId(req) },
    data: { passwordHash: await hashPassword(newPassword), updatedAt: Date.now() },
  })

  res.json({ success: true, message: '密码修改成功' })
})

// ========== 球员管理 ==========

coachRouter.get('/players', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const players = await db.player.findMany({
    where: { coachId: coachId(req) },
    orderBy: { createdAt: 'asc' },
    include: { pet: true },
  })

  const data = players.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    currentPoints: p.currentPoints,
    lifetimePoints: p.lifetimePoints,
    isActive: p.isActive,
    pet: p.pet || null,
    createdAt: Number(p.createdAt),
  }))

  res.json({ success: true, data })
})

coachRouter.post('/players', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, avatar } = req.body
  const now = Date.now()
  const player = await db.player.create({
    data: {
      coachId: coachId(req),
      name,
      avatar: avatar || '😊',
      createdAt: now,
      updatedAt: now,
    },
  })

  res.json({ success: true, data: player })
})

coachRouter.put('/players/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { name, avatar, isActive } = req.body

  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const updated = await db.player.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(avatar && { avatar }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: Date.now(),
    },
  })

  res.json({ success: true, data: updated })
})

coachRouter.delete('/players/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  // 级联删除：宠物、记录、背包
  await db.pet.deleteMany({ where: { playerId: id } })
  await db.scoreRecord.deleteMany({ where: { playerId: id } })
  await db.playerInventory.deleteMany({ where: { playerId: id } })
  await db.player.delete({ where: { id } })

  res.json({ success: true, message: '删除成功' })
})

// ========== 记分 ==========

coachRouter.post('/scores', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { playerId, indicatorId, points, type, reason, sessionId } = req.body

  const player = await db.player.findFirst({ where: { id: playerId, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  // 检查日上限
  if (indicatorId) {
    const indicator = await db.scoreIndicator.findUnique({ where: { id: indicatorId } })
    if (indicator) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayCount = await db.scoreRecord.aggregate({
        where: {
          playerId,
          indicatorId,
          createdAt: { gte: todayStart.getTime() },
        },
        _sum: { points: true },
      })
      const todayPoints = todayCount._sum.points || 0
      if (todayPoints + points > indicator.dailyLimit) {
        return res.status(400).json({
          success: false,
          error: `今日该指标已达上限 (${todayPoints}/${indicator.dailyLimit})`,
        })
      }
    }
  }

  const now = Date.now()
  const record = await db.scoreRecord.create({
    data: {
      coachId: coachId(req),
      playerId,
      ruleId: null,
      indicatorId,
      sessionId,
      points,
      type,
      reason,
      operatorType: 'coach',
      operatorId: coachId(req),
      createdAt: now,
    },
  })

  // 更新球员积分
  await db.player.update({
    where: { id: playerId },
    data: {
      currentPoints: { increment: points },
      lifetimePoints: points > 0 ? { increment: points } : undefined,
      updatedAt: now,
    },
  })

  res.json({ success: true, data: record })
})

coachRouter.get('/scores/:playerId', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const records = await db.scoreRecord.findMany({
    where: { playerId, coachId: coachId(req) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  res.json({ success: true, data: records.map(r => ({ ...r, createdAt: Number(r.createdAt) })) })
})

// ========== 球员统计（含维度分数） ==========

coachRouter.get('/player-stats/:playerId', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const player = await db.player.findFirst({ where: { id: playerId, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const dimensions = await db.scoreDimension.findMany({
    where: { coachId: coachId(req), isActive: true },
    include: { indicators: { where: { isActive: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0)

  const [todayScores, weekScores] = await Promise.all([
    db.scoreRecord.aggregate({ where: { playerId, createdAt: { gte: todayStart.getTime() } }, _sum: { points: true } }),
    db.scoreRecord.aggregate({ where: { playerId, createdAt: { gte: weekStart.getTime() } }, _sum: { points: true } }),
  ])

  const dimStats = await Promise.all(
    dimensions.map(async (dim) => {
      const indicatorIds = dim.indicators.map(i => i.id)
      const total = await db.scoreRecord.aggregate({
        where: { playerId, indicatorId: { in: indicatorIds } },
        _sum: { points: true },
      })
      const maxScore = dim.indicators.reduce((sum, i) => sum + i.dailyLimit * 7, 0)
      const score = total._sum.points || 0
      return {
        dimensionId: dim.id,
        dimensionName: dim.name,
        icon: dim.icon,
        score: Math.min(99, Math.round((score / Math.max(1, maxScore)) * 99)),
        maxScore,
      }
    })
  )

  const overall = dimStats.length > 0
    ? Math.round(dimStats.reduce((s, d) => s + d.score, 0) / dimStats.length)
    : 0

  // 排名
  const allPlayers = await db.player.findMany({ where: { coachId: coachId(req) }, select: { id: true, currentPoints: true }, orderBy: { currentPoints: 'desc' } })
  const rank = allPlayers.findIndex(p => p.id === playerId) + 1

  res.json({
    success: true,
    data: {
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      overall,
      dimensions: dimStats,
      totalPoints: player.currentPoints,
      lifetimePoints: player.lifetimePoints,
      todayPoints: todayScores._sum.points || 0,
      weeklyPoints: weekScores._sum.points || 0,
      rank,
    },
  })
})

// ========== 维度 & 指标 CRUD ==========

coachRouter.get('/dimensions', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const dimensions = await db.scoreDimension.findMany({
    where: { coachId: coachId(req) },
    include: { indicators: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  })
  res.json({ success: true, data: dimensions })
})

coachRouter.post('/dimensions', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { name, icon, sortOrder } = req.body
  const dim = await db.scoreDimension.create({
    data: { coachId: coachId(req), name, icon: icon || '⭐', sortOrder: sortOrder || 0 },
  })
  res.json({ success: true, data: dim })
})

coachRouter.put('/dimensions/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { name, icon, sortOrder, isActive } = req.body
  const dim = await db.scoreDimension.findFirst({ where: { id, coachId: coachId(req) } })
  if (!dim) return res.status(404).json({ success: false, error: '维度不存在' })

  const updated = await db.scoreDimension.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(icon && { icon }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  res.json({ success: true, data: updated })
})

coachRouter.delete('/dimensions/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  await db.scoreIndicator.deleteMany({ where: { dimensionId: id } })
  await db.scoreDimension.deleteMany({ where: { id, coachId: coachId(req) } })
  res.json({ success: true, message: '删除成功' })
})

coachRouter.post('/indicators', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { dimensionId, name, criteria, defaultPoints, dailyLimit, sortOrder } = req.body
  const dim = await db.scoreDimension.findFirst({ where: { id: dimensionId, coachId: coachId(req) } })
  if (!dim) return res.status(404).json({ success: false, error: '维度不存在' })

  const indicator = await db.scoreIndicator.create({
    data: {
      dimensionId,
      name,
      criteria: criteria || '',
      defaultPoints: defaultPoints || 5,
      dailyLimit: dailyLimit || 20,
      sortOrder: sortOrder || 0,
    },
  })
  res.json({ success: true, data: indicator })
})

coachRouter.put('/indicators/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { name, criteria, defaultPoints, dailyLimit, isActive, sortOrder } = req.body
  const indicator = await db.scoreIndicator.findUnique({ where: { id } })
  if (!indicator) return res.status(404).json({ success: false, error: '指标不存在' })

  const updated = await db.scoreIndicator.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(criteria !== undefined && { criteria }),
      ...(defaultPoints !== undefined && { defaultPoints }),
      ...(dailyLimit !== undefined && { dailyLimit }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  })
  res.json({ success: true, data: updated })
})

coachRouter.delete('/indicators/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  await db.scoreIndicator.deleteMany({ where: { id } })
  res.json({ success: true, message: '删除成功' })
})

// ========== 奖励规则 ==========

coachRouter.get('/bonus-rules', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const rules = await db.bonusRule.findMany({ where: { coachId: coachId(req) } })
  res.json({ success: true, data: rules })
})

coachRouter.put('/bonus-rules/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { name, points, frequency, criteria, isActive } = req.body
  const updated = await db.bonusRule.update({
    where: { id },
    data: { ...(name && { name }), ...(points !== undefined && { points }), ...(frequency && { frequency }), ...(criteria && { criteria }), ...(isActive !== undefined && { isActive }) },
  })
  res.json({ success: true, data: updated })
})

// ========== 模式开关 ==========

coachRouter.get('/mode', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const coach = await db.coach.findUnique({ where: { id: coachId(req) }, select: { playerMode: true } })
  res.json({ success: true, data: { playerMode: coach?.playerMode || 'display' } })
})

coachRouter.put('/mode', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { playerMode } = req.body
  if (!['open', 'display'].includes(playerMode)) {
    return res.status(400).json({ success: false, error: '无效的模式值' })
  }
  await db.coach.update({ where: { id: coachId(req) }, data: { playerMode, updatedAt: Date.now() } })
  res.json({ success: true, data: { playerMode } })
})

// ========== 快捷链接 ==========

coachRouter.get('/players/:id/quick-link', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const player = await db.player.findFirst({ where: { id, coachId: coachId(req) } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const coach = await db.coach.findUnique({ where: { id: coachId(req) }, select: { phone: true } })
  const link = `/join?c=${coach!.phone}&p=${id}`

  res.json({ success: true, data: { link, playerName: player.name } })
})

// ========== 商店 ==========

coachRouter.get('/shop-items', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const items = await db.shopItem.findMany({
    where: { OR: [{ coachId: coachId(req) }, { coachId: null }] },
    orderBy: { sortOrder: 'asc' },
  })
  res.json({ success: true, data: items.map(i => ({ ...i, effect: JSON.parse(JSON.stringify(i.effect)) })) })
})

coachRouter.put('/shop-items/:id', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const item = await db.shopItem.findFirst({ where: { id, coachId: coachId(req) } })
  if (!item) return res.status(404).json({ success: false, error: '物品不存在' })

  const { name, description, price, stock, isActive } = req.body
  const updated = await db.shopItem.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price }),
      ...(stock !== undefined && { stock }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  res.json({ success: true, data: { ...updated, effect: JSON.parse(JSON.stringify(updated.effect)) } })
})

// ========== 数据导入 ==========

coachRouter.post('/import', authenticate, requireRole('coach'), async (req: AuthRequest, res: Response) => {
  const { type, data } = req.body
  if (!type || !data) return res.status(400).json({ success: false, error: 'type 和 data 必填' })

  await db.customData.create({
    data: { coachId: coachId(req), type, data, importedAt: Date.now() },
  })

  res.json({ success: true, message: '导入成功' })
})
```

- [ ] **Step 2: 创建 ID 生成工具**

```typescript
// server/src/utils/id.ts
import { randomUUID } from 'crypto'

export function generateId(): string {
  return randomUUID()
}
```

- [ ] **Step 3: 提交**

```bash
git add server/src/routes/coach.ts server/src/utils/
git commit -m "feat: coach API routes (register, login, players, scores, dimensions, shop, mode)"
```

---

### Task 7: Player API 路由

**Files:**
- Create: `server/src/routes/player.ts`

- [ ] **Step 1: 编写 Player 路由**

```typescript
// server/src/routes/player.ts
import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'

const db = new PrismaClient()
export const playerRouter = Router()

// 获取宠物
playerRouter.get('/:playerId/pet', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  // 离线衰减计算
  const hours = (Date.now() - Number(pet.lastDecayAt)) / 3600000
  if (hours > 0) {
    pet.hunger = Math.max(0, pet.hunger - Math.floor(hours * 1.2))
    pet.mood = Math.max(0, pet.mood - Math.floor(hours * 0.8))
    pet.lastDecayAt = BigInt(Date.now())
    await db.pet.update({
      where: { playerId },
      data: { hunger: pet.hunger, mood: pet.mood, lastDecayAt: pet.lastDecayAt },
    })
  }

  const speciesDef = await db.petSpeciesDef.findUnique({ where: { id: pet.speciesId } })

  res.json({
    success: true,
    data: {
      ...pet,
      lastDecayAt: Number(pet.lastDecayAt),
      lastFedAt: Number(pet.lastFedAt),
      lastPlayedAt: Number(pet.lastPlayedAt),
      createdAt: Number(pet.createdAt),
      evolvedAt: Number(pet.evolvedAt),
      species: speciesDef ? { ...speciesDef, stages: JSON.parse(JSON.stringify(speciesDef.stages)) } : null,
    },
  })
})

// 获取模式
playerRouter.get('/:playerId/mode', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const player = await db.player.findUnique({ where: { id: playerId }, include: { coach: { select: { playerMode: true } } } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  res.json({ success: true, data: { playerMode: player.coach.playerMode } })
})

// 喂食
playerRouter.post('/:playerId/pet/feed', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const player = await db.player.findUnique({ where: { id: playerId }, include: { coach: { select: { playerMode: true } } } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const FEEDING_COST = 5
  const FEEDING_CARE_POINTS = 3
  const HUNGER_GAIN = 25

  if (player.currentPoints < FEEDING_COST) {
    return res.status(400).json({ success: false, error: `积分不足，需要 ${FEEDING_COST} 分` })
  }

  const now = Date.now()
  pet.hunger = Math.min(100, pet.hunger + HUNGER_GAIN)
  pet.carePoints += FEEDING_CARE_POINTS
  pet.lastFedAt = BigInt(now)

  // 检查进化
  const oldStage = pet.stage
  const newStage = getStageByCarePoints(pet.carePoints)
  if (newStage !== oldStage) {
    pet.stage = newStage
    pet.evolvedAt = BigInt(now)
  }

  await db.pet.update({
    where: { playerId },
    data: { hunger: pet.hunger, carePoints: pet.carePoints, stage: pet.stage, lastFedAt: pet.lastFedAt, evolvedAt: pet.evolvedAt },
  })

  await db.player.update({ where: { id: playerId }, data: { currentPoints: { decrement: FEEDING_COST }, updatedAt: now } })

  await db.scoreRecord.create({
    data: {
      coachId: player.coachId, playerId, ruleId: null, indicatorId: null,
      points: -FEEDING_COST, type: 'spend', reason: '喂食宠物',
      operatorType: 'system', operatorId: 'system', createdAt: now,
    },
  })

  const updatedPlayer = await db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })

  res.json({
    success: true,
    data: { hunger: pet.hunger, carePoints: pet.carePoints, stage: pet.stage, currentPoints: updatedPlayer!.currentPoints, evolved: newStage !== oldStage },
  })
})

// 玩耍
playerRouter.post('/:playerId/pet/play', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const player = await db.player.findUnique({ where: { id: playerId }, include: { coach: { select: { playerMode: true } } } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const PLAY_COST = 5
  const PLAY_CARE_POINTS = 3
  const MOOD_GAIN = 20

  if (player.currentPoints < PLAY_COST) {
    return res.status(400).json({ success: false, error: `积分不足，需要 ${PLAY_COST} 分` })
  }

  const now = Date.now()
  pet.mood = Math.min(100, pet.mood + MOOD_GAIN)
  pet.carePoints += PLAY_CARE_POINTS
  pet.lastPlayedAt = BigInt(now)

  const oldStage = pet.stage
  const newStage = getStageByCarePoints(pet.carePoints)
  if (newStage !== oldStage) {
    pet.stage = newStage
    pet.evolvedAt = BigInt(now)
  }

  await db.pet.update({
    where: { playerId },
    data: { mood: pet.mood, carePoints: pet.carePoints, stage: pet.stage, lastPlayedAt: pet.lastPlayedAt, evolvedAt: pet.evolvedAt },
  })

  await db.player.update({ where: { id: playerId }, data: { currentPoints: { decrement: PLAY_COST }, updatedAt: now } })

  await db.scoreRecord.create({
    data: {
      coachId: player.coachId, playerId, ruleId: null, indicatorId: null,
      points: -PLAY_COST, type: 'spend', reason: '玩耍宠物',
      operatorType: 'system', operatorId: 'system', createdAt: now,
    },
  })

  const updatedPlayer = await db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })

  res.json({
    success: true,
    data: { mood: pet.mood, carePoints: pet.carePoints, stage: pet.stage, currentPoints: updatedPlayer!.currentPoints, evolved: newStage !== oldStage },
  })
})

// 商店列表
playerRouter.get('/:playerId/shop', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const items = await db.shopItem.findMany({
    where: { OR: [{ coachId: player.coachId }, { coachId: null }], isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const inventory = await db.playerInventory.findMany({ where: { playerId } })

  res.json({
    success: true,
    data: {
      items: items.map(i => ({ ...i, effect: JSON.parse(JSON.stringify(i.effect)) })),
      inventory,
      currentPoints: player.currentPoints,
    },
  })
})

// 购买
playerRouter.post('/:playerId/shop/buy', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const { itemId } = req.body

  const player = await db.player.findUnique({ where: { id: playerId }, include: { coach: { select: { playerMode: true } } } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const item = await db.shopItem.findFirst({ where: { id: itemId, OR: [{ coachId: player.coachId }, { coachId: null }] } })
  if (!item) return res.status(404).json({ success: false, error: '物品不存在' })
  if (player.currentPoints < item.price) return res.status(400).json({ success: false, error: '积分不足' })

  const now = Date.now()
  let existingInv = await db.playerInventory.findFirst({ where: { playerId, itemId } })
  if (existingInv) {
    await db.playerInventory.update({ where: { id: existingInv.id }, data: { quantity: { increment: 1 } } })
  } else {
    await db.playerInventory.create({ data: { playerId, itemId, quantity: 1, acquiredAt: now } })
  }

  await db.player.update({ where: { id: playerId }, data: { currentPoints: { decrement: item.price }, updatedAt: now } })

  await db.scoreRecord.create({
    data: {
      coachId: player.coachId, playerId, ruleId: null, indicatorId: null,
      points: -item.price, type: 'spend', reason: `购买 ${item.name}`,
      operatorType: 'system', operatorId: 'system', createdAt: now,
    },
  })

  const updatedPlayer = await db.player.findUnique({ where: { id: playerId }, select: { currentPoints: true } })

  res.json({ success: true, data: { currentPoints: updatedPlayer!.currentPoints } })
})

// 装备/卸下
playerRouter.put('/:playerId/shop/equip', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const { inventoryId } = req.body

  const player = await db.player.findUnique({ where: { id: playerId }, include: { coach: { select: { playerMode: true } } } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const inv = await db.playerInventory.findFirst({ where: { id: inventoryId, playerId } })
  if (!inv) return res.status(404).json({ success: false, error: '背包物品不存在' })

  const item = await db.shopItem.findUnique({ where: { id: inv.itemId } })
  if (!item) return res.status(404).json({ success: false, error: '物品不存在' })

  if (inv.isEquipped) {
    await db.playerInventory.update({ where: { id: inventoryId }, data: { isEquipped: false } })
  } else {
    // 同类型配饰卸下
    if (item.type === 'decoration') {
      const effect = item.effect as any
      if (effect?.decoration) {
        const allEquipped = await db.playerInventory.findMany({ where: { playerId, isEquipped: true } })
        for (const equipped of allEquipped) {
          const equippedItem = await db.shopItem.findUnique({ where: { id: equipped.itemId } })
          const equippedEffect = equippedItem?.effect as any
          if (equippedEffect?.decoration && effect.decoration === equippedEffect.decoration) {
            await db.playerInventory.update({ where: { id: equipped.id }, data: { isEquipped: false } })
          }
        }
      }
    }

    await db.playerInventory.update({ where: { id: inventoryId }, data: { isEquipped: true } })
  }

  // 同步宠物配饰
  const equipped = await db.playerInventory.findMany({ where: { playerId, isEquipped: true } })
  const decorationIds: string[] = []
  for (const e of equipped) {
    const it = await db.shopItem.findUnique({ where: { id: e.itemId } })
    const eff = it?.effect as any
    if (eff?.decoration) decorationIds.push(eff.decoration)
  }

  await db.pet.update({ where: { playerId }, data: { equippedDecorations: decorationIds } })

  res.json({ success: true, data: { equippedDecorations: decorationIds } })
})

// 使用物品
playerRouter.post('/:playerId/shop/use', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const { inventoryId } = req.body

  const player = await db.player.findUnique({ where: { id: playerId }, include: { coach: { select: { playerMode: true } } } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })
  if (player.coach.playerMode !== 'open') return res.status(403).json({ success: false, error: '教练已关闭操作权限' })

  const inv = await db.playerInventory.findFirst({ where: { id: inventoryId, playerId } })
  if (!inv) return res.status(404).json({ success: false, error: '背包物品不存在' })

  const item = await db.shopItem.findUnique({ where: { id: inv.itemId } })
  if (!item || item.type !== 'food') return res.status(400).json({ success: false, error: '只能使用食物类物品' })

  const pet = await db.pet.findUnique({ where: { playerId } })
  if (!pet) return res.status(404).json({ success: false, error: '宠物不存在' })

  const effect = item.effect as any
  const now = Date.now()

  if (effect?.hunger) pet.hunger = Math.min(100, pet.hunger + effect.hunger)
  if (effect?.mood) pet.mood = Math.min(100, pet.mood + effect.mood)
  if (effect?.experience) pet.carePoints += effect.experience

  const newStage = getStageByCarePoints(pet.carePoints)
  if (newStage !== pet.stage) {
    pet.stage = newStage
    pet.evolvedAt = BigInt(now)
  }

  await db.pet.update({
    where: { playerId },
    data: { hunger: pet.hunger, mood: pet.mood, carePoints: pet.carePoints, stage: pet.stage, evolvedAt: pet.evolvedAt },
  })

  // 消耗物品
  if (inv.quantity <= 1) {
    await db.playerInventory.delete({ where: { id: inventoryId } })
  } else {
    await db.playerInventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } })
  }

  res.json({ success: true, data: { hunger: pet.hunger, mood: pet.mood, carePoints: pet.carePoints, stage: pet.stage } })
})

// 排行榜
playerRouter.get('/:playerId/leaderboard', async (req: AuthRequest, res: Response) => {
  const { playerId } = req.params
  const player = await db.player.findUnique({ where: { id: playerId } })
  if (!player) return res.status(404).json({ success: false, error: '学生不存在' })

  const players = await db.player.findMany({
    where: { coachId: player.coachId },
    orderBy: { currentPoints: 'desc' },
    select: { id: true, name: true, avatar: true, currentPoints: true },
  })

  res.json({ success: true, data: players })
})

// ========= 辅助函数 =========
function getStageByCarePoints(carePoints: number): string {
  if (carePoints >= 300) return 'rare'
  if (carePoints >= 150) return 'adult'
  if (carePoints >= 60) return 'teen'
  if (carePoints >= 20) return 'baby'
  return 'egg'
}
```

- [ ] **Step 2: 提交**

```bash
git add server/src/routes/player.ts
git commit -m "feat: player API routes (pet, feed, play, shop, equip, use, leaderboard)"
```

---

### Task 8: 前端基础架构

**Files:**
- Create: `client/src/api/index.ts`
- Create: `client/src/router/index.ts`
- Create: `client/src/stores/auth.ts`
- Modify: `client/src/main.ts`

- [ ] **Step 1: 编写 API 客户端**

```typescript
// client/src/api/index.ts
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/#/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ========= Admin =========
export const adminApi = {
  login: (username: string, password: string) => api.post('/admin/login', { username, password }),
  getCoaches: () => api.get('/admin/coaches'),
  createCoach: (phone: string) => api.post('/admin/coaches', { phone }),
  updateCoach: (id: string, data: any) => api.put(`/admin/coaches/${id}`, data),
  getStats: () => api.get('/admin/stats'),
  importPetSpecies: (species: any[]) => api.post('/admin/pet-species', { species }),
  importAccessories: (accessories: any[]) => api.post('/admin/accessories', { accessories }),
  importBackgrounds: (backgrounds: any[]) => api.post('/admin/backgrounds', { backgrounds }),
}

// ========= Coach =========
export const coachApi = {
  register: (phone: string) => api.post('/coach/register', { phone }),
  login: (phone: string, password: string) => api.post('/coach/login', { phone, password }),
  changePassword: (oldPassword: string, newPassword: string) => api.put('/coach/password', { oldPassword, newPassword }),
  getPlayers: () => api.get('/coach/players'),
  createPlayer: (name: string, avatar: string) => api.post('/coach/players', { name, avatar }),
  updatePlayer: (id: string, data: any) => api.put(`/coach/players/${id}`, data),
  deletePlayer: (id: string) => api.delete(`/coach/players/${id}`),
  addScore: (data: any) => api.post('/coach/scores', data),
  getPlayerScores: (playerId: string) => api.get(`/coach/scores/${playerId}`),
  getPlayerStats: (playerId: string) => api.get(`/coach/player-stats/${playerId}`),
  getDimensions: () => api.get('/coach/dimensions'),
  createDimension: (data: any) => api.post('/coach/dimensions', data),
  updateDimension: (id: string, data: any) => api.put(`/coach/dimensions/${id}`, data),
  deleteDimension: (id: string) => api.delete(`/coach/dimensions/${id}`),
  createIndicator: (data: any) => api.post('/coach/indicators', data),
  updateIndicator: (id: string, data: any) => api.put(`/coach/indicators/${id}`, data),
  deleteIndicator: (id: string) => api.delete(`/coach/indicators/${id}`),
  getBonusRules: () => api.get('/coach/bonus-rules'),
  updateBonusRule: (id: string, data: any) => api.put(`/coach/bonus-rules/${id}`, data),
  getMode: () => api.get('/coach/mode'),
  setMode: (playerMode: string) => api.put('/coach/mode', { playerMode }),
  getShopItems: () => api.get('/coach/shop-items'),
  updateShopItem: (id: string, data: any) => api.put(`/coach/shop-items/${id}`, data),
  getQuickLink: (playerId: string) => api.get(`/coach/players/${playerId}/quick-link`),
  importData: (type: string, data: any) => api.post('/coach/import', { type, data }),
}

// ========= Player =========
export const playerApi = {
  getPet: (playerId: string) => api.get(`/player/${playerId}/pet`),
  getMode: (playerId: string) => api.get(`/player/${playerId}/mode`),
  feed: (playerId: string) => api.post(`/player/${playerId}/pet/feed`),
  play: (playerId: string) => api.post(`/player/${playerId}/pet/play`),
  getShop: (playerId: string) => api.get(`/player/${playerId}/shop`),
  buy: (playerId: string, itemId: string) => api.post(`/player/${playerId}/shop/buy`, { itemId }),
  equip: (playerId: string, inventoryId: string) => api.put(`/player/${playerId}/shop/equip`, { inventoryId }),
  use: (playerId: string, inventoryId: string) => api.post(`/player/${playerId}/shop/use`, { inventoryId }),
  getLeaderboard: (playerId: string) => api.get(`/player/${playerId}/leaderboard`),
}
```

- [ ] **Step 2: 编写路由**

```typescript
// client/src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    // 学生端
    { path: '/', redirect: '/join' },
    { path: '/join', name: 'Join', component: () => import('@/views/player/PlayerSelectionPage.vue') },
    { path: '/player/:playerId', name: 'PlayerDashboard', component: () => import('@/views/player/PlayerDashboardPage.vue') },
    { path: '/player/:playerId/shop', name: 'PlayerShop', component: () => import('@/views/player/PlayerShopPage.vue') },

    // 教练端
    { path: '/login', name: 'CoachLogin', component: () => import('@/views/coach/CoachLoginPage.vue') },
    { path: '/coach/dashboard', name: 'CoachDashboard', component: () => import('@/views/coach/CoachDashboardPage.vue') },
    { path: '/coach/score', name: 'CoachScore', component: () => import('@/views/coach/CoachScorePage.vue') },
    { path: '/coach/score-config', name: 'CoachScoreConfig', component: () => import('@/views/coach/CoachScoreConfigPage.vue') },
    { path: '/coach/players', name: 'CoachPlayers', component: () => import('@/views/coach/CoachPlayersPage.vue') },
    { path: '/coach/player-cards', name: 'CoachPlayerCards', component: () => import('@/views/coach/CoachPlayerCardsPage.vue') },
    { path: '/coach/shop', name: 'CoachShop', component: () => import('@/views/coach/CoachShopPage.vue') },

    // 管理端
    { path: '/admin/login', name: 'AdminLogin', component: () => import('@/views/admin/AdminLoginPage.vue') },
    { path: '/admin/dashboard', name: 'AdminDashboard', component: () => import('@/views/admin/AdminDashboardPage.vue') },
    { path: '/admin/coaches', name: 'AdminCoaches', component: () => import('@/views/admin/AdminCoachesPage.vue') },
  ],
})

export default router
```

- [ ] **Step 3: 编写 auth store**

```typescript
// client/src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { coachApi, adminApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<any>(null)
  const role = ref<'coach' | 'admin' | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const playerMode = computed(() => user.value?.playerMode || 'display')

  async function loginAsCoach(phone: string, password: string) {
    const { data } = await coachApi.login(phone, password)
    if (data.success) {
      token.value = data.data.token
      user.value = data.data.coach
      role.value = 'coach'
      localStorage.setItem('token', data.data.token)
    }
    return data
  }

  async function loginAsAdmin(username: string, password: string) {
    const { data } = await adminApi.login(username, password)
    if (data.success) {
      token.value = data.data.token
      user.value = data.data.admin
      role.value = 'admin'
      localStorage.setItem('token', data.data.token)
    }
    return data
  }

  function logout() {
    token.value = ''
    user.value = null
    role.value = null
    localStorage.removeItem('token')
    window.location.href = '/#/login'
  }

  async function refreshMode() {
    if (role.value !== 'coach') return
    const { data } = await coachApi.getMode()
    if (data.success && user.value) {
      user.value.playerMode = data.data.playerMode
    }
  }

  async function setMode(mode: string) {
    await coachApi.setMode(mode)
    if (user.value) user.value.playerMode = mode
  }

  return { token, user, role, isLoggedIn, playerMode, loginAsCoach, loginAsAdmin, logout, refreshMode, setMode }
})
```

- [ ] **Step 4: 更新 main.ts**

```typescript
// client/src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

```vue
<!-- client/src/App.vue -->
<template>
  <router-view />
</template>
```

- [ ] **Step 5: 提交**

```bash
git add client/src/
git commit -m "feat: frontend core (api client, router, auth store)"
```

---

### Task 9: RadarChart 和 FifaPlayerCard 组件

**Files:**
- Create: `client/src/components/RadarChart.vue`
- Create: `client/src/components/FifaPlayerCard.vue`

- [ ] **Step 1: 编写 RadarChart 组件**

```vue
<!-- client/src/components/RadarChart.vue -->
<template>
  <div class="radar-container" :style="{ width: size + 'px', height: size + 'px' }">
    <canvas ref="canvas" :width="canvasSize" :height="canvasSize"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  dimensions: { label: string; value: number; maxValue?: number }[]
  size?: number
  color?: string
  fillColor?: string
  animated?: boolean
}>(), {
  size: 200,
  color: '#FFD700',
  fillColor: 'rgba(255, 215, 0, 0.2)',
  animated: true,
})

const canvasSize = props.size * 2
const canvas = ref<HTMLCanvasElement>()

function draw(progress = 1) {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')!
  const cx = props.size
  const cy = props.size
  const radius = props.size * 0.7
  const count = props.dimensions.length
  const angleStep = (Math.PI * 2) / count

  ctx.clearRect(0, 0, canvasSize, canvasSize)

  // 绘制背景网格
  for (let level = 1; level <= 5; level++) {
    const r = (radius / 5) * level
    ctx.beginPath()
    for (let i = 0; i <= count; i++) {
      const angle = angleStep * i - Math.PI / 2
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // 绘制轴线
  for (let i = 0; i < count; i++) {
    const angle = angleStep * i - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.stroke()

    // 标签
    const labelR = radius + 22
    const lx = cx + labelR * Math.cos(angle)
    const ly = cy + labelR * Math.sin(angle)
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(props.dimensions[i].label, lx, ly)
  }

  // 绘制数据
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const angle = angleStep * i - Math.PI / 2
    const maxVal = props.dimensions[i].maxValue || 99
    const val = Math.min(props.dimensions[i].value, maxVal) / maxVal
    const r = radius * val * progress
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = props.fillColor
  ctx.fill()
  ctx.strokeStyle = props.color
  ctx.lineWidth = 2
  ctx.shadowColor = props.color
  ctx.shadowBlur = 8
  ctx.stroke()
  ctx.shadowBlur = 0

  // 绘制数据点
  for (let i = 0; i < count; i++) {
    const angle = angleStep * i - Math.PI / 2
    const maxVal = props.dimensions[i].maxValue || 99
    const val = Math.min(props.dimensions[i].value, maxVal) / maxVal
    const r = radius * val * progress
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = props.color
    ctx.fill()
  }
}

let animFrame = 0

function animate() {
  const duration = 600
  const start = performance.now()
  cancelAnimationFrame(animFrame)

  function step(now: number) {
    const elapsed = now - start
    const progress = Math.min(1, elapsed / duration)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out
    draw(eased)
    if (progress < 1) animFrame = requestAnimationFrame(step)
  }

  animFrame = requestAnimationFrame(step)
}

onMounted(() => {
  if (props.animated) animate()
  else draw(1)
})

watch(() => props.dimensions, () => {
  if (props.animated) animate()
  else draw(1)
}, { deep: true })
</script>
```

- [ ] **Step 2: 编写 FifaPlayerCard 组件**

```vue
<!-- client/src/components/FifaPlayerCard.vue -->
<template>
  <div
    class="fifa-card"
    :class="`rating-${ratingTier}`"
    :style="{ background: cardBg }"
  >
    <!-- 光泽扫过动画 -->
    <div class="foil-shine"></div>

    <!-- 综合评分 -->
    <div class="overall-rating">
      <span class="rating-number">{{ stats.overall }}</span>
      <span class="rating-label">综合</span>
    </div>

    <!-- 球员信息 -->
    <div class="player-info">
      <span class="player-name">{{ stats.playerName }}</span>
      <span class="player-points">积分 {{ stats.totalPoints }}</span>
    </div>

    <!-- 雷达图 -->
    <div class="radar-wrap">
      <RadarChart
        :dimensions="radarDimensions"
        :size="140"
        :color="accentColor"
        :fill-color="accentFillColor"
      />
    </div>

    <!-- 维度进度条 -->
    <div class="dim-bars">
      <div v-for="d in stats.dimensions" :key="d.dimensionId" class="dim-bar">
        <span class="dim-icon">{{ d.icon }}</span>
        <span class="dim-name">{{ d.dimensionName }}</span>
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ width: d.score + '%', background: progressColor(d.score) }"
          ></div>
        </div>
        <span class="dim-score">{{ d.score }}</span>
      </div>
    </div>

    <!-- 统计 -->
    <div class="card-stats">
      <div class="stat">
        <span class="stat-label">今日</span>
        <span class="stat-value">+{{ stats.todayPoints }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">周排名</span>
        <span class="stat-value rank">#{{ stats.rank }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RadarChart from './RadarChart.vue'
import type { PlayerStats } from '@shared/types'

const props = defineProps<{
  stats: PlayerStats
}>()

const ratingTier = computed(() => {
  const o = props.stats.overall
  if (o >= 85) return 'gold'
  if (o >= 70) return 'silver'
  return 'bronze'
})

const accentColor = computed(() => {
  if (ratingTier.value === 'gold') return '#FFD700'
  if (ratingTier.value === 'silver') return '#C0C0C0'
  return '#CD7F32'
})

const accentFillColor = computed(() => {
  if (ratingTier.value === 'gold') return 'rgba(255,215,0,0.2)'
  if (ratingTier.value === 'silver') return 'rgba(192,192,192,0.2)'
  return 'rgba(205,127,50,0.2)'
})

const cardBg = computed(() => {
  if (ratingTier.value === 'gold') return 'linear-gradient(135deg, #1a1a2e 0%, #2d1f0a 100%)'
  if (ratingTier.value === 'silver') return 'linear-gradient(135deg, #1a1a2e 0%, #1f2937 100%)'
  return 'linear-gradient(135deg, #1a1a2e 0%, #2a1f0f 100%)'
})

const radarDimensions = computed(() =>
  props.stats.dimensions.map(d => ({
    label: d.icon + d.dimensionName.charAt(0),
    value: d.score,
    maxValue: 99,
  }))
)

function progressColor(score: number): string {
  if (score >= 80) return 'linear-gradient(90deg, #FFD700, #FFA500)'
  if (score >= 60) return 'linear-gradient(90deg, #4ADE80, #22C55E)'
  return 'linear-gradient(90deg, #60A5FA, #3B82F6)'
}

defineExpose()
</script>

<style scoped>
.fifa-card {
  position: relative;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid transparent;
  overflow: hidden;
  color: #fff;
  font-family: 'Inter', sans-serif;
}

.fifa-card.rating-gold { border-color: #FFD700; box-shadow: 0 0 20px rgba(255,215,0,0.3); }
.fifa-card.rating-silver { border-color: #C0C0C0; box-shadow: 0 0 15px rgba(192,192,192,0.2); }
.fifa-card.rating-bronze { border-color: #CD7F32; box-shadow: 0 0 10px rgba(205,127,50,0.2); }

.foil-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 40%,
    rgba(255,255,255,0.05) 50%,
    transparent 60%
  );
  animation: foil-sweep 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes foil-sweep {
  0% { transform: translateX(-100%) translateY(-100%); }
  100% { transform: translateX(100%) translateY(100%); }
}

.overall-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
}

.rating-number {
  font-size: 48px;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
  text-shadow: 0 0 20px currentColor;
}

.rating-label {
  font-size: 12px;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.player-info {
  text-align: center;
  margin-bottom: 12px;
}

.player-name {
  font-size: 18px;
  font-weight: 700;
}

.player-points {
  display: block;
  font-size: 13px;
  opacity: 0.6;
}

.radar-wrap {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}

.dim-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 0;
}

.dim-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.dim-icon { width: 20px; text-align: center; }
.dim-name { width: 36px; flex-shrink: 0; }

.bar-track {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease-out;
}

.dim-score {
  width: 24px;
  text-align: right;
  font-weight: 700;
}

.card-stats {
  display: flex;
  justify-content: space-around;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.stat { text-align: center; }
.stat-label { display: block; font-size: 11px; opacity: 0.5; }
.stat-value { font-size: 18px; font-weight: 700; }
.stat-value.rank { color: #FFD700; }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add client/src/components/
git commit -m "feat: RadarChart and FifaPlayerCard components"
```

---

### Task 10: 教练和学员各页面

**Files:**
- Create: `client/src/views/coach/CoachLoginPage.vue`
- Create: `client/src/views/coach/CoachDashboardPage.vue`
- Create: `client/src/views/coach/CoachScorePage.vue`
- Create: `client/src/views/coach/CoachScoreConfigPage.vue`
- Create: `client/src/views/coach/CoachPlayersPage.vue`
- Create: `client/src/views/coach/CoachPlayerCardsPage.vue`
- Create: `client/src/views/coach/CoachShopPage.vue`
- Create: `client/src/views/player/PlayerSelectionPage.vue`
- Create: `client/src/views/player/PlayerDashboardPage.vue`
- Create: `client/src/views/player/PlayerShopPage.vue`

此任务页面较多，按 3 个子任务分组提交。

- [ ] **Step 1-3: 教练登录页**

```vue
<!-- client/src/views/coach/CoachLoginPage.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="text-6xl mb-4">⚽</div>
        <h1 class="text-3xl font-bold text-white">星宠契约</h1>
        <p class="text-gray-400 mt-2">教练登录</p>
      </div>

      <div class="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
        <!-- 登录模式 -->
        <div v-if="mode === 'login'">
          <input v-model="phone" placeholder="手机号" class="input-field" maxlength="11" />
          <input v-model="password" type="password" placeholder="密码" class="input-field mt-3" />
          <button @click="handleLogin" :disabled="loading" class="btn-primary mt-4">
            {{ loading ? '登录中...' : '登录' }}
          </button>
          <p class="text-center text-gray-500 mt-4 text-sm">
            还没有账号？
            <button @click="mode = 'register'" class="text-blue-400">立即注册</button>
          </p>
          <p class="text-center text-gray-500 mt-2 text-sm">
            <router-link to="/admin/login" class="text-gray-500 hover:text-gray-300">管理员登录</router-link>
          </p>
        </div>

        <!-- 注册模式 -->
        <div v-else>
          <input v-model="phone" placeholder="请输入手机号" class="input-field" maxlength="11" />
          <p class="text-gray-400 text-xs mt-2">注册后默认密码为手机号后六位，享7天免费试用</p>
          <button @click="handleRegister" :disabled="loading" class="btn-primary mt-4">
            {{ loading ? '注册中...' : '注册' }}
          </button>
          <p class="text-center text-gray-500 mt-4 text-sm">
            已有账号？
            <button @click="mode = 'login'" class="text-blue-400">返回登录</button>
          </p>
        </div>

        <p v-if="error" class="text-red-400 text-sm text-center mt-4">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { coachApi } from '@/api'

const router = useRouter()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const phone = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  if (!phone.value || !password.value) { error.value = '请填写手机号和密码'; return }
  loading.value = true
  try {
    await auth.loginAsCoach(phone.value, password.value)
    router.push('/coach/dashboard')
  } catch (e: any) {
    error.value = e.response?.data?.error || '登录失败'
  }
  loading.value = false
}

async function handleRegister() {
  error.value = ''
  if (!/^\d{11}$/.test(phone.value)) { error.value = '请输入有效的11位手机号'; return }
  loading.value = true
  try {
    await coachApi.register(phone.value)
    error.value = '注册成功！默认密码为手机号后6位，请返回登录。'
    mode.value = 'login'
  } catch (e: any) {
    error.value = e.response?.data?.error || '注册失败'
  }
  loading.value = false
}
</script>

<style scoped>
.input-field {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: white;
  font-size: 16px;
  outline: none;
}
.input-field:focus { border-color: #3B82F6; }
.input-field::placeholder { color: #6B7280; }
.btn-primary {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 4: 提交 login 页 + dashboard 骨架**

```bash
git add client/src/views/coach/CoachLoginPage.vue
git commit -m "feat: coach login/register page"
```

- [ ] **Step 5-7: 教练主仪表盘**

```vue
<!-- client/src/views/coach/CoachDashboardPage.vue -->
<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <!-- 顶部导航 -->
    <nav class="bg-gray-800/50 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <h1 class="text-xl font-bold">星宠契约 · 教练端</h1>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
          <span>{{ auth.playerMode === 'open' ? '🟢 开放' : '🔴 展示' }}</span>
          <button @click="toggleMode" class="px-3 py-1 bg-blue-600 rounded text-sm">
            {{ auth.playerMode === 'open' ? '关闭操作' : '开启操作' }}
          </button>
        </div>
        <span class="text-gray-400 text-sm">{{ auth.user?.name }}</span>
        <button @click="auth.logout()" class="text-gray-400 hover:text-white">退出</button>
      </div>
    </nav>

    <!-- 快捷入口 -->
    <div class="max-w-6xl mx-auto p-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <router-link to="/coach/score" class="quick-link">
          <span class="text-3xl">📝</span>
          <span>快速记分</span>
        </router-link>
        <router-link to="/coach/players" class="quick-link">
          <span class="text-3xl">👥</span>
          <span>球员管理</span>
        </router-link>
        <router-link to="/coach/player-cards" class="quick-link">
          <span class="text-3xl">🃏</span>
          <span>球员卡</span>
        </router-link>
        <router-link to="/coach/shop" class="quick-link">
          <span class="text-3xl">🛒</span>
          <span>商店</span>
        </router-link>
        <router-link to="/coach/score-config" class="quick-link">
          <span class="text-3xl">⚙️</span>
          <span>评分配置</span>
        </router-link>
      </div>

      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()

async function toggleMode() {
  const newMode = auth.playerMode === 'open' ? 'display' : 'open'
  await auth.setMode(newMode)
}
</script>

<style scoped>
.quick-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  text-decoration: none;
  color: white;
  transition: all 0.2s;
}
.quick-link:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
</style>
```

- [ ] **Step 8: 提交**

```bash
git add client/src/views/coach/CoachDashboardPage.vue
git commit -m "feat: coach dashboard with mode toggle and quick links"
```

- [ ] **Step 9-10: 教练快速记分页**

由于篇幅限制，以下是核心结构。完整组件包含学生头像横向滚动 + 维度/指标网格按钮 + 日上限显示 + 底部提示区。

```vue
<!-- client/src/views/coach/CoachScorePage.vue -->
<template>
  <div>
    <h2 class="text-lg font-bold mb-4">快速记分</h2>

    <!-- 学生选择器 -->
    <div class="flex gap-2 overflow-x-auto pb-3 mb-4">
      <button
        v-for="p in players" :key="p.id"
        @click="selectedPlayer = p"
        :class="['player-chip', { active: selectedPlayer?.id === p.id }]"
      >
        <span>{{ p.avatar }}</span>
        <span class="text-sm">{{ p.name }}</span>
      </button>
    </div>

    <!-- 批量模式开关 -->
    <label class="flex items-center gap-2 mb-4 text-sm text-gray-400">
      <input type="checkbox" v-model="batchMode" /> 批量模式（多人统一加分）
    </label>

    <!-- 维度 + 指标网格 -->
    <div v-if="selectedPlayer || batchMode">
      <div v-for="dim in dimensions" :key="dim.id" class="mb-4">
        <h3 class="text-sm font-bold text-gray-400 mb-2">{{ dim.icon }} {{ dim.name }}</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            v-for="ind in dim.indicators" :key="ind.id"
            @click="addScore(ind)"
            class="score-btn"
          >
            <span class="text-xs">{{ ind.name }}</span>
            <span class="text-lg font-bold text-yellow-400">+{{ ind.defaultPoints }}</span>
            <span class="text-xs text-gray-500">今日 {{ getTodayCount(ind.id) }}/{{ ind.dailyLimit }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 手动加减分 -->
    <div class="mt-4 p-4 bg-white/5 rounded-lg">
      <div class="flex gap-2">
        <input v-model.number="customPoints" type="number" placeholder="自定义分数" class="flex-1 bg-gray-800 rounded px-3 py-2" />
        <input v-model="customReason" placeholder="原因" class="flex-1 bg-gray-800 rounded px-3 py-2" />
        <button @click="addCustomScore('earn')" class="px-4 py-2 bg-green-600 rounded">加分</button>
        <button @click="addCustomScore('penalty')" class="px-4 py-2 bg-red-600 rounded">扣分</button>
      </div>
    </div>

    <!-- 底部提示区 -->
    <details class="mt-6 text-sm text-gray-500">
      <summary class="cursor-pointer text-gray-400">💡 评分提示</summary>
      <div class="mt-2 space-y-2 p-3 bg-white/5 rounded">
        <p><strong>记录方式建议：</strong>手机快速标记为主，训练中点击指标按钮即时给分。支持批量模式给多人统一加分。</p>
        <p><strong>给分原则：</strong>即时反馈口头表扬最佳。允许学员申诉（训练后可补分）。长按按钮可撤销上次加分。</p>
        <p><strong>评分频率建议：</strong>技术类每次训练记录；体能类每周测1次；战术/心态类每半场记录。</p>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { coachApi } from '@/api'

const players = ref<any[]>([])
const dimensions = ref<any[]>([])
const selectedPlayer = ref<any>(null)
const batchMode = ref(false)
const customPoints = ref(5)
const customReason = ref('')
const todayCounts = ref<Record<string, number>>({})

onMounted(async () => {
  const [playersRes, dimsRes] = await Promise.all([
    coachApi.getPlayers(),
    coachApi.getDimensions(),
  ])
  players.value = playersRes.data.data
  dimensions.value = dimsRes.data.data
})

function getTodayCount(indicatorId: string): number {
  return todayCounts.value[indicatorId] || 0
}

async function addScore(indicator: any) {
  const pts = indicator.defaultPoints
  const playerIds = batchMode.value
    ? players.value.filter((p: any) => p.isActive).map((p: any) => p.id)
    : [selectedPlayer.value?.id].filter(Boolean)

  for (const pid of playerIds) {
    try {
      await coachApi.addScore({ playerId: pid, indicatorId: indicator.id, points: pts, type: 'earn', reason: indicator.name })
      todayCounts.value[indicator.id] = (todayCounts.value[indicator.id] || 0) + pts
    } catch (e: any) {
      alert(e.response?.data?.error || '记分失败')
    }
  }
}

async function addCustomScore(type: string) {
  const playerIds = batchMode.value
    ? players.value.filter((p: any) => p.isActive).map((p: any) => p.id)
    : [selectedPlayer.value?.id].filter(Boolean)
  if (!playerIds.length) return

  for (const pid of playerIds) {
    await coachApi.addScore({ playerId: pid, points: customPoints.value, type, reason: customReason.value || '手动记分' })
  }
}
</script>

<style scoped>
.player-chip { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 14px; background: rgba(255,255,255,0.05); border: 2px solid transparent; border-radius: 10px; white-space: nowrap; cursor: pointer; min-width: 60px; }
.player-chip.active { border-color: #3B82F6; background: rgba(59,130,246,0.1); }
.score-btn { display: flex; flex-direction: column; align-items: center; padding: 10px 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.score-btn:hover { background: rgba(255,255,255,0.1); }
.score-btn:active { background: rgba(59,130,246,0.2); border-color: #3B82F6; }
</style>
```

- [ ] **Step 11: 提交记分页 + 球员管理 + 球员卡 + 商店**

```bash
git add client/src/views/coach/CoachScorePage.vue
git commit -m "feat: coach quick scoring page with dimension grid and batch mode"
```

- [ ] **Step 12-15: 教练球员卡总览页**

```vue
<!-- client/src/views/coach/CoachPlayerCardsPage.vue -->
<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold">球员能力总览</h2>
      <div class="flex gap-2">
        <button @click="viewMode = 'grid'" :class="['px-3 py-1 rounded text-sm', viewMode === 'grid' ? 'bg-blue-600' : 'bg-gray-700']">网格</button>
        <button @click="viewMode = 'compare'" :class="['px-3 py-1 rounded text-sm', viewMode === 'compare' ? 'bg-blue-600' : 'bg-gray-700']">对比</button>
      </div>
    </div>

    <!-- 网格视图 -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="s in sortedStats" :key="s.playerId">
        <FifaPlayerCard :stats="s" />
      </div>
    </div>

    <!-- 对比视图 -->
    <div v-else>
      <div class="flex flex-wrap gap-2 mb-4">
        <button v-for="s in allStats" :key="s.playerId"
          @click="toggleCompare(s.playerId)"
          :class="['px-3 py-1 rounded text-sm', compareIds.has(s.playerId) ? 'bg-blue-600' : 'bg-gray-700']">
          {{ s.playerName }}
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FifaPlayerCard v-for="id in compareIds" :key="id" :stats="allStats.find(s => s.playerId === id)!" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { coachApi } from '@/api'
import FifaPlayerCard from '@/components/FifaPlayerCard.vue'
import type { PlayerStats } from '@shared/types'

const viewMode = ref<'grid' | 'compare'>('grid')
const allStats = ref<PlayerStats[]>([])
const compareIds = ref(new Set<string>())

const sortedStats = computed(() => [...allStats.value].sort((a, b) => b.overall - a.overall))

function toggleCompare(id: string) {
  if (compareIds.value.has(id)) compareIds.value.delete(id)
  else if (compareIds.value.size < 4) compareIds.value.add(id)
  compareIds.value = new Set(compareIds.value)
}

onMounted(async () => {
  const { data: playersData } = await coachApi.getPlayers()
  const players = playersData.data
  const stats = await Promise.all(
    players.map(async (p: any) => {
      const { data } = await coachApi.getPlayerStats(p.id)
      return data.success ? data.data : null
    })
  )
  allStats.value = stats.filter(Boolean) as PlayerStats[]
})
</script>
```

- [ ] **Step 16: 学生端首页（复用原项目卡片设计）**

```vue
<!-- client/src/views/player/PlayerSelectionPage.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 p-4">
    <h1 class="text-3xl font-bold text-white text-center mt-8 mb-2">星宠契约</h1>
    <p class="text-gray-400 text-center mb-8">点击你的宠物卡片进入</p>

    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
      <div v-for="player in players" :key="player.id"
        @click="selectPlayer(player)"
        class="pet-card cursor-pointer">
        <div class="text-5xl mb-2">{{ player.pet?.stage === 'egg' ? '🥚' : player.avatar }}</div>
        <div class="text-white font-bold">{{ player.name }}</div>
        <div v-if="player.pet" class="text-xs text-gray-400">
          {{ stageLabel(player.pet.stage) }} · Lv.{{ player.pet.level }}
        </div>
        <div v-else class="text-xs text-gray-500">暂无宠物</div>
        <div class="text-yellow-400 text-sm mt-1">{{ player.currentPoints }} 积分</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const players = ref<any[]>([])

const stageLabels: Record<string, string> = { egg: '蛋', baby: '幼崽', teen: '少年', adult: '成年', rare: '稀有' }
function stageLabel(s: string) { return stageLabels[s] || s }

// 通过快捷链接参数 c (教练手机) 查找
onMounted(async () => {
  const coachPhone = route.query.c as string
  if (coachPhone) {
    // 调用 API 获取教练的学生列表（公开接口，无需认证）
    // 这里需要后端添加一个公开端点 /api/public/players/:phone
    const res = await fetch(`/api/public/players/${coachPhone}`)
    const data = await res.json()
    if (data.success) players.value = data.data
  }
})

function selectPlayer(player: any) {
  router.push(`/player/${player.id}`)
}
</script>

<style scoped>
.pet-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  background: rgba(255,255,255,0.08);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  transition: all 0.3s;
}
.pet-card:hover { background: rgba(255,255,255,0.12); transform: translateY(-4px); border-color: rgba(255,255,255,0.3); }
</style>
```

需要新增公开端点：

```typescript
// 在 server/src/routes/player.ts 末尾添加
import { Router as ExpressRouter } from 'express'
export const publicRouter = ExpressRouter()

publicRouter.get('/public/players/:phone', async (req, res) => {
  const coach = await db.coach.findUnique({ where: { phone: req.params.phone } })
  if (!coach) return res.status(404).json({ success: false, error: '教练不存在' })

  const players = await db.player.findMany({
    where: { coachId: coach.id, isActive: true },
    include: { pet: true },
    orderBy: { createdAt: 'asc' },
  })

  res.json({
    success: true,
    data: players.map(p => ({
      id: p.id, name: p.name, avatar: p.avatar,
      currentPoints: p.currentPoints,
      pet: p.pet ? { stage: p.pet.stage, level: p.pet.level, speciesId: p.pet.speciesId, hunger: p.pet.hunger, mood: p.pet.mood } : null,
    })),
  })
})
```

更新 `server/src/index.ts` 添加公开路由：

```typescript
import { publicRouter } from './routes/player'
app.use('/api', publicRouter)
```

- [ ] **Step 17: 提交学生选择页 + 公开端点**

```bash
git add client/src/views/player/ server/src/
git commit -m "feat: player selection page with quick-link support, public API endpoint"
```

---

### Task 11: Docker Compose 部署配置

**Files:**
- Create: `docker-compose.yml`
- Create: `nginx.conf`
- Create: `server/Dockerfile`

- [ ] **Step 1: 编写 docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: pet-motivator
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"

  server:
    build: ./server
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-postgres}@postgres:5432/pet-motivator
      JWT_SECRET: ${JWT_SECRET:-change-me-in-production}
      PORT: 3000
    depends_on:
      - postgres
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./client/dist:/usr/share/nginx/html:ro
    depends_on:
      - server
    restart: unless-stopped

volumes:
  pgdata:
```

- [ ] **Step 2: 编写 nginx.conf**

```nginx
# nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # 前端静态文件
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://server:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- [ ] **Step 3: 编写 server/Dockerfile**

```dockerfile
# server/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY src ./src/
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/index.js"]
```

- [ ] **Step 4: 提交**

```bash
git add docker-compose.yml nginx.conf server/Dockerfile
git commit -m "feat: docker compose deployment configuration"
```

---

### Task 12: 足球评分种子数据

**Files:**
- Create: `server/prisma/seed.ts`

- [ ] **Step 1: 编写种子脚本**

```typescript
// server/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/services/auth'

const db = new PrismaClient()

async function main() {
  console.log('Seeding...')

  // 创建默认管理员
  const adminExists = await db.admin.findUnique({ where: { username: 'admin' } })
  if (!adminExists) {
    await db.admin.create({
      data: {
        username: 'admin',
        passwordHash: await hashPassword('admin123'),
        createdAt: Date.now(),
      },
    })
    console.log('Admin created: admin / admin123')
  }

  // 足球维度 + 指标模板（JSON 文件形式保存在 repo 中）
  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
```

足球模板作为 JSON 数据包保存（`server/prisma/football-template.json`），在教练注册后通过 seed 或首次登录自动加载。

由于种子数据量大，足球模板存储为独立文件，在实现时由 importService 加载。

- [ ] **Step 2: 提交**

```bash
git add server/prisma/seed.ts server/prisma/football-template.json
git commit -m "feat: seed script with admin account and football scoring template"
```

---

## 实现顺序建议

| 阶段 | Task | 内容 | 可独立验证 |
|------|------|------|-----------|
| 1 | 1 | 脚手架 + 类型 | `tsc --noEmit` 通过 |
| 1 | 2 | Prisma Schema | `npx prisma generate` 通过 |
| 2 | 3, 4 | 认证 + 中间件 + 入口 | `curl /api/admin/login` 返回 token |
| 2 | 5 | Admin API | `curl` 测试全部接口 |
| 3 | 6 | Coach API | `curl` 测试全部接口 |
| 3 | 7 | Player API | `curl` 测试全部接口 |
| 4 | 8 | 前端基础架构 | `npm run dev` 前端启动 |
| 5 | 9 | 雷达图 + FIFA 卡 | 组件渲染验证 |
| 6 | 10 (分步) | 所有页面 | 逐个页面可视化验证 |
| 7 | 11 | Docker 部署 | `docker compose up` |
| 7 | 12 | 种子数据 | 教练登录后可见足球模板 |

**预计总工作量：12 个 Task，约 50-60 个步骤，分 7 个阶段。**
