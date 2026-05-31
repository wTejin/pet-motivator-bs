# 道具消耗策略 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 pet-motivator-bs 的商店道具系统引入 `rent`（时间租赁）和 `charge`（次数消耗）两种消耗机制，让配饰、背景、玩具在首次装备/使用后开始倒计时，过期/次数归零后自动删除，驱动小朋友持续努力赚取积分。

**Architecture:** 数据库层新增 `expiresAt` 字段支撑租赁计时；后端在购买、装备、使用三个入口按 `usageType` 分流处理；查询时自动结算过期道具；前端在商店卡片和背包中展示计时/次数状态；管理后台表单新增 `usageCount` 配置项。

**Tech Stack:** Vue 3 + TypeScript / Express + Prisma + PostgreSQL

---

## File Map

| File | Responsibility | Action |
|---|---|---|
| `server/prisma/schema.prisma` | 数据库模型 | 新增 `PlayerInventory.expiresAt` |
| `shared/types.ts` | 前后端共享类型契约 | 补全 `ShopItemType`、`ShopItem` 类型定义 |
| `server/src/routes/player.ts` | 学生端核心 API | 修改购买、装备、使用、过期结算逻辑 |
| `server/src/routes/admin.ts` | 管理后台 API | 确保返回 `usageType`/`usageCount` |
| `client/src/views/admin/AdminShopPage.vue` | 管理后台商品配置 | 表单新增 `rent`/`charge` 选项和 `usageCount` 输入 |
| `client/src/views/player/PlayerShopPage.vue` | 学生商店 | 商品卡片展示 `usageType` 标签 |
| `client/src/views/player/PlayerDashboardPage.vue` | 学生大屏/背包 | 展示 `charge` 剩余次数和 `rent` 计时状态 |
| `client/src/api/index.ts` | API 客户端 | 如有新增字段需要确认类型 |

---

## Task 1: 数据库迁移 — 新增 `expiresAt` 字段

**Files:**
- Modify: `pet-motivator-bs/server/prisma/schema.prisma:188-200`

- [ ] **Step 1: 修改 Prisma 模型**

  在 `PlayerInventory` 模型中新增 `expiresAt` 字段：

  ```prisma
  model PlayerInventory {
    id               String   @id @default(uuid())
    playerId         String
    itemId           String
    quantity         Int      @default(1)
    isEquipped       Boolean  @default(false)
    acquiredAt       BigInt
    expiresAt        BigInt?                   // 新增：租赁到期时间（仅 rent 类型使用）
    lastUnequippedAt BigInt?

    player Player @relation(fields: [playerId], references: [id], onDelete: Cascade)

    @@index([playerId, itemId])
  }
  ```

- [ ] **Step 2: 运行迁移**

  ```bash
  cd pet-motivator-bs/server
  npx prisma migrate dev --name add_inventory_expires_at
  npx prisma generate
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add server/prisma/
  git commit -m "feat(schema): add expiresAt to PlayerInventory for rent items"
  ```

---

## Task 2: 同步类型定义

**Files:**
- Modify: `pet-motivator-bs/shared/types.ts:7-25`

- [ ] **Step 1: 补全 ShopItemType 和 ShopItem**

  ```typescript
  // 第 7 行附近
  export type ShopItemType = 'food' | 'accessory' | 'background' | 'toy' | 'special'
  export type ShopItemUsageType = 'consume' | 'equip' | 'rent' | 'charge' | 'replace'
  ```

  ```typescript
  // 第 24 行附近，更新 ShopItem 接口
  export interface ShopItem {
    id: string
    coachId: string | null
    name: string
    description: string
    type: ShopItemType
    price: number
    usageType: ShopItemUsageType
    usageCount: number | null
    effect: {
      hunger?: number
      mood?: number
      experience?: number
      decoration?: string
      backgroundId?: string
    }
    imageClass: string
    stock: number
    isActive: boolean
    sortOrder: number
    createdAt: number
  }
  ```

- [ ] **Step 2: 验证前后端编译通过**

  ```bash
  cd pet-motivator-bs/server && npx tsc --noEmit
  cd pet-motivator-bs/client && npx vue-tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add shared/types.ts
  git commit -m "feat(types): add ShopItemUsageType and usageCount to shared types"
  ```

---

## Task 3: 后端 — 购买逻辑按 usageType 分流

**Files:**
- Modify: `pet-motivator-bs/server/src/routes/player.ts:640-645`

