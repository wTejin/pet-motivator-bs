<template>
  <div class="activity-ticker">
    <span class="ticker-label">📢</span>
    <div class="ticker-track">
      <div class="ticker-content" :key="tickerKey">
        <span
          v-for="(activity, index) in activities"
          :key="activity.id"
          class="ticker-item"
          :class="`type-${activity.type}`"
        >
          <span class="ticker-avatar">{{ cleanAvatar(activity.playerAvatar) }}</span>
          <span class="ticker-text">{{ activity.playerName }} {{ activity.description }}</span>
          <span v-if="activity.points && activity.points > 0" class="ticker-points">+{{ activity.points }}</span>
          <span v-if="index < activities.length - 1" class="ticker-sep">•</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ActivityItem {
  id: string
  type: string
  playerName: string
  playerAvatar: string
  description: string
  points?: number
}

const props = defineProps<{
  activities: ActivityItem[]
}>()

const tickerKey = computed(() => props.activities.map(a => a.id).join('-'))

function isUrl(str: string): boolean {
  if (!str) return false
  return str.startsWith('/') || str.startsWith('http://') || str.startsWith('https://')
}

function cleanAvatar(avatar: string): string {
  return isUrl(avatar) ? '😊' : avatar
}
</script>

<style scoped>
.activity-ticker {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  padding: 8px 16px;
  border: 2px solid #ff9800;
  overflow: hidden;
  flex: 1;
}

.ticker-label {
  font-size: 18px;
  flex-shrink: 0;
}

.ticker-track {
  flex: 1;
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
}

.ticker-content {
  display: inline-flex;
  gap: 16px;
  white-space: nowrap;
  animation: ticker-scroll 45s linear infinite;
}

.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #333;
}

.ticker-avatar {
  font-size: 16px;
}

.ticker-text {
  color: #555;
}

.ticker-points {
  color: #4caf50;
  font-weight: 700;
}

.ticker-sep {
  color: #ccc;
  margin: 0 4px;
}

/* 类型颜色 */
.type-score .ticker-points { color: #4caf50; }
.type-evolution .ticker-text { color: #ff9800; font-weight: 600; }
.type-purchase .ticker-text { color: #2196f3; }

@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
