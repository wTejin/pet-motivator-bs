# 星宠契约 B/S 版 — 数据架构设计文档

**版本**: v2.0.0  
**日期**: 2026-06-03  
**状态**: 融合 Bio-Leap 统一评估体系  

---

## 一、系统概述

星宠契约是一个面向青少年足球青训的激励系统。核心闭环：

```
教练评估(Bio-Leap) → 能力雷达 + 积分激励 → 学员花积分养宠物 → 宠物进化 → 成就感
                         ↓
              品德激励(自定义加分) → 额外积分（不计入能力雷达）
```

**v2.0 重大变更**：
- ✅ 废弃 ScoreDimension/ScoreIndicator 旧评分体系（从未实现）
- ✅ Bio-Leap 6维评估引擎作为唯一能力评估体系
- ✅ DailyAssessment 自动折算积分，打通"评估→激励"链路
- ✅ CustomIndicator 重新定位为"行为激励"（品德/习惯加分）
- ✅ Pipeline 计算后产生积分奖励

**数据设计原则**:
- 能力数据（Bio-Leap Pipeline）与激励数据（积分/宠物）通过 DailyAssessment → ScoreRecord 打通
- 积分是通用货币，连接训练表现与游戏化反馈
- 品德激励（bonus）独立通道，不计入足球能力雷达
- 宠物成长提供视觉化的长期反馈，维持学员持续参与动力

---

## 二、核心数据流

### 2.1 主干数据流（统一激励闭环）

```
┌──────────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  教练端           │     │  积分系统    │     │  学员端      │     │  宠物系统    │
│  DailyAssessment │────▶│  ScoreRecord│────▶│  Player     │────▶│  Pet        │
│  (6维+12子指标)  │     │  (earn)     │     │  currentPts │     │  carePoints │
│                  │     │             │     │             │     │  hunger/mood│
│  CustomIndicator │────▶│  ScoreRecord│     │  ShopItem   │     │  进化阶段    │
│  (行为激励)       │     │  (bonus)    │     │  购买/使用   │     │             │
└──────────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
         │                      ▲                    │                   │
         │                      │                    │                   │
         ▼                      │                    ▼                   ▼
┌──────────────────┐     ┌─────────────┐     ┌─────────────────────────────┐
│ PhysicalTest     │     │ 签到 & 连续  │     │ Pipeline 成长奖励            │
│ PlayerBiometric  │     │ 活跃 bonus  │     │ overall≥40 触发 bonus 积分   │
└────────┬─────────┘     └─────────────┘     └─────────────────────────────┘
         │
         ▼
┌──────────────────┐
│ Pipeline         │
│ (3步+锚点融合)    │
│   ↓              │
│ PipelineSnapshot │──▶ BioLeapPlayerCard (能力雷达+FIFA卡)
└──────────────────┘
```

**流程说明**:
1. 教练在训练中做每日评估（6维度 1-5星） → 创建 `DailyAssessment` + 自动创建 `ScoreRecord(type='earn')`
2. 学员 `currentPoints` 增加（均星×2，最低1分）
3. 教练可通过"行为激励"按钮给品德/习惯加分 → `ScoreRecord(type='bonus')`
4. 学员在魔法市集购买物品 → 积分消耗 → `TransactionRecord`
5. 学员喂养/玩耍宠物 → 宠物属性提升 → 达标进化
6. Pipeline 周期计算 → 能力成长奖励 bonus 积分（7天冷却）

### 2.2 能力数据流（Bio-Leap 评估管道）

```
┌─────────────────┐
│ DailyAssessment │  教练每日6维打分（1-5星）+ 12子指标
│   ↓             │
│ EMA 去噪        │  α=0.2 指数移动平均（30-90天窗口）
│   ↓             │
│ PhysicalTest锚点 │  techExec/engagement 融合体测数据（wPt 按90天衰减，最高0.4）
│   ↓             │
│ Mirwald 成熟度  │  4步回归算法修正（身高/体重/坐高 → PHV偏移量）
│   ↓             │
│ 环境对冲        │  晚熟+高压 ×1.25 / 早熟+完美 ×0.85
│   ↓             │
│ PipelineSnapshot│  6维分数(0-99) + overall(0-99) + potentialTier + 趋势
│   ↓             │
│ BioLeapPlayerCard + TrendLineChart
└─────────────────┘
```

