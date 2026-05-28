<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold" style="font-family: var(--font-display)">球员卡</h2>

    <!-- View Toggle -->
    <div class="flex gap-2">
      <button
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        :class="viewMode === 'compare' ? 'btn-primary' : 'bg-white/5 text-white/60 hover:bg-white/10'"
        @click="viewMode = viewMode === 'grid' ? 'compare' : 'grid'"
      >
        {{ viewMode === 'grid' ? '🔍 对比模式' : '🔙 返回全部' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-white/60 py-8">
      <div class="skeleton h-64 w-full max-w-sm mx-auto"></div>
    </div>

    <!-- Grid View -->
    <div v-if="viewMode === 'grid' && !loading">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <FifaPlayerCard
          v-for="stats in playerStats"
          :key="stats.playerId"
          :stats="stats"
        />
      </div>
      <div v-if="playerStats.length === 0" class="text-center text-white/40 py-8">暂无球员数据</div>
    </div>

    <!-- Compare View -->
    <div v-if="viewMode === 'compare' && !loading">
      <div class="glass-card p-4 mb-6">
        <p class="text-sm text-white/50 mb-3">选择要对比的球员（最多4名）</p>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="player in players"
            :key="player.id"
            :class="[
              'px-4 py-2 rounded-full border text-sm transition-all',
              compareIds.includes(player.id)
                ? 'border-[#39FF14] bg-[#39FF14]/20 text-white'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30',
            ]"
            @click="toggleCompare(player.id)"
          >
            <img
              v-if="isImageAvatar(player.avatar)"
              :src="player.avatar"
              class="compare-avatar-img"
              alt="avatar"
            />
            <span v-else>{{ player.avatar }}</span>
            <span>{{ player.name }}</span>
          </button>
        </div>
        <p v-if="compareIds.length >= 4" class="text-xs text-[#FFD700] mt-2">已达到最大对比数量</p>
      </div>

      <div v-if="compareStats.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <FifaPlayerCard
          v-for="stats in compareStats"
          :key="stats.playerId"
          :stats="stats"
        />
      </div>
      <div v-else class="text-center text-white/40 py-8">请选择球员进行对比</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { coachApi } from '@/api'
import FifaPlayerCard from '@/components/FifaPlayerCard.vue'
import type { PlayerStats } from '@shared/types'

interface PlayerItem {
  id: string
  name: string
  avatar: string
}

const viewMode = ref<'grid' | 'compare'>('grid')
const loading = ref(true)
const players = ref<PlayerItem[]>([])
const playerStats = ref<PlayerStats[]>([])
const compareIds = ref<string[]>([])

const compareStats = computed(() => {
  return playerStats.value.filter((s) => compareIds.value.includes(s.playerId))
})

onMounted(async () => {
  loading.value = true
  try {
    const pRes = await coachApi.getPlayers()
    players.value = (pRes.data.data || []).filter((p: any) => p.isActive !== false)

    const statsPromises = players.value.map(async (p) => {
      try {
        const res = await coachApi.getPlayerStats(p.id)
        const data = res.data.data
        if (data && data.dimensions && data.dimensions.length > 0) {
          return data as PlayerStats
        }
        return null
      } catch {
        return null
      }
    })
    const results = await Promise.all(statsPromises)
    playerStats.value = results.filter((s): s is PlayerStats => s !== null)
    playerStats.value.sort((a, b) => b.overall - a.overall)
  } catch (e) {
    console.error('Failed to load player cards', e)
  } finally {
    loading.value = false
  }
})

function isImageAvatar(avatar: string): boolean {
  return avatar.startsWith('/')
}

function toggleCompare(id: string) {
  const idx = compareIds.value.indexOf(id)
  if (idx >= 0) {
    compareIds.value.splice(idx, 1)
  } else if (compareIds.value.length < 4) {
    compareIds.value.push(id)
  }
}
</script>

<style scoped>
.compare-avatar-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}
</style>