- [ ] **Step 1: 修改 handleBuy 中的 inventory 创建逻辑**

  将现有的统一逻辑：

  ```typescript
  const existingInv = await tx.playerInventory.findFirst({ where: { playerId, itemId } })
  if (existingInv) {
    await tx.playerInventory.update({ where: { id: existingInv.id }, data: { quantity: { increment: 1 } } })
  } else {
    await tx.playerInventory.create({ data: { playerId, itemId, quantity: 1, acquiredAt: now } })
  }
  ```

  替换为按 `usageType` 分流：

  ```typescript
  const itemUsageType = (item.usageType as string) || 'consume'
  const itemUsageCount = item.usageCount ?? null

  const existingInv = await tx.playerInventory.findFirst({ where: { playerId, itemId } })

  if (itemUsageType === 'rent') {
    // rent 类型：每次购买新建独立记录（各算各的过期时间）
    await tx.playerInventory.create({
      data: { playerId, itemId, quantity: 1, acquiredAt: now, expiresAt: null },
    })
  } else if (itemUsageType === 'charge') {
    // charge 类型：累加可用次数
    const initialQty = itemUsageCount ?? 1
    if (existingInv) {
      await tx.playerInventory.update({
        where: { id: existingInv.id },
        data: { quantity: { increment: initialQty } },
      })
    } else {
      await tx.playerInventory.create({
        data: { playerId, itemId, quantity: initialQty, acquiredAt: now },
      })
    }
  } else {
    // consume / equip / replace：保持原有逻辑
    if (existingInv) {
      await tx.playerInventory.update({
        where: { id: existingInv.id },
        data: { quantity: { increment: 1 } },
      })
    } else {
      await tx.playerInventory.create({
        data: { playerId, itemId, quantity: 1, acquiredAt: now },
      })
    }
  }
  ```

- [ ] **Step 2: 验证编译**

  ```bash
  cd pet-motivator-bs/server && npx tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add server/src/routes/player.ts
  git commit -m "feat(player): buy logic branches by usageType (rent/charge/consume)"
  ```

---

## Task 4: 后端 — 装备逻辑支持 rent 类型计时

**Files:**
- Modify: `pet-motivator-bs/server/src/routes/player.ts:684-705`

- [ ] **Step 1: 放宽装备权限检查，允许 rent 类型装备**

  将现有检查：

  ```typescript
  if (usageType !== 'equip' && usageType !== 'replace' && item.type !== 'accessory' && item.type !== 'background') {
    return res.status(400).json({ success: false, error: '该物品不可装备' })
  }
  ```

  改为：

  ```typescript
  const equipLikeTypes = ['equip', 'replace', 'rent']
  if (!equipLikeTypes.includes(usageType)) {
    return res.status(400).json({ success: false, error: '该物品不可装备' })
  }
  ```

- [ ] **Step 2: 在装备时处理 rent 类型的 expiresAt**

  在 `const wasEquipped = inv.isEquipped` 之后、`const now = Date.now()` 之后，插入 rent 类型检查：

  ```typescript
  // rent 类型：首次装备开始计时，过期拒绝装备
  if (usageType === 'rent' && !wasEquipped) {
    if (inv.expiresAt !== null && inv.expiresAt !== undefined) {
      if (Number(inv.expiresAt) < now) {
        return res.status(400).json({ success: false, error: '该配饰已过期，请重新购买' })
      }
    } else {
      // 首次装备，设置过期时间
      const rentDays = item.usageCount ?? 7
      const newExpiresAt = now + rentDays * 24 * 3600 * 1000
      await db.playerInventory.update({
        where: { id: inventoryId },
        data: { expiresAt: newExpiresAt },
      })
    }
  }
  ```

- [ ] **Step 3: 验证编译**

  ```bash
  cd pet-motivator-bs/server && npx tsc --noEmit
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/routes/player.ts
  git commit -m "feat(player): equip supports rent type with expiresAt timer"
  ```

---

## Task 5: 后端 — 使用逻辑支持 charge 类型（玩具）

**Files:**
- Modify: `pet-motivator-bs/server/src/routes/player.ts:818-860`