**关键规则**:
- `earn` 类型的 ScoreRecord **计入积分累计**，但能力雷达直接读 PipelineSnapshot（不再聚合 ScoreRecord）
- `bonus` 类型的 ScoreRecord **不计入能力评估**（签到/品德激励/成长奖励）
- `penalty` 类型的 ScoreRecord 扣减积分
- DailyAssessment 的 `type='earn'` 记录关联训练表现；CustomIndicator 的 `type='bonus'` 记录关联品德行为

### 2.3 辅助数据流

**每日签到**: `POST /public/player/:playerId/checkin` → ScoreRecord(type='bonus', reason='每日签到', points=5)

**连续活跃奖励**: 签到时自动计算最近有得分记录的连续天数 → 3天奖励+20，7天奖励+50

**宠物状态惩罚**:
- hunger < 20 → 宠物"虚弱"，训练按钮禁用
- mood < 20 → 宠物"不开心"，carePoints 获取减半
- 进化门槛：carePoints 达标但 hunger < 50 或 mood < 50 → 拒绝进化

---

## 三、数据模型关系图

```
┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐
│  Admin   │◄──────│  Coach   │◄──────│  Player  │◄──────│   Pet    │
│(系统管理) │  管理  │(教练)    │  执教  │(学员)    │  养育  │(宠物)    │
└──────────┘       └────┬─────┘       └────┬─────┘       └──────────┘
                        │                  │
                        │    ┌─────────────┼─────────────┐
                        │    │             │             │
                        ▼    ▼             ▼             ▼
                   ┌────────────┐  ┌────────────┐  ┌────────────┐
                   │ScoreDimension│  │ BonusRule  │  │ScoreRecord │
                   │ScoreIndicator│  │ ShopItem   │  │PlayerInventory│
                   │CustomIndicator│  │(coach自定义)│  │            │
                   └────────────┘  └────────────┘  └────────────┘
                        │
                        ▼
                   ┌────────────┐
                   │ PetSpeciesDef│ 全局定义（物种/阶段）
                   │ ShopItem     │ 全局商品（coachId=null）
                   │ PetBackgroundDef│
                   │ AccessoryDef │
                   └────────────┘
```

---

## 四、实体详细设计

### 4.1 账号体系

| 实体 | 职责 | 关键字段 |
|------|------|---------|
| **Admin** | 系统管理员 | username, passwordHash |
| **Coach** | 教练（班级管理者） | phone, name, school, isActive, trialUntil, authorizedUntil, playerMode(open/display), teamName, teamLogo |
| **Player** | 学员（学生/球员） | coachId, name, avatar, age, currentPoints(积分余额), lifetimePoints(历史累计), isActive |

**Coach 状态机**:
```
注册 → 7天试用期 ──▶ 管理员授权 ──▶ 正式使用
  │                    │
  ▼                    ▼
停用(isActive=false)  过期(authorizedUntil < now)
```

### 4.2 积分系统

**ScoreRecord —— 积分变动流水（核心表）**

| 字段 | 说明 |
|------|------|
| coachId | 所属教练 |
| playerId | 所属学员 |
| indicatorId | 关联指标（可选） |
| points | 变动分值（正=获得，负=消耗） |
| type | **earn**=能力分 / **penalty**=惩罚 / **bonus**=激励 / **spend**=消费 |
| reason | 变动原因描述 |
| operatorType | coach/system |

**type 的语义区分**:

