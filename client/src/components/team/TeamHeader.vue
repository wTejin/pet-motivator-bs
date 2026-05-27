<template>
  <div class="team-header">
    <div class="team-brand">
      <span class="team-logo">{{ logo || '⚽' }}</span>
      <h1 class="team-name">{{ teamName }}</h1>
    </div>
    <ActivityTicker :activities="activities" />
  </div>
</template>

<script setup lang="ts">
import ActivityTicker from './ActivityTicker.vue'

interface ActivityItem {
  id: string
  type: string
  playerName: string
  playerAvatar: string
  description: string
  points?: number
}

defineProps<{
  teamName: string
  logo?: string
  activities: ActivityItem[]
}>()
</script>

<style scoped>
.team-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.team-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.team-logo {
  font-size: 32px;
}

.team-name {
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin: 0;
  font-family: 'ZCOOL KuaiLe', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
</style>