- [ ] **Step 1: 修改 usageType 检查，允许 charge 类型**

  将现有检查：

  ```typescript
  const usageType = (item.usageType as string) || 'consume'
  if (usageType !== 'consume') {
    return res.status(400).json({ success: false, error: '该物品不可直接使用，请装备或更换' })
  }
  ```

  改为：

  ```typescript
  const usageType = (item.usageType as string) || 'consume'
  if (usageType !== 'consume' && usageType !== 'charge') {
    return res.status(400).json({ success: false, error: '该物品不可直接使用，请装备或更换' })
  }
  ```

- [ ] **Step 2: 修改使用效果处理，charge 类型 +18 mood**

  在现有效果处理代码之后，如果是 `charge` 类型，额外增加 +18 mood：

  ```typescript
  if (consumeEff?.hunger) pet.hunger = Math.max(0, Math.min(100, pet.hunger + Number(consumeEff.hunger)))
  if (consumeEff?.mood) pet.mood = Math.max(0, Math.min(100, pet.mood + Number(consumeEff.mood)))
  if (consumeEff?.carePoints) pet.carePoints = Math.min(1000, pet.carePoints + Number(consumeEff.carePoints))

  // charge 类型（玩具）每次使用固定 +18 mood
  if (usageType === 'charge') {
    pet.mood = Math.min(100, pet.mood + 18)
    pet.lastPlayedAt = BigInt(now)
  }
  ```

- [ ] **Step 3: 修改消耗/删除逻辑**

  将现有：

  ```typescript
  if (inv.quantity <= 1) {
    await tx.playerInventory.delete({ where: { id: inventoryId } })
  } else {
    await tx.playerInventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } })
  }
  ```

  改为统一递减逻辑（consume 和 charge 都适用）：

  ```typescript
  if (inv.quantity <= 1) {
    await tx.playerInventory.delete({ where: { id: inventoryId } })
  } else {
    await tx.playerInventory.update({ where: { id: inventoryId }, data: { quantity: { decrement: 1 } } })
  }
  ```

  注意：这里逻辑其实已经一样了，因为 `charge` 的 `quantity` 就是剩余次数。但需要确保 `charge` 类型走这个分支。当前代码在事务末尾执行这个逻辑，只需确认它能被走到。

- [ ] **Step 4: 在返回数据中区分 charge 的 destroyed 状态**

  在 `handleUse` 的响应中增加 `destroyed` 标记：

  ```typescript
  res.json({
    success: true,
    data: {
      hunger: pet.hunger,
      mood: pet.mood,
      moodChange: (consumeEff?.mood ?? 0) + (usageType === 'charge' ? 18 : 0),
      evolved,
      ...(usageType === 'charge' ? { destroyed: inv.quantity <= 1 } : {}),
    },
  })
  ```

- [ ] **Step 5: 验证编译**

  ```bash
  cd pet-motivator-bs/server && npx tsc --noEmit
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add server/src/routes/player.ts
  git commit -m "feat(player): use supports charge type toys (+18 mood, decrement count)"
  ```

---

## Task 6: 后端 — 过期结算（rent 类型自动删除）

**Files:**
- Modify: `pet-motivator-bs/server/src/routes/player.ts`（查询宠物和背包的函数中）

需要找到查询宠物详情和背包列表的函数，在其中插入过期结算逻辑。根据已有代码，`handleGetShop`（约第 580 行附近）和 `getPlayerPet`（需要确认位置）是主要查询入口。