| type | 计入雷达图 | 增加currentPoints | 增加lifetimePoints | 典型场景 |
|------|-----------|------------------|-------------------|---------|
| earn | ✅ | ✅ | ✅ | 教练打分"传接球+5" |
| penalty | ✅ | ❌(可能扣减) | ❌ | 违规扣分 |
| bonus | ❌ | ✅ | ✅ | 签到+5 / 全勤奖+50 |
| spend | ❌ | ❌(已扣减) | ❌ | 购买/喂食/训练消费 |

**⚠️ 已废弃**: `spend` 类型已从 ScoreRecord 拆分到 TransactionRecord。ScoreRecord 仅保留 earn / bonus / penalty 三种类型。

### 4.3 能力评估体系（Bio-Leap 统一引擎）

**v2.0**: 旧版 ScoreDimension/ScoreIndicator 体系已废弃。能力评估统一使用 Bio-Leap 引擎。

**Bio-Leap 6 维度**（定义见 `shared/types.ts → BIO_LEAP_DIMENSIONS`）:

| 维度 key | 中文名 | 图标 | 评估方式 |
|----------|--------|------|---------|
| spatialIq | 空间觉察 | 🧠 | 每日直接打分 + 3子指标（视觉扫描/决策速度/无球跑位） |
| techExec | 技术执行 | ⚽ | 每日直接打分 + PhysicalTest 锚点融合 |
| engagement | 执行饱和度 | 💪 | 每日直接打分 + PhysicalTest 锚点融合 |
| resilience | 挫折复原力 | 🛡️ | 每日直接打分 + 3子指标（失误回追/防守对抗/再接球） |
| altruism | 无私协作性 | 🤝 | 每日直接打分 + 3子指标（沟通/补位/不熟悉位置） |
| envNoise | 环境抗噪度 | 🏠 | 每日直接打分 + 3子指标（家长行为/出勤/装备自理） |

**评估数据表**:
- `DailyAssessment` — 教练每日 6维 1-5星 + 12子指标打分
- `PhysicalTest` — 月度/季度 10项运动表现体测
- `PlayerBiometric` — 季度身体测量（身高/体重/坐高）

**Pipeline 算法**: 见 §5.2

**CustomIndicator（行为激励）** — v2.0 重新定位:
- 教练自定义的**品德/习惯加分项**（如：收拾器材、内务整洁、帮助队友）
- 不关联 Bio-Leap 维度，独立存在
- 创建 ScoreRecord(type='bonus')，不计入足球能力雷达
- 受 `dailyLimit` 限制，防止过度加分
- 这是教育功能，与足球能力评估分离

### 4.4 宠物系统

**Pet（宠物实例）**

| 字段 | 说明 |
|------|------|
| playerId | 1:1 关联学员 |
| speciesId | 物种定义（PetSpeciesDef） |
| name | 宠物名字 |
| stage | 当前阶段：egg/level1/level2/level3/rare |
| level | 等级（1-5，与 stage 同步） |
| carePoints | 成长值（0-1000） |
| hunger | 饱食度（0-100） |
| mood | 心情（0-100） |
| equippedDecorations | 已装备配饰ID列表 |
| currentSkin | 当前背景 |

**进化阈值**:

| 阶段 | carePoints阈值 | 对应stage |
|------|---------------|----------|
| 蛋 | 0 | egg |
| 幼崽 | 100 | level1 |
| 少年 | 300 | level2 |
| 成年 | 600 | level3 |
| 稀有 | 1000 | rare |

**进化门槛**: carePoints 达标 **且** hunger ≥ 50 **且** mood ≥ 50，否则拒绝进化。

**属性衰减**（离线计算）:
- hunger: -3 / 小时
- mood: -2 / 小时
- 获取宠物时（handleGetPet）自动计算衰减并更新

**状态惩罚**:
- hunger < 20: 宠物"虚弱"，训练禁用
- mood < 20: 宠物"不开心"，carePoints 获取减半

**属性关系闭环**:

