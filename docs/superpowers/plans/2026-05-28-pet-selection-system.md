# 宠物选择与管理系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline.

**Goal:** 让新队员在大屏幕上选择宠物，建立5级宠物成长体系，管理端支持宠物物种CRUD。

**Architecture:** 后端新增公共宠物创建API和管理端物种管理API；前端大屏幕添加宠物选择弹窗；管理端新增宠物管理页面。

**Tech Stack:** Vue 3 + Express + Prisma + PostgreSQL

---

### Task 1: 后端阶段命名更新

**Files:**
- Modify: `server/src/routes/player.ts` — `getStageByCarePoints` 函数

将 `baby/teen/adult` 改为 `level1/level2/level3`。

### Task 2: 后端公共API

**Files:**
- Modify: `server/src/routes/player.ts`

新增：
- `GET /public/pet-species` — 返回所有宠物物种
- `POST /public/player/:playerId/pet/create` — 创建宠物（body: `{ speciesId }`）

### Task 3: 后端管理端API

**Files:**
- Modify: `server/src/routes/admin.ts`

新增：
- `GET /admin/pet-species`
- `POST /admin/pet-species`
- `PUT /admin/pet-species/:id`
- `DELETE /admin/pet-species/:id`

### Task 4: 前端API层

**Files:**
- Modify: `client/src/api/index.ts`

在 `publicApi` 新增：`getPetSpecies()`、`createPlayerPet(playerId, speciesId)`
在 `adminApi` 新增：`getPetSpecies()`、`createPetSpecies(data)`、`updatePetSpecies(id, data)`、`deletePetSpecies(id)`

### Task 5: TeamScreenPage 宠物选择弹窗

**Files:**
- Modify: `client/src/views/team/TeamScreenPage.vue`

- 新增 `showPetPicker` ref 和 `petSpeciesList` ref
- 无宠物时点击卡片打开弹窗（而非跳转）
- 弹窗展示物种网格（emoji + 名称）
- 选择后调用 `createPlayerPet` → 成功后 `loadData()`

### Task 6: TeamPetCard 无宠物提示

**Files:**
- Modify: `client/src/components/team/TeamPetCard.vue`

- 无宠物时显示 `🥚` 和提示文案「点击选择宠物」

### Task 7: 管理端宠物管理页面

**Files:**
- Create: `client/src/views/admin/AdminPetSpeciesPage.vue`
- Modify: `client/src/views/admin/AdminLayout.vue`
- Modify: `client/src/router/index.ts`

### Task 8: 构建验证

**Files:**
- N/A

前后端构建通过。