- [ ] **Step 1: 在 handleGetShop 中插入过期结算**

  在 `handleGetShop` 返回背包数据之前，对所有 `isEquipped = true` 且 `expiresAt` 已过的 rent 类型道具执行结算：

  ```typescript
  // 过期结算：自动卸下并删除已过期 rent 道具
  const equippedRentItems = allInventory.filter(
    (inv) => inv.isEquipped && inv.expiresAt !== null && inv.expiresAt !== undefined
  )
  for (const inv of equippedRentItems) {
    if (Number(inv.expiresAt) < now) {
      await db.playerInventory.delete({ where: { id: inv.id } })
      // mood -8 的惩罚由宠物查询时的离线计算或下次交互触发
    }
  }
  ```

  注意：这里需要访问 `pet` 来扣 mood，但 `handleGetShop` 可能没有加载 pet。如果该函数没有 pet 上下文，可以将过期结算放到 `getPlayerPet` 中统一处理。

  更合理的做法：在获取宠物详情的函数中统一做过期结算。需要找到该函数的位置。

  如果 `getPlayerPet` 函数在前面（约第 350 行附近），在其查询 pet 之后、返回之前插入：

  ```typescript
  async function settleExpiredRentItems(playerId: string, pet: any) {
    const now = Date.now()
    const expiredItems = await db.playerInventory.findMany({
      where: { playerId, isEquipped: true, expiresAt: { lt: now } },
    })
    if (expiredItems.length === 0) return

    for (const inv of expiredItems) {
      await db.playerInventory.delete({ where: { id: inv.id } })
    }

    // 重新收集已装备物品，更新 pet
    const remainingEquipped = await db.playerInventory.findMany({
      where: { playerId, isEquipped: true },
    })
    const decorationIds: string[] = []
    let currentSkin = 'default'

    for (const e of remainingEquipped) {
      const it = await db.shopItem.findUnique({ where: { id: e.itemId } })
      const eff = it?.effect as any
      if (it?.type === 'accessory' && eff?.equip?.decoration) {
        decorationIds.push(eff.equip.decoration)
      }
      if (it?.type === 'background') {
        currentSkin = eff?.equip?.backgroundId || e.itemId
      }
    }

    pet.equippedDecorations = decorationIds
    pet.currentSkin = currentSkin
    pet.mood = Math.max(0, pet.mood - 8 * expiredItems.length)

    await db.pet.update({
      where: { playerId },
      data: {
        equippedDecorations: decorationIds,
        currentSkin,
        mood: pet.mood,
      },
    })
  }
  ```

- [ ] **Step 2: 在 getPlayerPet 中调用结算函数**

  在 `getPlayerPet` 返回数据之前调用 `settleExpiredRentItems(playerId, pet)`。

- [ ] **Step 3: 验证编译**

  ```bash
  cd pet-motivator-bs/server && npx tsc --noEmit
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/routes/player.ts
  git commit -m "feat(player): auto-settle expired rent items on pet fetch"
  ```

---

## Task 7: 前端 — 商店卡片显示 usageType 标签

**Files:**
- Modify: `pet-motivator-bs/client/src/views/player/PlayerShopPage.vue`

- [ ] **Step 1: 在商品卡片上增加 usageType 标签**

  找到商品卡片渲染区域（通常为 `v-for="item in items"` 附近），在卡片上增加标签显示：

  ```vue
  <div class="item-tags">
    <span class="tag" :class="item.usageType">
      {{ usageTypeLabel(item.usageType, item.usageCount) }}
    </span>
  </div>
  ```

  在 `<script setup>` 中增加辅助函数：

  ```typescript
  function usageTypeLabel(usageType: string, usageCount: number | null): string {
    switch (usageType) {
      case 'consume': return '🍽️ 使用一次'
      case 'rent': return `⏳ 首次装备后 ${usageCount ?? 7} 天`
      case 'charge': return `🎮 可用 ${usageCount ?? 5} 次`
      case 'equip': return '👑 永久拥有'
      case 'replace': return '🖼️ 替换背景'
      default: return ''
    }
  }
  ```

- [ ] **Step 2: 添加对应 CSS**

  ```css
  .item-tags .tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.06);
    color: #666;
  }
  .item-tags .tag.rent { background: rgba(255, 152, 0, 0.12); color: #e65100; }
  .item-tags .tag.charge { background: rgba(33, 150, 243, 0.12); color: #1565c0; }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/views/player/PlayerShopPage.vue
  git commit -m "feat(shop): display usageType label on shop cards"
  ```

---

## Task 8: 前端 — 背包状态展示

**Files:**
- Modify: `pet-motivator-bs/client/src/views/player/PlayerDashboardPage.vue`

- [ ] **Step 1: 在背包列表中为 charge 类型显示剩余次数**

  找到背包渲染逻辑（通常在处理 `inventory` 数组的地方），在道具名称旁增加次数显示：

  ```vue
  <span v-if="inv.itemUsageType === 'charge'" class="charge-count">
    还剩 {{ inv.quantity }} 次
  </span>
  ```

  注意：前端需要拿到每个 inventory 项对应的 `usageType`。当前 `inventory` 数组可能只包含 `itemId`，需要确保 API 返回了 `itemUsageType` 或在前端用 `itemMap` 查。`handleGetShop` 已经返回 `items` 数组，可以构建 `Map` 来查。