| 属性 | 主要来源 | 次要来源 | 说明 |
|------|---------|---------|------|
| **饱食(hunger)** | 喂食 +25 | — | 解决饥饿，维持生存 |
| **心情(mood)** | 装备配饰 +15 | 训练 +3、喂食 +1 | 魔法市集是心情核心来源 |
| **成长(carePoints)** | 训练 +5 | 喂食 +1 | 训练是成长核心来源 |

### 4.5 商店系统

**ShopItem（商品定义）**

| 字段 | 说明 |
|------|------|
| coachId | null=全局商品（Admin管理）；非null=教练自定义 |
| type | food/accessory/background/toy/magic |
| usageType | consume（消耗）/ equip（装备）/ replace（替换） |
| price | 积分价格 |
| effect | JSON: {consume:{hunger,mood,carePoints}} 或 {equip:{moodBonus,decoration,backgroundId}} |
| stock | 库存 |
| isActive | 是否上架 |

**PlayerInventory（学员背包）**

| 字段 | 说明 |
|------|------|
| playerId | 所属学员 |
| itemId | 关联商品 |
| quantity | 数量 |
| isEquipped | 是否已装备（配饰/背景） |

**商品效果矩阵**:

| 类别 | 物品 | usageType | 效果 |
|------|------|-----------|------|
| 🍖 食物 | 狗粮/罐头/能量棒 | consume | 饱食+20~35，部分附带心情/成长 |
| 🎀 配饰 | 蝴蝶结/围巾/皇冠 | equip | 装备后心情+12~20（持久），卸下-8 |
| 🖼️ 背景 | 森林/星空 | replace | 更换时心情+20~25 |
| 🧸 玩具 | 玩具球/飞盘/智能玩具 | consume | 心情+8~15 + 成长+3~8 |
| ✨ 魔法 | 成长药水/精灵祝福 | consume | 三项属性同时恢复 |

---

## 五、关键实现逻辑

### 5.1 积分获取（统一通道）

**训练评估 → 积分**: `assessmentRouter.post('/players/:playerId/assessments')`
```
1. 教练提交 6维评分（1-5星）
2. 计算 avgScore = 6维平均值
3. earnPoints = max(1, round(avgScore × 2))
   - 1星均分 → 2分 | 3星均分 → 6分 | 5星均分 → 10分
4. 事务写入：DailyAssessment + ScoreRecord(type=earn) + Player.currentPoints
5. 宠物联动：careBonus (均星≥4→15, ≥3→10, 其他→5)
6. 异步：触发 Pipeline 重算
```

**行为激励 → 积分**: `coachRouter.post('/scores')`
```
1. 教练点击 CustomIndicator 按钮或快速加分
2. 创建 ScoreRecord(type=bonus) + 更新 currentPoints
3. 不计入能力雷达
```

**签到 → 积分**: `publicRouter.post('/public/player/:playerId/checkin')`
```
1. 每日签到 +5 bonus 积分
2. 连续3天额外 +20，连续7天额外 +50
```

**Pipeline 成长奖励**: `pipelineRouter.post('/players/:playerId/compute')`
```
1. overall≥80 → +15 bonus 积分 (7天冷却)
2. overall≥60 → +10 bonus 积分
3. overall≥40 → +5 bonus 积分
```

### 5.2 管道计算（computePipeline）

详见 `server/src/services/pipeline/index.ts`

```
1. EMA 去噪 (α=0.2) — 对90天内 DailyAssessment 做指数移动平均
2. PhysicalTest 锚点融合 — techExec/engagement 融合体测数据
3. Mirwald 成熟度修正 — 4步回归（身高/体重/坐高/年龄）
4. 环境对冲 — 晚熟+高压×1.25 / 早熟+完美×0.85
5. 输出 → PipelineSnapshot（6维分数 + overall + potentialTier）
```

### 5.3 宠物成长与进化（handleFeed / handlePlay）

