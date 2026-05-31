# 宠物选择与管理系统设计文档

> **目标：** 让新队员在大屏幕上可以选择自己的宠物；建立完整的宠物物种数据库（5级成长：蛋→lev1→lev2→lev3→稀有）；管理端支持对宠物物种的完整CRUD管理。

---

## 1. 数据模型

### 1.1 Prisma Schema（已存在，无需新增表）

`PetSpeciesDef` 模型已包含足够字段：
```prisma
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
```

`stages` JSON 结构（5阶段）：
```json
{
  "egg":    { "emoji": "🥚", "imageUrl": "", "label": "蛋" },
  "level1": { "emoji": "🐶", "imageUrl": "", "label": "lev1" },
  "level2": { "emoji": "🐕", "imageUrl": "", "label": "lev2" },
  "level3": { "emoji": "🐕", "imageUrl": "", "label": "lev3" },
  "rare":   { "emoji": "🦊", "imageUrl": "", "label": "稀有" }
}
```

### 1.2 Pet 模型

```prisma
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
```

---

## 2. API 设计

### 2.1 公共 API（无需登录）

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/public/pet-species` | 获取所有宠物物种列表 |
| `POST` | `/public/player/:playerId/pet/create` | 为指定玩家创建宠物（传入 `{ speciesId }`） |

### 2.2 管理端 API（管理员）

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/admin/pet-species` | 获取所有宠物物种 |
| `POST` | `/admin/pet-species` | 新增物种 |
| `PUT` | `/admin/pet-species/:id` | 更新物种 |
| `DELETE` | `/admin/pet-species/:id` | 删除物种 |

### 2.3 响应格式

`GET /public/pet-species`:
```json
{
  "success": true,
  "data": [
    {
      "id": "puppy",
      "name": "小狗",
      "category": "dog",
      "emoji": "🐶",
      "stages": {
        "egg": { "emoji": "🥚", "imageUrl": "", "label": "蛋" },
        "level1": { "emoji": "🐶", "imageUrl": "", "label": "lev1" },
        "level2": { "emoji": "🐕", "imageUrl": "", "label": "lev2" },
        "level3": { "emoji": "🐕", "imageUrl": "", "label": "lev3" },
        "rare": { "emoji": "🦊", "imageUrl": "", "label": "稀有" }
      }
    }
  ]
}
```

`POST /public/player/:playerId/pet/create`:
```json
// Request body
{ "speciesId": "puppy" }

// Response
{
  "success": true,
  "data": {
    "id": "pet-xxx",
    "playerId": "player-xxx",
    "speciesId": "puppy",
    "name": "小狗",
    "stage": "egg",
    "carePoints": 0,
    "level": 1,
    "hunger": 100,
    "mood": 100
  }
}
```

---

## 3. 后端变更

### 3.1 getStageByCarePoints 函数更新

将现有的阶段判断从 `egg/baby/teen/adult/rare` 映射为 `egg/level1/level2/level3/rare`：

```typescript
function getStageByCarePoints(carePoints: number): string {
  if (carePoints >= 300) return 'rare'
  if (carePoints >= 150) return 'level3'
  if (carePoints >= 60) return 'level2'
  if (carePoints >= 20) return 'level1'
  return 'egg'
}
```

### 3.2 创建宠物逻辑

在 `player.ts` 公共路由中新增 `POST /public/player/:playerId/pet/create`：
- 查找 player 是否存在
- 查找 speciesId 是否存在
- 检查 player 是否已有 pet（已有则报错）
- 创建 Pet 记录，stage = "egg"
- 返回创建的 pet 数据

---

## 4. 前端流程

### 4.1 大屏幕宠物选择弹窗

**触发条件：** 无宠物的队员（`player.pet === null`）点击自己的卡片。

**弹窗内容：**
- 标题：「选择你的宠物」
- 网格展示所有可用物种（每个物种卡片显示 emoji + 名称）
- 点击物种 → 确认弹窗 → 调用 `POST /public/player/:playerId/pet/create`
- 成功后关闭弹窗，大屏幕刷新，卡片显示为 🥚

**有宠物的队员：** 点击卡片直接进入 Dashboard（现有逻辑）。

### 4.2 管理端宠物管理页面

**路径：** `/admin/pet-species`

**功能：**
- 物种列表（名称、emoji、category）
- 展开编辑：每个物种的 5 个阶段可以编辑 emoji 和 imageUrl
- 新增物种：输入 id、name、category、emoji，自动生成默认 5 阶段 JSON
- 删除物种（带确认）

### 4.3 TeamPetCard 组件改造

- 有宠物时：显示当前阶段的 emoji/image + 等级
- 无宠物时：显示「🥚 + 点击选择宠物」提示

---

## 5. 文件结构

| 文件 | 变更 |
|------|------|
| `server/src/routes/player.ts` | 新增创建宠物端点、修改阶段判断函数 |
| `server/src/routes/admin.ts` | 新增宠物物种 CRUD |
| `client/src/api/index.ts` | 新增 `publicApi.getPetSpecies`、`publicApi.createPlayerPet`、管理端 API |
| `client/src/views/team/TeamScreenPage.vue` | 新增宠物选择弹窗逻辑 |
| `client/src/components/team/TeamPetCard.vue` | 无宠物时显示选择提示 |
| `client/src/views/admin/AdminLayout.vue` | 导航栏添加「宠物管理」 |
| `client/src/views/admin/AdminPetSpeciesPage.vue` | **新建** 管理端宠物管理页面 |
| `client/src/router/index.ts` | 添加 `/admin/pet-species` 路由 |