- [ ] **Step 2: 在背包列表中为 rent 类型显示计时状态**

  ```vue
  <span v-if="inv.itemUsageType === 'rent'" class="rent-status">
    <span v-if="!inv.expiresAt">未开始计时</span>
    <span v-else-if="inv.expiresAt > Date.now()">
      还剩 {{ Math.ceil((inv.expiresAt - Date.now()) / (24 * 3600 * 1000)) }} 天
    </span>
  </span>
  ```

  注意：`inv.expiresAt` 需要从前端数据中拿到。如果当前 API 没有返回 `expiresAt`，需要确认后端返回的数据结构。

- [ ] **Step 3: 玩具使用后的反馈提示**

  在调用使用 API 成功后的回调中，如果返回 `destroyed: true`，追加提示：

  ```typescript
  if (res.data.destroyed) {
    showToast('🎉 宠物玩得很开心！心情 +18\n玩具玩坏了，去商店买新的吧~')
  } else {
    showToast('🎉 宠物玩得很开心！心情 +18')
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/views/player/PlayerDashboardPage.vue
  git commit -m "feat(dashboard): show charge count and rent timer in inventory"
  ```

---

## Task 9: 管理后台 — 表单新增 rent/charge 和 usageCount

**Files:**
- Modify: `pet-motivator-bs/client/src/views/admin/AdminShopPage.vue:20-47`
- Modify: `pet-motivator-bs/client/src/views/admin/AdminShopPage.vue:217-218`
- Modify: `pet-motivator-bs/client/src/views/admin/AdminShopPage.vue:301`

- [ ] **Step 1: 更新 usageType 下拉选项**

  将现有：

  ```vue
  <select v-model="shopForm.usageType" class="field-input">
    <option value="consume">消耗型（用一次少一个）</option>
    <option value="equip">装备型（持久不消耗）</option>
    <option value="replace">替换型（背景类）</option>
  </select>
  ```

  改为：

  ```vue
  <select v-model="shopForm.usageType" class="field-input">
    <option value="consume">🍽️ 消耗型（用一次少一个）</option>
    <option value="equip">👑 装备型（永久拥有）</option>
    <option value="rent">⏳ 租赁型（首次装备后计时到期）</option>
    <option value="charge">🎮 次数型（使用 N 次后消失）</option>
    <option value="replace">🖼️ 替换型（背景类，永久）</option>
  </select>
  ```

- [ ] **Step 2: 新增 usageCount 输入字段**

  在 `usageType` 选择框之后、价格之前插入：

  ```vue
  <div class="form-field short" v-if="shopForm.usageType === 'rent' || shopForm.usageType === 'charge'">
    <label class="field-label">
      {{ shopForm.usageType === 'rent' ? '有效期（天）' : '可用次数' }}
    </label>
    <input v-model.number="shopForm.usageCount" type="number" :placeholder="shopForm.usageType === 'rent' ? '7' : '5'" class="field-input" />
  </div>
  ```

- [ ] **Step 3: 更新 shopForm 的 type 定义和默认值**

  找到 `shopForm` 的初始化：

  ```typescript
  const shopForm = ref({
    name: '',
    description: '',
    emoji: '📦',
    type: 'food' as ShopItemType,
    usageType: 'consume' as ShopItemUsageType,
    usageCount: null as number | null,
    price: 0,
    stock: 999,
    imageUrl: '',
    sortOrder: 0,
  })
  ```

  确保 `usageCount` 包含在内。

- [ ] **Step 4: 更新 reset 函数**

  ```typescript
  shopForm.value = { name: '', description: '', emoji: '📦', type: 'food', usageType: 'consume', usageCount: null, price: 0, stock: 999, imageUrl: '', sortOrder: 0 }
  ```

