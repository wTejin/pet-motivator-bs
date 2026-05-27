# 学员大屏（Team Screen）设计文档

## 背景与目标

星宠契约项目中，教练需要一种方式在训练场/教室里向所有学员展示全队状态，同时学员自己也可以在手机/平板上查看全班情况。大屏需要展示：所有队员的宠物卡、实时排名、最新动态。

核心目标：页面要让孩子们喜欢，色彩明亮、有动画、有荣誉感。

## 访问流程

1. **大屏入口**：`/screen?c=教练手机号`（公开访问，无需登录）
2. 教练将该链接投屏到教室电视
3. 学员扫码或点击链接后进入大屏页
4. 大屏页中点击任意宠物卡 → 进入该学员个人页 `/player/:playerId`
5. 个人页底部增加"返回全班大屏"按钮

## 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│ 🏆 火箭班 (队徽)      │  📢 [小明 +5分] [小红宠物进化] …   │
├──────────┬──────────────────────────────────────────────────┤
│ 🥇 小明   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│    98分   │  │  🐶/图  │ │  🐱/图  │ │  🐰/图  │ │  🐹/图  ││
│ 🥈 小红   │  │  小明   │ │  小红   │ │  小刚   │ │  小丽   ││
│    87分   │  │  Lv.3   │ │  Lv.5   │ │  Lv.2   │ │  Lv.4   ││
│ 🥉 小刚   │  │  98⭐   │ │  87⭐   │ │  76⭐   │ │  65⭐   ││
│          │  └─────────┘ └─────────┘ └─────────┘ └─────────┘│
│ 4. 小丽   │  … 更多宠物卡片自动换行铺满                      │
│ 5. ...   │                                                    │
└──────────┴──────────────────────────────────────────────────┘
```

- **顶部栏**：队徽 + 队名（左），动态公告板（右），同行并排
- **左侧 20%**：排名榜
- **右侧 80%**：宠物卡网格

## 组件拆分

| 组件 | 路径 | 职责 |
|---|---|---|
| `TeamScreenPage.vue` | `views/team/TeamScreenPage.vue` | 主页面，布局容器，数据聚合，30秒轮询 |
| `TeamHeader.vue` | `components/team/TeamHeader.vue` | 队徽 + 队名展示 |
| `ActivityTicker.vue` | `components/team/ActivityTicker.vue` | 顶部动态公告板，横向滚动 |
| `RankingPanel.vue` | `components/team/RankingPanel.vue` | 左侧排名榜，金银铜牌高亮前3名 |
| `TeamPetCard.vue` | `components/team/TeamPetCard.vue` | 宠物卡，含宠物展示区（支持emoji/图片/GIF+配饰叠加） |

## 数据模型

### 后端新增 API

**GET /public/leaderboard/:phone**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "小明", "avatar": "😊", "currentPoints": 98, "rank": 1 }
  ]
}
```

**GET /public/activities/:phone**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "score",
      "playerId": "uuid",
      "playerName": "小明",
      "playerAvatar": "😊",
      "description": "训练积极 +5分",
      "points": 5,
      "createdAt": 1716900000000
    }
  ]
}
```

**Activity 类型枚举**：`score`（记分）、`evolution`（宠物进化）、`purchase`（商店购买）、`feed`（喂食）、`play`（玩耍）

### 前端数据接口

```ts
interface TeamScreenData {
  teamName: string
  teamLogo?: string
  players: TeamPlayer[]
  ranking: RankingItem[]
  activities: ActivityItem[]
}

interface TeamPlayer {
  id: string
  name: string
  avatar: string
  currentPoints: number
  pet: {
    name: string
    stage: string
    level: number
    speciesId: string
    species: {
      stages: Record<string, {
        emoji: string
        imageUrl?: string
        gifUrl?: string
      }>
    }
    equippedDecorations: string[]
  } | null
}

interface RankingItem {
  playerId: string
  playerName: string
  playerAvatar: string
  currentPoints: number
  rank: number
}

