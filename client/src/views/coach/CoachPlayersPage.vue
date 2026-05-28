<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold" style="font-family: var(--font-display)">球员管理</h2>

    <!-- Add / Edit Player Form -->
    <div class="glass-card p-4">
      <h3 class="text-sm font-semibold mb-3 text-white/70">{{ editingPlayer ? '编辑球员' : '添加球员' }}</h3>
      <div class="flex flex-col md:flex-row gap-3">
        <input
          v-model="playerForm.name"
          placeholder="球员姓名"
          class="input-field flex-1"
        />
        <div class="relative">
          <button
            class="input-field flex items-center gap-2 cursor-pointer"
            @click="showEmojiPicker = !showEmojiPicker"
          >
            头像 {{ playerForm.avatar }}
          </button>
          <div
            v-if="showEmojiPicker"
            class="absolute top-full mt-2 bg-slate-800 border border-white/20 rounded-xl p-3 grid grid-cols-6 gap-2 z-10 shadow-xl"
          >
            <button
              v-for="emoji in emojiList"
              :key="emoji"
              class="text-2xl p-1 hover:bg-white/10 rounded transition-colors"
              @click="playerForm.avatar = emoji; showEmojiPicker = false"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn-primary" @click="editingPlayer ? saveEdit() : addPlayer()">
            {{ editingPlayer ? '保存' : '添加' }}
          </button>
          <button
            v-if="editingPlayer"
            class="px-4 py-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
            @click="cancelEdit()"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- Player Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div
        v-for="player in players"
        :key="player.id"
        :class="[
          'glass-card p-4 transition-all',
          !player.isActive && 'opacity-50',
        ]"
      >
        <div class="flex items-center gap-3 mb-3">
          <span class="text-3xl">{{ player.avatar }}</span>
          <div>
            <div class="font-semibold">{{ player.name }}</div>
            <div class="text-xs text-white/40">{{ player.isActive ? '活跃' : '已停用' }}</div>
          </div>
        </div>
        <div class="flex justify-between text-sm mb-3">
          <span class="text-[#FFD700] font-semibold" style="font-family: var(--font-num)">{{ player.currentPoints }} 分</span>
          <span class="text-white/40">{{ player.lifetimePoints }} 累计</span>
        </div>
        <div class="flex gap-1 flex-wrap">
          <button
            class="px-2 py-1 text-xs bg-white/10 text-white/60 rounded hover:bg-white/20 transition-colors"
            @click="startEdit(player)"
          >
            编辑
          </button>
          <button
            class="px-2 py-1 text-xs bg-white/10 text-white/60 rounded hover:bg-white/20 transition-colors"
            @click="toggleActive(player)"
          >
            {{ player.isActive ? '停用' : '启用' }}
          </button>
          <button
            class="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            @click="deletePlayerItem(player.id)"
          >
            删除
          </button>
          <button
            class="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
            @click="generateQuickLink(player)"
          >
            链接
          </button>
        </div>
      </div>
      <div v-if="players.length === 0" class="col-span-full text-center text-white/40 py-8">暂无球员，请添加</div>
    </div>

    <!-- Quick Link Modal -->
    <Teleport to="body">
      <div
        v-if="quickLink"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="quickLink = null"
      >
        <div class="glass-card p-6 w-full max-w-md">
          <h3 class="text-lg font-bold mb-3" style="font-family: var(--font-display)">快捷链接 - {{ quickLinkPlayer }}</h3>
          <div class="bg-white/5 border border-white/10 rounded-lg p-3 break-all text-sm text-white/70 mb-4">
            {{ quickLink }}
          </div>
          <div class="flex gap-2">
            <button class="btn-primary flex-1" @click="copyLink()">复制链接</button>
            <button class="px-4 py-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors" @click="quickLink = null">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { coachApi } from '@/api'

interface PlayerItem {
  id: string
  name: string
  avatar: string
  currentPoints: number
  lifetimePoints: number
  isActive: boolean
}

const players = ref<PlayerItem[]>([])
const editingPlayer = ref<PlayerItem | null>(null)
const playerForm = ref({ name: '', avatar: '😊' })
const showEmojiPicker = ref(false)
const quickLink = ref<string | null>(null)
const quickLinkPlayer = ref('')

const emojiList = ['😊', '⚽', '🌟', '💪', '🔥', '🎯', '🏆', '😎', '🤩', '👑', '🦁', '🐯']

onMounted(loadPlayers)

async function loadPlayers() {
  try {
    const res = await coachApi.getPlayers()
    players.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load players', e)
  }
}

async function addPlayer() {
  if (!playerForm.value.name) return
  try {
    await coachApi.createPlayer({ ...playerForm.value })
    playerForm.value = { name: '', avatar: '😊' }
    await loadPlayers()
  } catch (e: any) {
    alert(e.response?.data?.error || '添加失败')
  }
}

function startEdit(player: PlayerItem) {
  editingPlayer.value = player
  playerForm.value = { name: player.name, avatar: player.avatar }
}

function cancelEdit() {
  editingPlayer.value = null
  playerForm.value = { name: '', avatar: '😊' }
}

async function saveEdit() {
  if (!editingPlayer.value) return
  try {
    await coachApi.updatePlayer(editingPlayer.value.id, { ...playerForm.value })
    editingPlayer.value = null
    playerForm.value = { name: '', avatar: '😊' }
    await loadPlayers()
  } catch (e: any) {
    alert(e.response?.data?.error || '保存失败')
  }
}

async function toggleActive(player: PlayerItem) {
  try {
    await coachApi.updatePlayer(player.id, { isActive: !player.isActive })
    await loadPlayers()
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

async function deletePlayerItem(id: string) {
  if (!confirm('确认删除该球员？此操作不可撤销。')) return
  try {
    await coachApi.deletePlayer(id)
    await loadPlayers()
  } catch (e: any) {
    alert(e.response?.data?.error || '删除失败')
  }
}

async function generateQuickLink(player: PlayerItem) {
  try {
    const res = await coachApi.getQuickLink(player.id)
    quickLinkPlayer.value = res.data.data?.playerName || player.name
    quickLink.value = window.location.origin + '/#' + (res.data.data?.link || `/join?p=${player.id}`)
  } catch (e: any) {
    alert(e.response?.data?.error || '获取链接失败')
  }
}

async function copyLink() {
  if (!quickLink.value) return
  try {
    await navigator.clipboard.writeText(quickLink.value)
    alert('链接已复制到剪贴板')
  } catch {
    prompt('请手动复制链接:', quickLink.value)
  }
}
</script>