```
1. 扣除积分（喂食5分 / 训练5分）
2. 更新宠物属性
3. 计算新阶段：getStageByCarePoints(carePoints)
4. 如果新阶段 ≠ 旧阶段：
   - 检查 hunger ≥ 50 且 mood ≥ 50
   - 通过 → 进化，更新 stage/level/evolvedAt
   - 不通过 → evolutionBlocked=true，保持原阶段
5. 创建 TransactionRecord(type='feed'/'play') — v2.0 消费记录已从 ScoreRecord 拆分
6. 返回新状态和进化结果
```

### 5.4 连续活跃奖励（calculateStreakBonus）

```
1. 查询该学员所有 type∈[earn,bonus] 且 points>0 的 ScoreRecord
2. 提取活跃日期（去重）
3. 从今天往前数，计算连续有记录的天数
4. 如果连续3天且未发过3天奖励 → 创建 bonus 记录 +20
5. 如果连续7天且未发过7天奖励 → 创建 bonus 记录 +50
```

### 5.5 教练权限开关（playerMode）

| 模式 | 学生端表现 |
|------|-----------|
| **open** | 可喂食、训练、购买、装备、使用物品 |
| **display** | 仅可查看宠物和球员卡，所有操作按钮禁用 |

控制点：handleFeed / handlePlay / handleBuy / handleEquip / handleUse 的入口处检查 `player.coach.playerMode !== 'open'`。

---

## 六、各页面数据职责

### 6.1 管理后台（Admin）

| 页面 | 数据来源 | 核心操作 |
|------|---------|---------|
| Dashboard | `/admin/stats` + `/admin/coaches` | 查看全局概览和预警 |
| Coaches | `/admin/coaches` | 教练CRUD、授权延期、停用/启用 |
| Shop | `/admin/shop-items` | 全局商品CRUD、上下架 |
| PetSpecies | `/admin/pet-species` | 物种定义管理、阶段图片上传 |

### 6.2 教练端（Coach）

| 页面 | 数据来源 | 核心操作 |
|------|---------|---------|
| Score（统一记分） | `/coach/players` + Bio-Leap 维度 | 体测录入 + 每日评估(6维) + 行为激励 |
| Players | `/coach/players` | 学生CRUD（含 bio-leap 字段） |
| PlayerDetail | `/coach/player-stats/:playerId` + Pipeline | 能力雷达(FIFA卡) + 趋势图 + 管道详情 |
| Dashboard | `/coach/dashboard-stats` | 班级今日/累计统计 |
| Assessment | `/coach/players/:id/assess` | 球员独立评估页（完整6维+子指标） |
| PhysicalTest | `/coach/players/:id/physical-test` | 球员体测管理页 |
| Biometrics | `/coach/players/:id/biometrics` | 球员身体测量页 |

> **v2.0**: ScoreConfig 页面已删除。旧维度/指标 CRUD 由 Bio-Leap 固定 6 维度 + CustomIndicator 行为激励取代。

### 6.3 学生端（Player / Public）

| 页面 | 数据来源 | 核心操作 |
|------|---------|---------|
| Dashboard | `/public/player/:playerId/pet` + `/public/player-stats` | 查看宠物、球员卡、喂食、训练、签到 |
| Shop | `/public/player/:playerId/shop` | 购买、装备、使用物品 |
| TeamScreen | `/public/players/:phone` | 大屏展示全班宠物卡片 |

---

## 七、当前设计问题与改进建议

### 7.1 数据表设计问题

| 问题 | 影响 | 状态 |
|------|------|------|
| ~~`ScoreRecord` 混合能力分、激励分、消费记录~~ | 语义混乱 | ✅ **v2.0 已修复**：消费记录已拆分到 TransactionRecord；能力分(earn)仅来自 DailyAssessment；激励分(bonus)来自行为激励/签到/Pipeline |
| ~~雷达图实时聚合~~ | 数据量大时性能下降 | ✅ **v2.0 已修复**：雷达图直接读取 PipelineSnapshot 预计算结果 |
| `lifetimePoints` 只增不减 | 与 currentPoints 的语义关系不清晰 | ⚠️ 待处理：明确 lifetimePoints = 历史累计总收入 |
| Pet 表缺少 `isSick` 字段 | 生病状态用 hunger=0 推断 | ⚠️ 待处理 |