interface ActivityItem {
  id: string
  type: 'score' | 'evolution' | 'purchase' | 'feed' | 'play'
  playerName: string
  playerAvatar: string
  description: string
  points?: number
  createdAt: number
}
```

## 视觉风格

### 色彩
- **页面背景**：浅蓝 `#E3F2FD` 到浅绿 `#E8F5E9` 的线性渐变
- **宠物卡背景**：白色 `#FFFFFF`，圆角 16px，阴影 `0 4px 12px rgba(0,0,0,0.08)`
- **排名榜前3**：金牌 `#FFD700` 背景，银牌 `#C0C0C0`，铜牌 `#CD7F32`
- **公告板边框**：橙色 `#FF9800` 气泡边框
- **文字**：主文字深灰 `#333333`，次要文字 `#666666`

### 字体
- 队名：ZCOOL KuaiLe 或系统默认圆体，24px bold
- 宠物名：16px semibold
- 积分：Russo One 或等宽数字字体，18px
- 排名数字：JetBrains Mono，14px

## 动画效果

1. **宠物呼吸浮动**：宠物展示区内的主体（emoji/图片）持续上下浮动，3s ease-in-out infinite，位移 ±4px
2. **积分飘字**：学员获得积分时，卡片上方飘起金色 "+5" 数字，持续 2s 后消失
3. **公告板滚动**：动态消息从右向左横向滚动（CSS marquee），新消息加入时右侧闪烁高亮 1s
4. **排名变化**：名次变化时列表项平滑过渡，上升绿色箭头 ↗，下降红色箭头 ↘
5. **卡片入场**：页面加载时宠物卡依次从下方淡入上浮，stagger 50ms

## 响应式适配

| 断点 | 布局调整 |
|---|---|
| ≥1024px（大屏/电视） | 左右分栏 20%/80%，宠物卡 4-5 列 |
| 768-1024px（平板） | 排名榜收缩为顶部横向条，宠物卡 3 列 |
| <768px（手机） | 排名榜折叠为可展开面板，宠物卡 2 列，公告板缩小 |

## 宠物展示区规范（支持配饰叠加）

宠物展示区是 `TeamPetCard.vue` 的核心区域，必须保证无论宠物主体是 emoji 还是图片，尺寸和位置都固定，以便配饰准确叠加。

### 容器规格
- **展示区容器**：固定 80×80px，position: relative，居中于卡片顶部
- **宠物主体**：居中于容器内，最大 64×64px

### 展示优先级
1. 有 `gifUrl` → 展示 `<img>` 标签，auto-play
2. 无 GIF 但有 `imageUrl` → 展示 `<img>` 标签
3. 都没有 → 降级展示 `<span class="pet-emoji">{{ emoji }}</span>`，font-size: 48px

### 配饰叠加
配饰使用 absolute positioning，叠加在宠物展示区上方：
- 配饰数据来自 `pet.equippedDecorations`（ID 列表）
- 每个配饰通过 `AccessoryDef.position` 获取相对偏移 `{ x: number, y: number, scale: number }`
- 配饰图片/emoji 以 `top: 50% + y`, `left: 50% + x` 定位

```vue
<div class="pet-stage" style="width: 80px; height: 80px;">
  <!-- 宠物主体 -->
  <img v-if="petGifUrl" :src="petGifUrl" class="pet-main" />
  <img v-else-if="petImageUrl" :src="petImageUrl" class="pet-main" />
  <span v-else class="pet-emoji">{{ petEmoji }}</span>
  
  <!-- 配饰叠加层 -->
  <img
    v-for="acc in accessories"
    :key="acc.id"
    :src="acc.imageUrl"
    class="pet-accessory"
    :style="{
      top: `calc(50% + ${acc.position.y}px)`,
      left: `calc(50% + ${acc.position.x}px)`,
      transform: `scale(${acc.position.scale || 1})`
    }"
  />
</div>
```

## 实时刷新

- 页面使用 `setInterval` 每 30 秒轮询一次数据
- 轮询接口：`GET /public/players/:phone`、`GET /public/leaderboard/:phone`、`GET /public/activities/:phone`
- 对比新旧数据，仅更新变化的部分（避免全量重渲染导致动画中断）

## 路由变更

新增路由：
```ts
{ path: '/screen', name: 'teamScreen', component: () => import('@/views/team/TeamScreenPage.vue') }
```

现有 `/join` 页面保留学员选择功能，但增加"查看全班大屏"入口；大屏页宠物卡点击后跳转 `/player/:playerId`。

## 性能考虑

- 宠物 GIF 可能较大，使用 `loading="lazy"` 或预加载前 6 张
- 公告板消息最多保留 30 条，超出时移除旧数据
- 轮询使用 `Promise.all` 并行请求
