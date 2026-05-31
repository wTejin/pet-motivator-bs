# 星宠契约 B/S 版 — 数据架构设计文档

**版本**: v1.0.0  
**日期**: 2026-05-29  
**状态**: 已梳理，待优化  

---

## 一、系统概述

星宠契约是一个面向青少年足球青训的激励系统。核心闭环：

```
教练打分 → 学员获积分 → 魔法市集消费 → 饲养宠物 → 宠物成长 → 学员获得成就感
                    ↓
              24项能力指标 → 雷达图 → FIFA球员卡 → 训练数据化
```

**数据设计原则**:
- 能力数据（雷达图）与激励数据（积分/宠物）分离，确保科学性
- 积分是通用货币，连接训练表现与游戏化反馈
- 宠物成长提供视觉化的长期反馈，维持学员持续参与动力

---

## 二、核心数据流

### 2.1 主干数据流（激励闭环）

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  教练端      │     │  学员端      │     │  宠物系统    │
│  ScoreRecord│────▶│  Player     │────▶│  Pet        │
│  (earn)     │     │  currentPts │     │  carePoints │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  ShopItem   │     │  进化阈值     │
                    │  buy/use    │     │  egg→rare   │
                    └─────────────┘     └─────────────┘
```

**流程说明**:
1. 教练在训练中给学员打分（24项指标）→ 创建 `ScoreRecord(type='earn')`
2. 学员 `currentPoints` 增加 → 积分余额可用
3. 学员在魔法市集购买物品（食物/玩具/配饰/背景/魔法）→ 积分消耗
4. 学员喂养/训练宠物 → 宠物属性提升（hunger/mood/carePoints）
5. 宠物 `carePoints` 达标 + 状态合格（hunger≥50, mood≥50）→ 进化到下一阶段

### 2.2 能力数据流（训练科学化）

```
┌─────────────────┐
│ ScoreDimension  │  6个维度（技术/洞察/身体/心理/协作/态度）
│   ↓ 1:N         │
│ ScoreIndicator  │  每维度4个指标，共24项
│   ↓             │
│ ScoreRecord     │  教练每次打分记录
│   (earn/penalty)│
│   ↓             │
│ groupBy聚合     │  按indicatorId汇总得分
│   ↓             │
│ 维度得分计算     │  score = min(99, 实际分/理论满分×99)
│   ↓             │
│ Overall综合评分  │  6维度平均值
│   ↓             │
│ FIFA球员卡 + 雷达图
└─────────────────┘
```

**关键规则**:
- `earn` 和 `penalty` 类型的记录**计入雷达图**
- `bonus` 类型的记录**不计入雷达图**（只增加积分余额）
- 每个指标有 `dailyLimit`，防止教练过度打分
- 维度满分 = 指标数 × dailyLimit × 7（假设一周训练7天）

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

**⚠️ 当前问题**: `spend` 类型的记录混在 ScoreRecord 中，与能力数据共用一张表，语义不纯净。建议后续拆分为独立的 `TransactionRecord`。

### 4.3 能力评估体系

**ScoreDimension（维度）→ ScoreIndicator（指标）**

- 6 个维度：技术能力、战术洞察、身体素质、心理素质、团队协作、比赛态度
- 每维度 4 个指标，共 24 项
- 每个指标有 `defaultPoints`（单次分值）和 `dailyLimit`（单日上限）
- 教练注册时自动从模板创建，后续可自定义修改

**CustomIndicator（自定义指标）**
- 不关联维度，独立存在
- 用于教练临时增加的打分项
- 也受 `dailyLimit` 限制

**BonusRule（奖励规则）**
- 教练自定义的额外奖励（如"全勤奖""周最佳"）
- `frequency`: weekly/monthly
- 发放时创建 `ScoreRecord(type='bonus')`

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

### 5.1 雷达图计算（public/player-stats/:phone/:playerId）

```
1. 查询该教练下所有激活的 ScoreDimension + ScoreIndicator
2. groupBy ScoreRecord.indicatorId，汇总 points
3. 对每个维度：
   - 维度理论满分 = 指标数 × dailyLimit × 7
   - 维度实际得分 = ∑(各指标 ScoreRecord 汇总 points)
   - 维度得分 = min(99, round(实际得分 / 理论满分 × 99))
