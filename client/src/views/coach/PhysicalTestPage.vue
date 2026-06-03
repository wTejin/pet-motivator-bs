<template>
  <div class="p-6 space-y-4">
    <h1 class="text-2xl font-bold text-white">体测管理</h1>
    <p class="text-xs text-slate-500 -mt-2">身体测量建议每季度更新，运动表现建议月度/季度测试</p>

    <!-- Alert Banner -->
    <div v-if="alerts.length > 0" class="glass-card p-4 border-l-4 border-red-500">
      <h2 class="text-sm font-semibold text-red-400 mb-2">⚠ 以下球员体测已过期或未录入</h2>
      <div v-for="a in alerts" :key="a.playerId + a.type" class="flex justify-between text-sm py-1">
        <span class="text-white">{{ a.playerName }}</span>
        <span class="text-red-400">
          <template v-if="a.type === 'biometrics'">📏 身体测量：</template>
          <template v-else>🏃 运动表现：</template>
          {{ a.lastMeasuredAt ? `${a.daysSince} 天未更新` : '从未录入' }}
        </span>
      </div>
    </div>

    <!-- Player Selector (shared) -->
    <div class="glass-card p-4">
      <label class="block text-sm text-slate-400 mb-1">选择球员</label>
      <select v-model="selectedPlayerId" class="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none">
        <option value="">-- 请选择 --</option>
        <option v-for="p in players" :key="p.id" :value="p.id">{{ p.avatar }} {{ p.name }}</option>
      </select>
    </div>

    <div v-if="selectedPlayerId" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- ═══ 左侧：身体测量 (Biometrics) ═══ -->
      <div class="glass-card p-4 space-y-3">
        <h2 class="text-sm font-semibold text-white flex items-center gap-2">
          <span>📏</span><span>身体测量</span>
          <span class="text-xs text-slate-500 font-normal">(季度更新，用于 Mirwald 成熟度计算)</span>
        </h2>

        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-xs text-slate-500 mb-1">身高 (cm) *</label>
            <input v-model.number="bioForm.heightCm" type="number" step="0.1" min="50" max="250" class="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder="165.5" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">体重 (kg) *</label>
            <input v-model.number="bioForm.weightKg" type="number" step="0.1" min="10" max="200" class="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder="55.0" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">坐高 (cm) *</label>
            <input v-model.number="bioForm.sittingHeightCm" type="number" step="0.1" min="30" max="150" class="w-full bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:border-emerald-500 focus:outline-none" placeholder="88.0" />
          </div>
        </div>

        <p v-if="bioError" class="text-red-400 text-xs">{{ bioError }}</p>
        <p v-if="bioSuccess" class="text-emerald-400 text-xs">{{ bioSuccess }}</p>

        <button class="btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold" :disabled="bioSubmitting" @click="submitBiometrics">
          {{ bioSubmitting ? '提交中...' : '✓ 提交身体测量' }}
        </button>

        <!-- Body measurement history -->
        <div v-if="bioHistory.length > 0" class="border-t border-white/5 pt-2">
          <h3 class="text-xs text-slate-400 mb-1">历史记录</h3>
          <div v-for="r in bioHistory.slice(0, 3)" :key="r.id" class="flex justify-between text-xs py-0.5">
            <span class="text-slate-300">{{ formatDate(r.measuredAt) }}</span>
            <span class="text-slate-500">{{ r.heightCm }}cm · {{ r.weightKg }}kg · 坐高{{ r.sittingHeightCm }}cm</span>
          </div>
        </div>
      </div>

      <!-- ═══ 右侧：运动表现 (PhysicalTest) ═══ -->
      <div class="glass-card p-4 space-y-3">
        <h2 class="text-sm font-semibold text-white flex items-center gap-2">
          <span>🏃</span><span>运动表现</span>
          <span class="text-xs text-slate-500 font-normal">(月度/季度测试，校准技术执行 & 执行饱和度)</span>
        </h2>

        <!-- 速度/爆发力/敏捷/耐力 -->
        <div>
          <label class="block text-xs text-slate-400 mb-1">速度 / 爆发力 / 敏捷 / 耐力</label>
          <div class="grid grid-cols-5 gap-1.5">
            <div v-for="s in allSpeedIndicators" :key="s.key">
              <label class="block text-[10px] text-slate-500 mb-0.5">{{ s.name }}</label>
              <input v-model.number="ptForm[s.key]" type="number" step="0.01" min="0" class="w-full bg-slate-800 border border-white/10 rounded px-1.5 py-1 text-white text-xs focus:border-emerald-500 focus:outline-none" :placeholder="s.unit" />
            </div>
          </div>
        </div>

        <!-- 技术评分 -->
        <div>
          <label class="block text-xs text-slate-400 mb-1">技术评分 (1-5 星)</label>
          <div class="grid grid-cols-4 gap-1.5">
            <div v-for="t in allTechIndicators" :key="t.key" class="bg-slate-800/50 rounded p-1.5 text-center">
              <div class="text-[10px] text-slate-400 mb-0.5">{{ t.name }}</div>
              <div class="flex justify-center gap-0.5">
                <button v-for="star in 5" :key="star"
                  class="w-4 h-4 rounded text-[10px] transition-all"
                  :class="star <= (ptForm[t.key] || 0) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'"
                  @click="ptForm[t.key] = star"
                >★</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 跑动 -->
        <div class="bg-slate-800/50 rounded p-2 flex items-center justify-between">
          <div>
            <span class="text-xs text-white">跑动覆盖</span>
            <span class="text-[10px] text-slate-500 ml-1">(1-5 星)</span>
          </div>
          <div class="flex gap-0.5">
            <button v-for="star in 5" :key="star"
              class="w-5 h-5 rounded text-xs transition-all"
              :class="star <= (ptForm.workRate || 0) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'"
              @click="ptForm.workRate = star"
            >★</button>
          </div>
        </div>

        <!-- 日期 & 备注 -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs text-slate-500 mb-0.5">测试日期</label>
            <input v-model="ptForm.measuredDate" type="date" class="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-white text-xs focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-0.5">备注</label>
            <input v-model="ptForm.notes" class="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-white text-xs focus:border-emerald-500 focus:outline-none" placeholder="选填" />
          </div>
        </div>

        <p v-if="ptError" class="text-red-400 text-xs">{{ ptError }}</p>
        <p v-if="ptSuccess" class="text-emerald-400 text-xs">{{ ptSuccess }}</p>

        <button class="btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold" :disabled="ptSubmitting" @click="submitPhysicalTest">
          {{ ptSubmitting ? '提交中...' : '✓ 提交运动表现' }}
        </button>

        <!-- Performance history -->
        <div v-if="ptHistory.length > 0" class="border-t border-white/5 pt-2">
          <h3 class="text-xs text-slate-400 mb-1">历史记录</h3>
          <div v-for="r in ptHistory.slice(0, 3)" :key="r.id" class="text-xs py-0.5">
            <span class="text-slate-300">{{ formatDate(r.measuredAt) }}</span>
            <span class="text-slate-500 ml-1">
              <template v-if="r.sprint10m">10m:{{ r.sprint10m }}s </template>
              <template v-if="r.sprint30m">30m:{{ r.sprint30m }}s </template>
              <template v-if="r.verticalJump">跳:{{ r.verticalJump }}cm </template>
              <template v-if="r.agility">敏:{{ r.agility }}s </template>
              <template v-if="r.endurance">耐:{{ r.endurance }}级 </template>
              <template v-if="r.firstTouch">触:{{ r.firstTouch }}★ </template>
              <template v-if="r.weakFoot">逆:{{ r.weakFoot }}★ </template>
              <template v-if="r.shootingPower">射:{{ r.shootingPower }}★ </template>
              <template v-if="r.passingAccuracy">传:{{ r.passingAccuracy }}★ </template>
              <template v-if="r.workRate">跑:{{ r.workRate }}★</template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="glass-card p-8 text-center text-slate-500 text-sm">
      请先选择球员以录入体测数据
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { playerApi, biometricsApi, physicalTestApi } from '@/api'
import { PHYSICAL_TEST_INDICATORS } from '@shared/types'