- [ ] **Step 5: 确保创建/更新时提交 usageCount**

  现有 `addItem` 和 `saveEdit` 已经用 `...shopForm.value` 展开，只要 `shopForm` 里有 `usageCount`，就会自动提交。需要确认 `adminApi.createShopItem` 和 `adminApi.updateShopItem` 的类型是否允许 `usageCount`。

  如果后端路由 `admin.ts` 中的校验没有包含 `usageCount`，需要一并修改。

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/views/admin/AdminShopPage.vue
  git commit -m "feat(admin): add rent/charge options and usageCount to shop form"
  ```

---

## Task 10: 后端 — 管理接口确保返回完整字段

**Files:**
- Modify: `pet-motivator-bs/server/src/routes/admin.ts`（ShopItem CRUD 相关路由）

- [ ] **Step 1: 确认 admin 接口返回 usageType 和 usageCount**

  在返回 ShopItem 列表的 API 中，确保查询的字段包含 `usageType` 和 `usageCount`。

  在 `admin.ts` 中搜索 `shopItem.findMany` 或 `shopItem.findUnique`，确认 `select` 或默认返回包含这两个字段（Prisma 默认返回所有标量字段，通常不需要额外修改）。

- [ ] **Step 2: 确认 admin 接口接受 usageCount 参数**

  在创建/更新 ShopItem 的 API 中，确认 `usageCount` 被正确解析和写入：

  ```typescript
  const { name, description, emoji, type, usageType, usageCount, price, effect, stock, imageUrl, sortOrder } = req.body
  // ...
  await db.shopItem.create({
    data: {
      name, description, emoji, type, usageType, usageCount: usageCount ?? null,
      price, effect, stock, imageUrl, sortOrder,
      createdAt: now,
    },
  })
  ```

  如果已有代码已经展开 `req.body`，通常不需要修改。需要实际读取 `admin.ts` 确认。

- [ ] **Step 3: Commit**

  ```bash
  git add server/src/routes/admin.ts
  git commit -m "feat(admin): ensure usageType and usageCount in shop item CRUD"
  ```

---

## Task 11: 端到端验证

- [ ] **Step 1: 启动开发环境**

  ```bash
  # Terminal 1: 数据库 + 后端
  cd pet-motivator-bs/server
  npm run dev

  # Terminal 2: 前端
  cd pet-motivator-bs/client
  npm run dev
  ```

- [ ] **Step 2: 管理员创建测试商品**

  登录管理后台 → 魔法市集 → 添加以下测试商品：
  1. `type=accessory, usageType=rent, usageCount=1` — 1 天过期的配饰
  2. `type=toy, usageType=charge, usageCount=2` — 可用 2 次的玩具

- [ ] **Step 3: 学生端购买并验证**

  1. 购买 rent 配饰 → 背包显示"未开始计时"
  2. 装备 rent 配饰 → 宠物显示配饰，背包显示剩余天数
  3. 等待（或手动修改数据库 `expiresAt` 为过去时间）→ 刷新页面，配饰自动消失
  4. 购买 charge 玩具 → 背包显示"还剩 2 次"
  5. 使用玩具 → mood +18，提示"还剩 1 次"
  6. 再次使用 → 玩具从背包消失，提示"玩坏了"

- [ ] **Step 4: 前后端类型检查**

  ```bash
  cd pet-motivator-bs/server && npx tsc --noEmit
  cd pet-motivator-bs/client && npx vue-tsc --noEmit
  ```

- [ ] **Step 5: Commit 收尾**

  ```bash
  git add .
  git commit -m "feat: item consumption strategy (rent + charge) complete"
  ```

---

## Self-Review Checklist

| Spec 章节 | 实现任务 | 状态 |
|---|---|---|
| 2.1 展示分类 `type` 补全 | Task 2 | ✅ |
| 2.2 行为分类 `usageType` 扩展 | Task 2, 9 | ✅ |
| 3.1 `ShopItem` 模型调整 | Task 2, 10 | ✅ |
| 3.2 `PlayerInventory` 新增 `expiresAt` | Task 1 | ✅ |
| 4.1 购买逻辑分流 | Task 3 | ✅ |
| 4.2 装备逻辑 rent 计时 | Task 4 | ✅ |
| 4.3 卸下逻辑（时间不暂停） | 现有逻辑兼容，无需修改 | ✅ |
| 4.4 过期结算（静默删除） | Task 6 | ✅ |
| 4.5 使用逻辑 charge 玩具 | Task 5 | ✅ |
| 4.6 背包过滤（过期不返回） | Task 6（删除即不返回） | ✅ |
| 5.1 商店标签 | Task 7 | ✅ |
| 5.2 背包状态 | Task 8 | ✅ |
| 5.3 使用反馈 | Task 8 | ✅ |
| 6. 教练配置界面 | Task 9 | ✅ |
| 7. 向后兼容 | 各任务中已处理 | ✅ |
| 8. 默认值 | Task 9 placeholder 默认值 | ✅ |

**Placeholder scan**: 无 TBD/TODO/"implement later"。所有步骤含具体代码或命令。

**Type consistency**: `ShopItemUsageType` 在各任务中一致使用；`expiresAt` 为 `BigInt?`（Prisma）对应前端 `number | null`。
