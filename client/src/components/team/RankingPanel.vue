<template>
  <div class="ranking-panel">
    <h3 class="ranking-title">🏆 积分榜</h3>
    <div class="ranking-list">
      <div
        v-for="item in ranking"
        :key="item.playerId"
        class="ranking-item"
        :class="`rank-${item.rank}`"
      >
        <span class="rank-medal">{{ medal(item.rank) }}</span>
        <img
          v-if="isImageAvatar(item.playerAvatar)"
          :src="item.playerAvatar"
          class="rank-avatar-img"
          alt="avatar"
        />
        <span v-else class="rank-avatar">{{ item.playerAvatar }}</span>
        <div class="rank-info">
          <span class="rank-name">{{ item.playerName }}</span>
          <span class="rank-points">{{ item.currentPoints }} ⭐</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface RankingItem {
  playerId: string
  playerName: string
  playerAvatar: string
  currentPoints: number
  rank: number
}

defineProps<{
  ranking: RankingItem[]
}>()

function medal(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}.`
}

function isImageAvatar(avatar: string): boolean {
  return avatar?.startsWith('/') ?? false
}
</script>

<style scoped>
.ranking-panel {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ranking-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 12px;
  text-align: center;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8f9fa;
  transition: background 0.2s;
}

.ranking-item:hover {
  background: #e3f2fd;
}

.rank-medal {
  font-size: 20px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.rank-avatar {
  font-size: 24px;
  flex-shrink: 0;
}

.rank-avatar-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
}

.rank-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-points {
  font-size: 12px;
  color: #ff9800;
  font-weight: 600;
}

/* 前三名高亮 */
.rank-1 { background: linear-gradient(90deg, #fff8e1, #ffecb3); border: 1px solid #ffd700; }
.rank-2 { background: linear-gradient(90deg, #f5f5f5, #e0e0e0); border: 1px solid #c0c0c0; }
.rank-3 { background: linear-gradient(90deg, #fff3e0, #ffe0b2); border: 1px solid #cd7f32; }
</style>
