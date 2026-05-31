# 星宠契约 B/S 版 — 激励系统调优方案

> 记录日期：2026-05-29
> 目标：修复数值偏差，增加激励渠道，提升孩子的长期参与动力
> 原则：24 项指标分值不动（保证雷达图科学性），通过额外渠道补充养宠积分

---

## 一、数值层面向单机版对齐

### 1.1 进化阈值调整（server/src/routes/player.ts）

| 阶段 | 原阈值 | 新阈值 | 说明 |
|------|--------|--------|------|
| egg → level1 | 20 | **100** | 与单机版 baby 对齐 |
| level1 → level2 | 60 | **300** | 与单机版 teen 对齐 |
| level2 → level3 | 150 | **600** | 与单机版 adult 对齐 |
| level3 → rare | 300 | **1000** | 与单机版 rare 对齐 |

**原因**：原阈值过低，孩子 1-2 周即可毕业，长期动力快速耗尽。

### 1.2 宠物属性衰减调整（server/src/routes/player.ts）

| 属性 | 原衰减 | 新衰减 |
|------|--------|--------|
| hunger / 小时 | 5 | **3** |
| mood / 小时 | 4 | **2** |

**原因**：衰减过快 + 喂养效果低 = 宠物太容易"生病"，产生挫败感。

### 1.3 喂养效果调整（server/src/routes/player.ts）

| 操作 | 原效果 | 新效果 |
|------|--------|--------|
| 喂食 hunger | +15 | **+25** |
| 玩耍 mood | +15 | **+20** |

**原因**：与单机版对齐，降低养护压力。

### 1.4 宠物初始值调整（server/src/routes/player.ts）

| 属性 | 原初始值 | 新初始值 |
|------|----------|----------|
| hunger | 80 | **100** |
| mood | 80 | **100** |

**原因**：让宠物出生时就充满活力，提升初始体验。

### 1.5 carePoints 上限调整

| 原上限 | 新上限 |
|--------|--------|
| 300 | **1000**（或无上限，但 stage 锁定在 rare 后不再变化） |

**原因**：与新的进化阈值对齐。

---

## 二、新增"激励积分"渠道（bonus 类型）

设计原则：
- `earn` / `penalty`：能力分，来自 24 项指标，**计入雷达图**
- `bonus`：激励分，来自签到/成就/任务，**不计入雷达图，只增加 currentPoints**

### 2.1 每日签到（server/src/routes/player.ts）

- 端点：`POST /public/player/:playerId/checkin`
- 分值：+5
- 限制：每天只能签到一次
- 类型：`bonus`
- 不计入雷达图

### 2.2 连续训练奖励（server/src/routes/player.ts）

在签到或得分时自动计算：

| 连续天数 | 奖励分值 | 类型 |
|----------|----------|------|
| 3 天 | +20 | `bonus` |
| 7 天 | +50 | `bonus` |

- 连续天数 = 最近有得分记录的连续天数
- 奖励在达到连续天数时自动发放（通过签到或教练打分时触发）

### 2.3 拼搏奖/特殊贡献（教练手动发放，已存在数据，补充发放逻辑）

- 端点：复用 `POST /coach/scores`，type 传 `bonus`
- 分值：教练自定义（建议 20-50）
- 不计入每日上限
- 不计入雷达图

---

## 三、即时反馈改进

### 3.1 PlayerDashboardPage 轮询（client/src/views/player/PlayerDashboardPage.vue）

- 每 **15 秒** 自动刷新一次数据
- 刷新范围：currentPoints、pet 状态、scoreRecords
- 如果积分有变化，显示飘字动画（+N）

---

## 四、宠物低属性轻度惩罚（server/src/routes/player.ts + 前端）

原则：**惩罚不宜过多**，轻度、可挽回。

| 条件 | 效果 | 恢复方式 |
|------|------|----------|
| hunger < 20 | 宠物显示"虚弱"，训练按钮禁用（仍可喂食） | 喂食 |
| mood < 20 | 宠物显示"不开心"，carePoints 获取减半 | 玩耍 |
| hunger = 0 持续 24h | 宠物"生病"，需要消耗 30 积分"治疗" | 治疗 API |

---

## 五、雷达图与宠物联动（后续可选增强）

当某个维度达到特定分数时，解锁宠物特效：

| 条件 | 解锁内容 |
|------|----------|
| 任一维度 ≥ 80 | 宠物获得对应颜色光环 |
| 所有维度 ≥ 60 | 宠物解锁"黄金皮肤" |
| 总分 overall ≥ 85 | 宠物名字显示金色边框 |

---

## 六、24 项指标分值说明（保持不变）

- 默认分值：5
- 关键传球：10
- 每日上限：20
- **这些分值不调整**，确保雷达图反映真实能力。

---

## 执行记录

### ✅ 2026-05-29 已完成

1. **P0：修改进化阈值、衰减速度、初始值、喂养效果、carePoints 上限**
   - 文件：`server/src/routes/player.ts`
   - 编译通过 ✅

2. **P1：新增每日签到 API + 前端入口**
   - 文件：`server/src/routes/player.ts`、`client/src/api/index.ts`、`client/src/views/player/PlayerDashboardPage.vue`
   - 端点：`POST /public/player/:playerId/checkin`
   - 编译通过 ✅

3. **P1：新增连续训练奖励逻辑**
   - 文件：`server/src/routes/player.ts`（`calculateStreakBonus` 函数）
   - 签到时自动计算连续活跃天数，触发 3 天/7 天奖励
   - 编译通过 ✅

