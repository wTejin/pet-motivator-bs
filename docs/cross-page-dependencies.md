# 跨页面关联数据/逻辑文档

> 本文档梳理 `pet-motivator-bs` 中在不同页面间共享的数据实体和业务逻辑。当你修改某个后台配置或数据模型时，按此文档检查所有受影响的页面，确保联动更新。

---

## 1. 宠物物种定义 (PetSpeciesDef)

**数据存储**：`PetSpeciesDef` 表（Prisma）
**核心字段**：`id`, `name`, `category`, `emoji`, `backgroundColor`, `accentColor`, `stages` (JSON)

### 1.1 stages JSON 结构
```ts
Record<string, { emoji: string; imageUrl?: string; label: string }>
// 标准键：egg → level1 → level2 → level3 → rare
```

### 1.2 影响页面矩阵

| 改动项 | 受影响页面/组件 | 影响方式 |
|--------|----------------|---------|
| `emoji` (物种级) | 队员选择页 (`PlayerDashboardPage.vue`) | 物种卡片头部展示 |
| `stages[x].emoji` | `PlayerPetCard.vue`, `TeamPetCard.vue` | 宠物按当前 `stage` 渲染对应 emoji |
| `stages[x].imageUrl` | `PlayerPetCard.vue`, `TeamPetCard.vue` | 宠物按当前 `stage` 渲染对应图片 |
| `stages[x].label` | `TeamPetCard.vue` (stageLabel) | 阶段中文标签 |
| `backgroundColor` | 队员选择页 (`PlayerDashboardPage.vue`) | 物种卡片背景色 |
| `accentColor` | — | 预留，暂无前端使用 |

### 1.3 后端接口
- **管理 CRUD**：`admin.ts` — `GET/POST/PUT/DELETE /pet-species`
- **公开查询**：`player.ts` — `GET /public/pet-species`

### 1.4 联动检查清单（改物种配置后必查）
- [ ] `AdminPetSpeciesPage.vue` 保存成功
- [ ] `PlayerDashboardPage.vue` 无宠物时：物种卡片展示完整阶段预览
- [ ] `PlayerDashboardPage.vue` 有宠物时：`PlayerPetCard` 按当前 stage 正确显示 emoji/image
- [ ] `TeamScreenPage.vue` → `TeamPetCard` 同上
- [ ] 前后端默认 `DEFAULT_STAGE_EMOJI` 一致（`level3` = `🐤`）

---

## 2. 宠物实例 (Pet)

**数据存储**：`Pet` 表
**核心字段**：`playerId`, `speciesId`, `stage`, `carePoints`, `level`, `hunger`, `mood`, `currentSkin`, `equippedDecorations`

### 2.1 影响页面矩阵

| 改动项 | 受影响页面/组件 | 影响方式 |
|--------|----------------|---------|
| `stage` | `PlayerPetCard.vue`, `TeamPetCard.vue` | 外观切换（通过 `species.stages[stage]`） |
| `stage` | `PlayerDashboardPage.vue` | 进化特效触发、stageLabel 显示 |
| `carePoints` | `PlayerDashboardPage.vue` | 成长进度条计算 |
| `hunger` / `mood` | `PlayerDashboardPage.vue` | 状态条、操作限制（虚弱无法训练） |
| `currentSkin` | `PlayerPetCard.vue` | 背景图替换 |
| `equippedDecorations` | `PlayerPetCard.vue`, `TeamPetCard.vue` | 配饰叠加 |
| `level` | `PlayerPetCard.vue`, `TeamPetCard.vue` | 等级徽章 |

### 2.2 后端接口
- `player.ts` — `GET /:playerId/pet` (含离线衰减计算)
- `player.ts` — `POST /:playerId/pet/feed`
- `player.ts` — `POST /:playerId/pet/play`
- `player.ts` — `POST /:playerId/shop/use` (道具可能触发进化)
- `player.ts` — `PUT /:playerId/shop/equip` (装备改变心情)
- `publicRouter` 暴露同名公开端点

### 2.3 关键业务规则（修改时需同步）
- **进化阈值**：egg(0) → level1(100) → level2(300) → level3(600) → rare(1000)
- **进化条件**：`hunger >= 50 && mood >= 50`，否则进化被阻塞
- **离线衰减**：每小时 `hunger -3`, `mood -2`（在 `handleGetPet` 中计算）
- **喂食**：-5 积分, +25 饱食, +1 心情, +1 成长点
- **训练**：-5 积分, +3 心情, +5 成长点（虚弱时无法训练，不开心时效果减半）