const players = ref<any[]>([])
const bioHistory = ref<any[]>([])
const ptHistory = ref<any[]>([])
const selectedPlayerId = ref('')

interface FormFields { [key: string]: any }

// ── 身体测量表单 ──
const bioSubmitting = ref(false)
const bioError = ref('')
const bioSuccess = ref('')
const bioForm = ref<FormFields>({ heightCm: '', weightKg: '', sittingHeightCm: '' })

// ── 运动表现表单 ──
const ptSubmitting = ref(false)
const ptError = ref('')
const ptSuccess = ref('')
const ptForm = ref<FormFields>({
  sprint10m: null, sprint30m: null, verticalJump: null,
  agility: null, endurance: null,
  firstTouch: null, weakFoot: null, shootingPower: null, passingAccuracy: null,
  workRate: null,
  measuredDate: new Date().toISOString().slice(0, 10),
  notes: '',
})

const allSpeedIndicators = PHYSICAL_TEST_INDICATORS.speed
const allTechIndicators = PHYSICAL_TEST_INDICATORS.technique

// ── 合并告警 ──
const alerts = computed(() => {
  const result: any[] = []
  for (const a of bioAlerts.value) {
    result.push({ ...a, type: 'biometrics' })
  }
  for (const a of ptAlerts.value) {
    result.push({ ...a, type: 'physical_test' })
  }
  return result.sort((a, b) => (b.daysSince || 0) - (a.daysSince || 0))
})

