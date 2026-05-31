# 道具消耗策略设计文档

**日期**：2026-05-30  
**项目**：pet-motivator-bs（星宠契约 B/S 版）  
**范围**：商店道具的消耗、过期与使用策略

---

## 1. 背景与目标

当前系统中，食物是消耗品（吃完消失），但配饰、背景、玩具等道具一旦购买就永久拥有，导致：
- 小朋友缺乏持续努力的动力（买完后无后续目标）
- 道具新鲜感快速消退，商店活跃度下降
- 积分通货膨胀，后期缺乏消耗出口

**目标**：为不同品类道具设计合理的消耗/过期策略，在"珍惜感"和"挫败感"之间取得平衡，持续激发小朋友的努力欲望和新奇心理。

---

## 2. 核心机制：品类 × 行为分类

### 2.1 展示分类 `type`

决定商品在商店中的展示位置和视觉分类：

| 值 | 含义 | 商店 Tab |
|---|---|---|
| `food` | 食物 | 食物 |
| `accessory` | 配饰 | 装扮 |
| `background` | 背景 | 装扮 |
| `toy` | 玩具 | 玩具 |
| `special` | 特殊道具 | 特殊 |

> **现状修复**：当前 `types.ts` 中 `ShopItemType` 定义与实际数据库/后端代码不一致（缺少 `accessory`、`background`、`toy`）。本设计将其补全对齐。

### 2.2 行为分类 `usageType`

决定道具购买后的消耗方式和生命周期：

| 值 | 适用品类 | 核心规则 | 过期/耗尽后 |
|---|---|---|---|
| `consume` | 食物 | 使用一次扣 1 个数量 | 从背包删除 |
| `rent` | 配饰、背景 | **首次装备后开始计时**，按自然日扣有效期 | 自动卸下并**直接删除** |
| `charge` | 玩具 | 每次"玩"扣 1 次可用次数 | 从背包**直接删除** |
| `equip` | 配饰、背景（兼容） | 永久拥有，可无限装备卸下 | 不过期 |

> `equip` 作为兼容选项保留。教练创建商品时，新配饰/背景默认推荐 `rent`，但可手动切回 `equip`（永久拥有）。已有数据不受影响。

---

## 3. 数据模型变更

### 3.1 `ShopItem`（前后端类型同步）

```prisma
model ShopItem {
  id          String  @id @default(uuid())
  coachId     String?
  name        String
  description String  @default("")
  emoji       String  @default("📦")
  type        String                    // 'food' | 'accessory' | 'background' | 'toy' | 'special'
  price       Int
  effect      Json
  usageType   String  @default("consume") // 'consume' | 'equip' | 'rent' | 'charge' | 'replace'
  usageCount  Int?                      // rent=天数, charge=次数
  imageUrl    String?
  imageClass  String  @default("")
  stock       Int     @default(999)
  isActive    Boolean @default(true)
  sortOrder   Int     @default(0)
  createdAt   BigInt

  coach Coach? @relation(fields: [coachId], references: [id], onDelete: SetNull)
}
```

**`usageCount` 语义**：
- `rent`：有效期天数（如 7 表示装备后可用 7 天）
- `charge`：可用次数（如 5 表示可玩 5 次）
- `consume` / `equip`：忽略

### 3.2 `PlayerInventory`（新增字段）

```prisma
model PlayerInventory {
  id               String   @id @default(uuid())
  playerId         String
  itemId           String
  quantity         Int      @default(1)      // consume/charge=剩余数量/次数; rent/equip=1
  isEquipped       Boolean  @default(false)
  acquiredAt       BigInt
  expiresAt        BigInt?                   // 仅 rent 类型使用，首次装备时设置
  lastUnequippedAt BigInt?

  player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

  @@index([playerId, itemId])
}
```

---

## 4. 后端逻辑设计

### 4.1 购买逻辑

| usageType | 行为 |
|---|---|
| `consume` | `quantity = 1`，已有同 itemId 记录则 `quantity += 1` |
| `charge` | `quantity = item.usageCount`（如 5 次），已有记录则累加次数 |
| `rent` | 每次购买**新建记录**，`quantity = 1`，`expiresAt = null`（未装备不开始计时） |
| `equip` | 同现有逻辑，`quantity = 1`，已有记录则拒绝重复购买或累加（按现有行为） |

### 4.2 装备逻辑（`rent` 类型）

```
if (expiresAt === null) {
  // 首次装备，开始计时
  expiresAt = now + usageCount * 24 * 3600 * 1000
} else if (expiresAt < now) {
  // 已过期，拒绝装备
  return 400, error: '该配饰已过期，请重新购买'
}
// 正常装备流程：isEquipped = true, pet.mood += 15
```

