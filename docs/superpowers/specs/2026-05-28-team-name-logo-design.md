# 球队名称与队徽管理设计文档

> **目标：** 让教练可以设置球队名称和上传队徽，名称+队徽显示在教练端顶部导航栏，同时大屏幕页面显示真实的球队信息。教练端每个页面底部提供返回大屏幕的快捷入口。

---

## 1. 数据模型

### 1.1 Prisma Schema 变更

在 `Coach` 模型新增两个字段：

```prisma
model Coach {
  id              String   @id @default(cuid())
  phone           String   @unique
  passwordHash    String
  name            String   @default("")
  school          String   @default("")
  teamName        String   @default("")  // 新增：球队名称
  teamLogo        String   @default("")  // 新增：球队队徽URL
  isActive        Boolean  @default(true)
  trialUntil      DateTime?
  authorizedUntil DateTime?
  playerMode      String   @default("display")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**迁移策略：** 新增字段均有 `@default("")`，无需数据回填，直接执行 `prisma migrate dev`。

---

## 2. API 设计

### 2.1 新增端点

| 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|
| `GET` | `/coach/me` | Coach JWT | 获取当前教练完整资料 |
| `PUT` | `/coach/me` | Coach JWT | 更新当前教练资料（`name`, `school`, `teamName`, `teamLogo`） |
| `GET` | `/public/coach/:phone` | 无需 | 公共接口，供大屏幕读取球队信息 |

### 2.2 响应格式

`GET /coach/me` 和 `PUT /coach/me` 响应体：
```json
{
  "success": true,
  "data": {
    "id": "...",
    "phone": "13800138000",
    "name": "王教练",
    "school": "实验小学",
    "teamName": "闪电雄鹰",
    "teamLogo": "/avatars/logo-abc123.jpg",
    "playerMode": "display"
  }
}
```

`GET /public/coach/:phone` 响应体（仅公开必要字段）：
```json
{
  "success": true,
  "data": {
    "phone": "13800138000",
    "name": "王教练",
    "teamName": "闪电雄鹰",
    "teamLogo": "/avatars/logo-abc123.jpg"
  }
}
```

### 2.3 登录端点兼容

`POST /coach/login` 成功响应的 `data.coach` 字段需要包含 `teamName` 和 `teamLogo`，确保登录后前端立即可用。

---

## 3. 前端架构

### 3.1 API 层（`client/src/api/index.ts`）

`coachApi` 新增方法：
- `getProfile(): Promise<ApiResponse<CoachProfile>>`
- `updateProfile(data: Partial<CoachProfile>): Promise<ApiResponse<CoachProfile>>`

### 3.2 Auth Store（`client/src/stores/auth.ts`）

新增 `refreshUser()` 方法：
- 调用 `coachApi.getProfile()`
- 将返回数据合并到 `user.value`
- 调用时机：登录后、更新资料后、页面刷新后可选调用

### 3.3 CoachLayout 改动

顶部导航栏中间新增**球队信息区域**：
- 显示：圆形队徽（32px）+ 球队名称
- 默认状态：若 `teamName` 为空，显示 `⚽ 我的球队`
- Hover：显示铅笔图标，cursor 变为 pointer
- 点击：打开球队编辑弹窗

底部新增**返回大屏幕条**：
- 位置：`coach-content` 下方
- 显示条件：`$route.path.startsWith('/coach')`
- 内容：`📺 返回球员大屏幕`
- 点击：`router.push('/screen')`

### 3.4 球队编辑弹窗（内嵌于 CoachLayout）

弹窗结构（类似头像选择器弹窗的卡片样式）：
- 标题：编辑球队信息
- 球队名称：单行 `<input>`
- 队徽上传区：
  - 点击或拖拽上传照片
  - 复用 `POST /coach/upload-avatar`
  - 上传成功后预览显示
  - 支持 JPG / PNG / GIF / WEBP，最大 2MB
- 按钮：`保存`（primary）、`取消`（secondary）

保存流程：
1. 收集 `teamName` 和上传后的 `teamLogo` URL
2. 调用 `coachApi.updateProfile(data)`
3. 成功后调用 `authStore.refreshUser()` 更新全局状态
4. 关闭弹窗

### 3.5 TeamScreenPage 改动

- 移除硬编码的 `teamName = '星宠小队'`
- 页面 `onMounted` 时，根据当前 coach 的 `phone` 调用 `GET /public/coach/:phone`
- `TeamHeader` 组件接收 `teamName` 和 `teamLogo` props
- 若 `teamName` 为空，回退显示 `⚽ 星宠小队`

---

## 4. 数据流

```
教练登录
  → POST /coach/login 返回 coach 数据（含 teamName/teamLogo）
  → authStore.user 初始化

教练修改球队信息
  → 打开弹窗 → 输入名称 / 上传队徽
  → PUT /coach/me
  → 后端更新 Coach 表
  → 返回更新后数据
  → authStore.refreshUser() 更新 user.value
  → CoachLayout 球队区域自动响应式更新

大屏幕访问 /screen
  → GET /public/coach/:phone
  → TeamHeader 渲染真实 teamName + teamLogo
```

---

## 5. 错误处理

| 场景 | 处理方式 |
|------|----------|
| 队徽上传失败 | Alert 提示 `上传失败：具体原因` |
| 保存资料 API 失败 | Alert 提示 `保存失败，请重试` |
| 大屏幕获取公共信息失败 | 静默回退到默认 `⚽ 星宠小队` |
| 队徽图片加载失败 | 显示默认 ⚽ 图标 |

---

## 6. 测试要点

- [ ] 新字段迁移后，现有 Coach 数据正常读取，无报错
- [ ] `GET /coach/me` 正确返回当前登录教练信息
- [ ] `PUT /coach/me` 可更新 `teamName` 和 `teamLogo`
- [ ] `GET /public/coach/:phone` 无需认证即可访问
- [ ] 顶部球队区域默认显示 `⚽ 我的球队`
- [ ] 编辑弹窗可正常上传照片并预览
- [ ] 保存后 CoachLayout 球队区域立即更新
- [ ] 底部返回按钮仅在 `/coach/*` 路由下显示
- [ ] 点击底部按钮正确跳转到 `/screen`
- [ ] 大屏幕页面正确显示设置的球队名称和队徽
- [ ] 未设置球队名称时，大屏幕回退显示默认文案
