<template>
  <div class="p-6 space-y-4">
    <h1 class="text-2xl font-bold text-white">体测管理</h1>

    <!-- Alert Banner -->
    <div v-if="alerts.length > 0" class="glass-card p-4 border-l-4 border-red-500">
      <h2 class="text-sm font-semibold text-red-400 mb-2">⚠ 以下球员体测已过期或未录入</h2>
      <div v-for="a in alerts" :key="a.playerId" class="flex justify-between text-sm py-1">
        <span class="text-white">{{ a.playerName }}</span>
        <span class="text-red-400">{{ a.lastMeasuredAt ? `${a.daysSince} 天未更新` : '从未录入' }}</span>
      </div>
    </div>

    <!-- Entry Form -->
    <div class="glass-card p-4 space-y-4">
      <h2 class="text-sm font-semibold text-white">录入新体测</h2>

      <div>
        <label class="block text-sm text-slate-400 mb-1">选择球员 *</label>
        <select v-model="form.playerId" class="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none">
          <option value="">-- 请选择 --</option>
          <option v-for="p in players" :key="p.id" :value="p.id">{{ p.avatar }} {{ p.name }}</option>
        </select>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label class="block text-sm text-slate-400 mb-1">身高 (cm) *</label>
          <input v-model.number="form.heightCm" type="number" step="0.1" min="50" max="250" class="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none" placeholder="如 165.5" />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1">体重 (kg) *</label>
          <input v-model.number="form.weightKg" type="number" step="0.1" min="10" max="200" class="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none" placeholder="如 55.0" />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1">坐高 (cm) *</label>
          <input v-model.number="form.sittingHeightCm" type="number" step="0.1" min="30" max="150" class="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none" placeholder="如 88.0" />
        </div>
      </div>

      <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>
      <p v-if="successMsg" class="text-emerald-400 text-sm">{{ successMsg }}</p>

      <button class="btn-primary px-6 py-2 rounded-lg text-sm font-semibold" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中...' : '✓ 提交体测' }}
      </button>
    </div>

    <!-- History -->
    <div class="glass-card p-4">
      <h2 class="text-sm font-semibold text-white mb-3">体测历史</h2>
      <div class="space-y-2">
        <div v-if="selectedPlayerHistory.length === 0" class="text-slate-400 text-sm">请先选择球员查看历史记录</div>
        <div v-for="r in selectedPlayerHistory" :key="r.id" class="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0">
          <span class="text-white">{{ formatDate(r.measuredAt) }}</span>
          <span class="text-slate-400">身高 {{ r.heightCm }}cm · 体重 {{ r.weightKg }}kg · 坐高 {{ r.sittingHeightCm }}cm</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { playerApi, biometricsApi } from '@/api'

const players = ref<any[]>([])
const alerts = ref<any[]>([])
const allHistory = ref<any[]>([])
const submitting = ref(false)
const error = ref('')
const successMsg = ref('')

const form = ref({
  playerId: '',
  heightCm: '' as any,
  weightKg: '' as any,
  sittingHeightCm: '' as any,
})

const selectedPlayerHistory = computed(() =>
  allHistory.value.filter((r: any) => r.playerId === form.value.playerId),
)

onMounted(async () => {
  try {
    const [pRes, aRes] = await Promise.all([playerApi.list(), biometricsApi.alerts()])
    players.value = pRes.data.data || []
    alerts.value = aRes.data.data || []
  } catch (e) {
    console.error(e)
  }
})

watch(() => form.value.playerId, async (pid) => {
  if (pid) {
    try {
      const res = await biometricsApi.list(pid)
      allHistory.value = res.data.data || []
    } catch (e) { console.error(e) }
  }
})

async function submit() {
  error.value = ''
  successMsg.value = ''
  if (!form.value.playerId) {
    error.value = '请选择球员'
    return
  }
  const h = parseFloat(form.value.heightCm)
  const w = parseFloat(form.value.weightKg)
  const s = parseFloat(form.value.sittingHeightCm)
  if (!h || !w || !s) {
    error.value = '请填写完整的体测数据'
    return
  }
  if (s >= h) {
    error.value = '坐高不能大于等于身高'
    return
  }
  submitting.value = true
  try {
    await biometricsApi.create({
      playerId: form.value.playerId,
      heightCm: h,
      weightKg: w,
      sittingHeightCm: s,
    })
    successMsg.value = '体测录入成功！'
    form.value = { playerId: form.value.playerId, heightCm: '', weightKg: '', sittingHeightCm: '' }
    // Refresh alerts & history
    const [aRes, hRes] = await Promise.all([
      biometricsApi.alerts(),
      biometricsApi.list(form.value.playerId),
    ])
    alerts.value = aRes.data.data || []
    allHistory.value = hRes.data.data || []
  } catch (e: any) {
    error.value = e.response?.data?.error || '录入失败'
  } finally {
    submitting.value = false
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN')
}
</script>