4. Overall = round(∑维度得分 / 维度数)
```

**⚠️ 性能隐患**: 每次加载球员卡都要全量聚合历史 ScoreRecord。学员训练 1 年（每周3次 × 24项 × 52周 ≈ 3744 条记录），聚合查询会越来越慢。

**建议**: 增加 `PlayerStats` 预计算表，教练打分时异步更新，球员卡直接读取预计算结果。

### 5.2 宠物成长与进化（handleFeed / handlePlay）

```
1. 扣除积分（喂食5分 / 训练5分）
2. 更新宠物属性
3. 计算新阶段：getStageByCarePoints(carePoints)
4. 如果新阶段 ≠ 旧阶段：
   - 检查 hunger ≥ 50 且 mood ≥ 50
   - 通过 → 进化，更新 stage/level/evolvedAt
   - 不通过 → evolutionBlocked=true，保持原阶段
5. 创建 ScoreRecord(type='spend')
6. 返回新状态和进化结果
```

### 5.3 连续活跃奖励（calculateStreakBonus）

```
1. 查询该学员所有 type∈[earn,bonus] 且 points>0 的 ScoreRecord
2. 提取活跃日期（去重）
3. 从今天往前数，计算连续有记录的天数
4. 如果连续3天且未发过3天奖励 → 创建 bonus 记录 +20
5. 如果连续7天且未发过7天奖励 → 创建 bonus 记录 +50
```

### 5.4 教练权限开关（playerMode）

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
| Score（快速记分） | `/coach/players` + `/coach/dimensions` | 点击指标按钮给学生加分 |
| ScoreConfig | `/coach/dimensions` | 维度/指标CRUD |
| Players | `/coach/players` | 学生CRUD |
| PlayerCards | `/coach/player-stats/:playerId` | 查看全班雷达图和FIFA卡 |
| Dashboard | `/coach/dashboard-stats` | 班级今日/累计统计 |

### 6.3 学生端（Player / Public）

| 页面 | 数据来源 | 核心操作 |
|------|---------|---------|
| Dashboard | `/public/player/:playerId/pet` + `/public/player-stats` | 查看宠物、球员卡、喂食、训练、签到 |
| Shop | `/public/player/:playerId/shop` | 购买、装备、使用物品 |
| TeamScreen | `/public/players/:phone` | 大屏展示全班宠物卡片 |

---

## 七、当前设计问题与改进建议

### 7.1 数据表设计问题

| 问题 | 影响 | 建议 |
|------|------|------|
| `ScoreRecord` 混合能力分、激励分、消费记录 | 语义混乱，统计容易出错 | 拆分：保留 ScoreRecord（仅 earn/penalty/bonus），新建 TransactionRecord（spend） |
| 雷达图实时聚合 | 数据量大时性能下降 | 增加 `PlayerStats` 预计算表，每日/每次打分后异步更新 |
| `lifetimePoints` 只增不减 | 与 currentPoints 的语义关系不清晰 | 明确 lifetimePoints = 历史累计总收入（仅正向积分），不参与任何业务逻辑 |
| Pet 表缺少 `isSick` 字段 | 生病状态用 hunger=0 推断，不够明确 | 增加 `isSick` 和 `sickSince` 字段，明确生病状态 |

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

| 缺失 | 说明 |
|------|------|
| 宠物与能力数据深度联动 | 当前仅通过宠物特效（光环/黄金皮肤）弱关联，建议增加：维度得分解锁宠物技能 |
| 训练课次（session）模型 | 设计中提到 sessionId 字段，但没有 Session 表定义 |
| 学员 attendance（出勤）记录 | 全勤奖依赖 ScoreRecord 推断，不准确，建议独立出勤表 |
| 商店销售统计 | Admin 无法看到哪些商品最受欢迎 |
| 积分消耗分布 | 教练无法看到学员积分主要花在什么地方 |

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
// 训练课次
model Session {
  id        String   @id @default(uuid())
  coachId   String
  name      String   // "周三训练"
  date      BigInt   // 时间戳
  status    String   @default("planned") // planned/active/completed
  createdAt BigInt
}

// 出勤记录
model Attendance {
  id         String @id @default(uuid())
  sessionId  String
  playerId   String
  status     String // present/late/absent
  createdAt  BigInt
  @@index([sessionId, playerId])
}

// 学员预计算能力数据（解决雷达图性能问题）
model PlayerStatsCache {
  id            String @id @default(uuid())
  playerId      String @unique
  overall       Int    @default(0)
  dimensionJson Json   // {维度ID: 得分}
  updatedAt     BigInt
}

// 积分消费流水（从 ScoreRecord 拆分）
model TransactionRecord {
  id        String @id @default(uuid())
  playerId  String
  itemId    String? // 关联商品（如果是消费）
  amount    Int     // 负数为支出，正数为退款
  type      String  // buy/use/feed/play/refund
  balance   Int     // 操作后的余额
  createdAt BigInt
  @@index([playerId, createdAt])
}
```

---

**文档维护**: 本文档应与代码同步更新。每次修改数据模型或核心业务逻辑时，必须同步更新本文档。