### 7.2 数据一致性问题

| 问题 | 说明 | 建议 |
|------|------|------|
| 积分扣减与 ScoreRecord 创建非原子操作 | 可能出现积分扣了但记录没创建 | 使用数据库事务包裹 |
| 宠物进化与属性更新非原子操作 | 中间状态可能导致数据不一致 | 使用事务 |
| 库存扣减与购买记录非原子操作 | 高并发下可能出现超卖 | 使用事务或乐观锁 |

### 7.3 业务逻辑漏洞

| 问题 | 说明 | 建议 |
|------|------|------|
| 每日上限检查基于 `createdAt` 的时间戳比较 | 如果服务器时区与客户端不一致，边界情况可能出错 | 统一使用 UTC 时间戳，或增加服务端时区配置 |
| `calculateStreakBonus` 的奖励不可重复触发 | 但查询条件只检查 reason 字段，如果教练手动创建同名 reason 的 bonus 会误判 | 增加 streakBonus 专用标记字段 |
| 教练删除学员时级联删除宠物、积分记录、背包 | 数据永久丢失，无法恢复 | 增加软删除（isActive=false），或归档机制 |

### 7.4 缺失的数据关联

| 缺失 | 说明 | 状态 |
|------|------|------|
| ~~评估→积分链路断裂~~ | DailyAssessment 不产生 ScoreRecord | ✅ **v2.0 已修复**：评估自动折算积分 |
| ~~Pipeline→积分链路断裂~~ | 管道计算不奖励积分 | ✅ **v2.0 已修复**：overall≥40 触发 bonus |
| 宠物与能力数据深度联动 | 当前仅通过特效弱关联 | ⚠️ 待改进 |
| 训练课次（session）模型 | sessionId 字段存在但无关联表 | 📋 计划中 |
| 学员 attendance（出勤）记录 | 全勤奖依赖 ScoreRecord 推断 | 📋 计划中 |
| 商店销售统计 | Admin 无法看到商品受欢迎度 | 📋 计划中 |
| 积分消耗分布 | 教练无法看到学员积分去向 | 📋 计划中 |

---

## 八、数据量估算与性能建议

| 实体 | 单教练估算 | 100教练估算 | 索引建议 |
|------|-----------|------------|---------|
| Player | 20-50人 | 2,000-5,000人 | coachId + isActive |
| ScoreRecord | 100条/人/年 | 200万条/年 | playerId + createdAt（复合索引） |
| Pet | 1:1 Player | 2,000-5,000 | playerId（唯一） |
| PlayerInventory | 10-30条/人 | 2万-15万 | playerId + itemId |
| ShopItem | 全局13 + 自定义若干 | 全局13 + 自定义 | coachId + isActive |

**ScoreRecord 是最大表**，建议：
1. 按时间分区（PostgreSQL 原生支持）
2. 增加 `PlayerStats` 预计算表，避免全量聚合
3. 定期归档超过 1 年的历史记录

---

## 九、待实现数据模型（预留）

```prisma
// ✅ 已实现：TransactionRecord（消费流水已拆分）
// ✅ 已实现：PipelineSnapshot（替代 PlayerStatsCache，提供预计算能力数据）

// 训练课次（计划中）
model Session {
  id        String   @id @default(uuid())
  coachId   String
  name      String   // "周三训练"
  date      BigInt   // 时间戳
  status    String   @default("planned") // planned/active/completed
  createdAt BigInt
}

// 出勤记录（计划中）
model Attendance {
  id         String @id @default(uuid())
  sessionId  String
  playerId   String
  status     String // present/late/absent
  createdAt  BigInt
  @@index([sessionId, playerId])
}
```

---

**文档维护**: 本文档应与代码同步更新。每次修改数据模型或核心业务逻辑时，必须同步更新本文档。