### 4.3 卸下逻辑（`rent` 类型）

- `isEquipped = false`
- `expiresAt` **保持不变**，时间不暂停
- `pet.mood -= 8`（保持现有卸下惩罚）

### 4.4 过期结算（`rent` 类型）

在查询宠物详情、背包列表时自动执行：

```
for each rentItem where isEquipped = true:
  if (expiresAt !== null && expiresAt < now) {
    // 强制卸下并删除
    isEquipped = false
    pet.mood -= 8
    从 pet.equippedDecorations 移除 item.effect.decoration
    删除 PlayerInventory 记录
  }
```

> **注意**：过期删除是静默的，**不弹提醒、不保留灰态**。小朋友下次打开背包时发现道具没了，就是设计预期的心理反馈——"我得再努力赚积分买一个"。

### 4.5 使用逻辑（`charge` 类型 — 玩具）

```
if (quantity <= 0) return 400, error: '玩具已损坏，请重新购买'

quantity -= 1
pet.mood = min(100, pet.mood + 18)    // 每次 +18 mood
pet.lastPlayedAt = now

if (quantity === 0) {
  删除 PlayerInventory 记录
  return 200, data: { moodChange: +18, destroyed: true }
} else {
  return 200, data: { moodChange: +18, remaining: quantity }
}
```

### 4.6 背包列表过滤（`rent` 类型）

查询背包时：
- `expiresAt === null`：正常显示（未装备过）
- `expiresAt > now`：正常显示，可装备/卸下
- `expiresAt < now`：**不返回**（已过期删除）

> 这意味着一旦过期，小朋友在背包里就看不到这个道具了，必须重新去商店购买。

---

## 5. 前端交互设计

### 5.1 商店商品卡片

根据 `usageType` 在卡片上显示不同标签：

| usageType | 标签文案 |
|---|---|
| `consume` | 🍽️ 使用一次 |
| `rent` | ⏳ 首次装备后开始计时，有效期 X 天 |
| `charge` | 🎮 可使用 X 次 |
| `equip` | 👑 永久拥有 |

### 5.2 背包道具状态

| 状态 | 视觉表现 | 操作 |
|---|---|---|
| `rent` 未装备、未开始计时 | 正常显示 | 装备 |
| `rent` 已装备、计时中 | 正常显示，可卸下 | 卸下 |
| `charge` 有次数 | 显示"还剩 X 次" | 使用 |
| `consume` | 显示数量 | 使用 |

**`quantity` 前端展示规则**：
- `consume`：显示 "×quantity"
- `charge`：显示 "还剩 quantity 次"
- `rent`：不显示 quantity（固定为 1），改为显示计时状态——未装备时显示"未开始"，已装备时显示剩余天数
- `equip`：不显示 quantity

> 没有"即将过期"提醒、没有"灰态"、没有"续费"按钮。过期道具在背包中直接消失。

### 5.3 使用玩具后的反馈

使用玩具后，前端展示：
- 宠物播放互动动画
- 弹出 "🎉 宠物玩得很开心！心情 +18"
- 如果这是最后一次（`destroyed: true`），追加提示 "玩具玩坏了，去商店买新的吧~"

---

## 6. 教练配置界面

教练创建/编辑商品时，新增/调整以下字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| 品类 `type` | 下拉选择 | food / accessory / background / toy / special |
| 使用方式 `usageType` | 下拉选择 | 根据 type 有推荐默认值：accessory/background 默认 rent，toy 默认 charge，food 默认 consume |
| 有效期/次数 `usageCount` | 数字输入 | rent 时输入天数（如 7），charge 时输入次数（如 5） |

> `usageType` 切换时，如果切到不需要 `usageCount` 的类型，该字段隐藏或置空。

---

## 7. 向后兼容

- 现有 `type = 'decoration'` 的数据库记录：后端代码已兼容（代码中检查了 `type === 'accessory' || type === 'background'`），类型定义补全后自动对齐
- 现有 `usageType = 'equip'` 的配饰/背景：行为完全不变，永久拥有
- 现有 `PlayerInventory` 记录：没有 `expiresAt` 字段（值为 null），对于 `rent` 类型表示"未开始计时"，首次装备时才会设置。不影响现有 `consume/equip` 类型记录

---

## 8. 默认值建议

| 品类 | usageType | usageCount 建议值 |
|---|---|---|
| 食物 | consume | 忽略 |
| 配饰 | rent | 7 天 |
| 背景 | rent | 7 天 |
| 玩具 | charge | 5 次 |
| 特殊道具 | 视具体设计 | 视具体设计 |

教练可在创建商品时自定义这些数值。