---

## 3. 教练配置 (Coach)

**数据存储**：`Coach` 表
**核心字段**：`playerMode` (`'open' | 'display'`)

### 3.1 影响页面矩阵

| 改动项 | 受影响页面 | 影响方式 |
|--------|-----------|---------|
| `playerMode` | `PlayerDashboardPage.vue` | `open`=可操作, `display`=只读（所有操作按钮禁用） |
| `playerMode` | 商店页 | 购买/装备/使用按钮禁用 |
| `playerMode` | 签到按钮 | 禁用 |

### 3.2 后端接口
- `player.ts` — `GET /:playerId/mode`
- `publicRouter` — `GET /public/mode/:phone`

---

## 4. 评分维度/指标 (ScoreDimension / ScoreIndicator)

**数据存储**：`ScoreDimension` + `ScoreIndicator` 表

### 4.1 影响页面矩阵

| 改动项 | 受影响页面/组件 | 影响方式 |
|--------|----------------|---------|
| 维度/指标增删 | `FifaPlayerCard.vue` | 能力卡雷达图数据 |
| 维度/指标增删 | `PlayerDashboardPage.vue` | 总分、维度分展示 |
| `dailyLimit` | 后端统计计算 | 维度满分 = `Σ(indicator.dailyLimit * 7)` |
| `isActive` | 所有统计端点 | 仅活跃维度/指标参与计算 |

### 4.2 后端接口
- `coach.ts` — 维度/指标 CRUD
- `player.ts` — `GET /public/dimensions/:phone`
- `player.ts` — `GET /public/player-stats/:phone/:playerId`

---

## 5. 商店/背包 (ShopItem / PlayerInventory)

**数据存储**：`ShopItem` + `PlayerInventory` 表

### 5.1 影响页面矩阵

| 改动项 | 受影响页面 | 影响方式 |
|--------|-----------|---------|
| 商品增删 | `PlayerDashboardPage.vue` (背包面板) | 可购买/使用物品列表 |
| 商品 `effect` | 宠物状态 | 消耗品可能改变 `hunger`/`mood`/`carePoints` |
| `usageType` | 操作逻辑 | `consume`=直接使用, `equip`=装备, `replace`=替换背景 |

---

## 6. 学员 (Player)

**数据存储**：`Player` 表
**核心字段**：`name`, `avatar`, `currentPoints`, `isActive`

### 6.1 影响页面矩阵

| 改动项 | 受影响页面 | 影响方式 |
|--------|-----------|---------|
| `currentPoints` | `PlayerDashboardPage.vue`, `TeamScreenPage.vue` | 积分显示、排行榜 |
| `avatar` | `PlayerDashboardPage.vue`, `TeamScreenPage.vue` | 头像展示 |
| `isActive` | 所有查询端点 | 非活跃学员被过滤 |

---

## 7. 类型定义一致性（shared/types.ts）

修改类型后，必须同步检查前后端所有使用该类型的文件。

### 7.1 当前关键类型
```ts
type PetStage = 'egg' | 'level1' | 'level2' | 'level3' | 'rare'
type PetCategory = 'dog' | 'cat' | 'dragon' | 'fantasy' | 'ocean' | 'cute'
type ScoreType = 'earn' | 'spend' | 'bonus' | 'penalty' | 'system'
type PlayerModeType = 'open' | 'display'
type ShopItemType = 'food' | 'decoration' | 'special'
```

### 7.2 已知坑点
- `PetStage` 曾定义为 `'egg'|'baby'|'teen'|'adult'|'rare'`，但后端实际存储 `'level1'|'level2'|'level3'`。已修复为 `'egg'|'level1'|'level2'|'level3'|'rare'`。
- 后端保留 `STAGE_TO_LEVEL` 兼容映射 (`baby→2, teen→3, adult→4`) 以兼容旧数据。

---

## 8. 修改工作流（按此执行）

当需要修改某个跨页面共享的数据/逻辑时：

1. **定位影响范围**：在此文档中找到对应数据实体，查看"影响页面矩阵"
2. **检查类型定义**：如果修改了数据结构，同步更新 `shared/types.ts`
3. **修改后端接口**：确保 API 返回的数据包含前端所需的新字段
4. **修改前端页面**：按矩阵逐个调整受影响的页面/组件
5. **验证默认值**：确保前后端默认值一致（emoji、label、阈值等）
6. **编译检查**：`server` 和 `client` 分别执行 type-check
7. **功能验证**：在真实场景中测试联动效果

---

*最后更新：2026-05-30*