const bioAlerts = ref<any[]>([])
const ptAlerts = ref<any[]>([])

onMounted(async () => {
  try {
    const [pRes, baRes, paRes] = await Promise.all([
      playerApi.list(),
      biometricsApi.alerts(),
      physicalTestApi.alerts(),
    ])
    players.value = pRes.data.data || []
    bioAlerts.value = baRes.data.data || []
    ptAlerts.value = paRes.data.data || []
  } catch (e) { console.error(e) }
})

watch(selectedPlayerId, async (pid) => {
  if (pid) {
    try {
      const [bRes, pRes] = await Promise.all([
        biometricsApi.list(pid),
        physicalTestApi.list(pid),
      ])
      bioHistory.value = bRes.data.data || []
      ptHistory.value = pRes.data.data || []
    } catch (e) { console.error(e) }
  }
})

// ── 提交身体测量 ──
async function submitBiometrics() {
  bioError.value = ''
  bioSuccess.value = ''
  if (!selectedPlayerId.value) { bioError.value = '请选择球员'; return }
  const h = parseFloat(bioForm.value.heightCm)
  const w = parseFloat(bioForm.value.weightKg)
  const s = parseFloat(bioForm.value.sittingHeightCm)
  if (!h || !w || !s) { bioError.value = '请填写完整的身体数据'; return }
  if (s >= h) { bioError.value = '坐高不能大于等于身高'; return }

  bioSubmitting.value = true
  try {
    await biometricsApi.create({ playerId: selectedPlayerId.value, heightCm: h, weightKg: w, sittingHeightCm: s })
    bioSuccess.value = '身体测量录入成功！'
    bioForm.value = { heightCm: '', weightKg: '', sittingHeightCm: '' }
    const [aRes, hRes] = await Promise.all([biometricsApi.alerts(), biometricsApi.list(selectedPlayerId.value)])
    bioAlerts.value = aRes.data.data || []
    bioHistory.value = hRes.data.data || []
  } catch (e: any) {
    bioError.value = e.response?.data?.error || '录入失败'
  } finally { bioSubmitting.value = false }
}

// ── 提交运动表现 ──
function toNullableNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

async function submitPhysicalTest() {
  ptError.value = ''
  ptSuccess.value = ''
  if (!selectedPlayerId.value) { ptError.value = '请选择球员'; return }

  const sprint10m = toNullableNum(ptForm.value.sprint10m)
  const sprint30m = toNullableNum(ptForm.value.sprint30m)
  const verticalJump = toNullableNum(ptForm.value.verticalJump)
  const agility = toNullableNum(ptForm.value.agility)
  const endurance = toNullableNum(ptForm.value.endurance)
  const firstTouch = toNullableNum(ptForm.value.firstTouch)
  const weakFoot = toNullableNum(ptForm.value.weakFoot)
  const shootingPower = toNullableNum(ptForm.value.shootingPower)
  const passingAccuracy = toNullableNum(ptForm.value.passingAccuracy)
  const workRate = toNullableNum(ptForm.value.workRate)

  if (!sprint10m && !sprint30m && !verticalJump && !agility && !endurance
    && !firstTouch && !weakFoot && !shootingPower && !passingAccuracy && !workRate) {
    ptError.value = '请至少填写一项运动表现数据'
    return
  }

  const measuredAt = ptForm.value.measuredDate
    ? new Date(ptForm.value.measuredDate + 'T12:00:00').getTime()
    : Date.now()

  ptSubmitting.value = true
  try {
    await physicalTestApi.create({
      playerId: selectedPlayerId.value,
      sprint10m, sprint30m, verticalJump, agility, endurance,
      firstTouch, weakFoot, shootingPower, passingAccuracy, workRate,
      measuredAt, notes: ptForm.value.notes || null,
    })
    ptSuccess.value = '运动表现录入成功！'
    ptForm.value = {
      sprint10m: null, sprint30m: null, verticalJump: null,
      agility: null, endurance: null,
      firstTouch: null, weakFoot: null, shootingPower: null, passingAccuracy: null,
      workRate: null,
      measuredDate: new Date().toISOString().slice(0, 10), notes: '',
    }
    const [aRes, hRes] = await Promise.all([physicalTestApi.alerts(), physicalTestApi.list(selectedPlayerId.value)])
    ptAlerts.value = aRes.data.data || []
    ptHistory.value = hRes.data.data || []
  } catch (e: any) {
    ptError.value = e.response?.data?.error || '录入失败'
  } finally { ptSubmitting.value = false }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN')
}
</script>