4. **P1：PlayerDashboardPage 轮询**
   - 文件：`client/src/views/player/PlayerDashboardPage.vue`
   - 每 15 秒自动刷新宠物状态、积分、记录
   - 编译通过 ✅

5. **P2：宠物低属性惩罚（前端状态显示 + 后端限制）**
   - 文件：`server/src/routes/player.ts`、`client/src/views/player/PlayerDashboardPage.vue`、`client/src/components/player/PlayerPetCard.vue`
   - hunger < 20 时训练禁用并提示"宠物太虚弱"；mood < 20 时 carePoints 减半
   - 编译通过 ✅

6. **P2：雷达图与宠物联动特效（后续迭代）**
   - 文件：`client/src/views/player/PlayerDashboardPage.vue`、`client/src/components/player/PlayerPetCard.vue`
   - 维度≥80 解锁光环、全维度≥60 解锁黄金皮肤、overall≥85 解锁金色徽章
   - 编译通过 ✅

### 2026-05-29 魔法集市全面重构（商品系统升级）

**数据库变更**：
- ShopItem 新增字段：`emoji`, `imageUrl`, `usageType`, `usageCount`
- 执行 `prisma db push` 同步 schema

**新商品体系（13个物品，5类）**：

| 类别 | 物品 | 价格 | 机制 | 效果 |
|------|------|------|------|------|
| 🍖 食物 | 狗粮/高级罐头/能量棒 | 10-25 | consume | 饱食+20~35，部分附带心情/成长 |
| 🎀 配饰 | 蝴蝶结/围巾/皇冠 | 40-80 | equip | 装备后心情+12~20（持久） |
| 🖼️ 背景 | 森林/星空 | 80-100 | replace | 更换时心情+20~25 |
| 🧸 玩具 | 玩具球/飞盘/智能玩具 | 20-60 | consume | 心情+8~15 + 成长+3~8 |
| ✨ 魔法 | 成长药水/精灵祝福 | 80-150 | consume | 三项属性同时恢复 |

**后端改动**：
- `handleUse`：支持 consume 类型（food/toy/magic），解析 `effect.consume`
- `handleEquip`：支持 equip（配饰）和 replace（背景），解析 `effect.equip`
- `handleFeed`：修复遗漏 `mood` 字段的数据库更新 bug

**前端改动**：
- AdminShopPage：增加 emoji、图片URL、使用机制、装备装饰ID、背景ID 配置
- PlayerShopPage：显示商品 emoji 图标和使用机制标签

### 2026-05-29 属性关系重构（核心设计升级）

**核心设计**：三个属性各有主要来源，形成完整闭环

| 属性 | 主要来源 | 次要来源 | 说明 |
|------|----------|----------|------|
| **饱食 (hunger)** | 喂食 +25 | — | 解决饥饿，维持生存 |
| **心情 (mood)** | 魔法市集装备配饰 +15 | 训练 +3、喂食 +1 | **魔法市集是心情核心来源** |
| **成长 (carePoints)** | 训练 +5 | 喂食 +1 | 训练是成长核心来源 |

**改动明细**：
- `handleFeed`：hunger +25（主）、mood +1（微量满足感）、carePoints +1（微量）、**修复数据库更新遗漏 mood 的 bug**
- `handlePlay`：mood +3（运动愉悦感）、carePoints +5（主来源）
- `handleEquip`：装备配饰 mood +15、卸下 mood -8
- `handleGetPet` 衰减：hunger -3/小时、mood **-4/小时**（加快，促使孩子更频繁互动）
- 魔法市集从"可有可无"变为**心情系统核心**

### 🐛 Bug 修复记录

**问题**：心情 100 时点击喂食，心情变红（显示异常）
**根因**：`handleFeed` 的数据库 `db.pet.update()` 中**遗漏了 `mood` 字段**，导致心情值没有持久化。结合 tsx watch 未自动重启，新旧代码混用导致前端接收到 undefined 心情值，进度条显示为红色（`undefined > 60` 为 false）。
**修复**：在 `db.pet.update()` 中添加 `mood: pet.mood`，并手动重启后端服务确保代码生效。

### ✅ 全部完成

所有 P0/P1/P2 任务已执行完毕，前后端编译 0 错误。

### 2026-05-29 UI 改进补充

7. **进化门槛检查**：carePoints 达标后需 hunger ≥ 50 且 mood ≥ 50 才能进化，否则提示"宠物状态不好，先照顾好它再进化吧！"
8. **喂食特效**：点击喂食/训练时，飘出 ❤️⭐🍖✨🎉💖 粒子动画（1.2 秒）
9. **进化大特效**：进化成功时全屏庆祝动画，彩带飘落 + "✨ 进化成功！✨"大字弹出（2.5 秒）
10. **LV 标签位置**：从 player-pet-card 绝对定位改为 pet-stage-area 右上角，圆角矩形卡片内更显眼
11. **宠物卡片去圆形**：pet-stage-area 从圆形（border-radius: 50%）改为圆角矩形（border-radius: 20px），尺寸 180×180
12. **背景更换支持**：PlayerPetCard 新增 `backgroundUrl` prop，后端 handleGetPet 查询 `PetBackgroundDef` 表返回背景数据
13. **状态值修复**：后端 API 已正确返回 `status` 字段，前端已重新加载
