<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <h2 class="text-xl font-bold" style="font-family: var(--font-display)">教练管理</h2>

    <!-- Add Coach Form -->
    <div class="glass-card p-4">
      <h3 class="text-sm font-semibold mb-3 text-white/70">添加教练</h3>
      <div class="flex flex-col md:flex-row gap-3">
        <input
          v-model="newPhone"
          type="tel"
          maxlength="11"
          placeholder="输入11位手机号"
          class="input-field flex-1"
        />
        <button
          class="btn-primary"
          @click="handleAddCoach"
        >
          添加
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-white/60 py-8">加载中...</div>

    <!-- Coaches Table -->
    <div v-else class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-white/40 text-sm border-b border-white/10">
              <th class="pb-3 pr-4 pl-4">手机号</th>
              <th class="pb-3 pr-4">姓名</th>
              <th class="pb-3 pr-4">学校</th>
              <th class="pb-3 pr-4">球员数</th>
              <th class="pb-3 pr-4">状态</th>
              <th class="pb-3 pr-4">试用期</th>
              <th class="pb-3 pr-4">授权至</th>
              <th class="pb-3 pr-4">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="coach in coaches" :key="coach.id" class="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td class="py-3 pr-4 pl-4 text-sm">{{ coach.phone }}</td>
              <td class="py-3 pr-4 text-sm">{{ coach.name || '-' }}</td>
              <td class="py-3 pr-4 text-sm">{{ coach.school || '-' }}</td>
              <td class="py-3 pr-4 text-sm">{{ coach.playerCount }}</td>
              <td class="py-3 pr-4">
                <span
                  :class="[
                    'px-2 py-1 text-xs rounded-full',
                    coach.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
                  ]"
                >
                  {{ coach.isActive ? '活跃' : '停用' }}
                </span>
              </td>
              <td class="py-3 pr-4 text-xs text-white/40">{{ formatDate(coach.trialUntil) }}</td>
              <td class="py-3 pr-4 text-xs" :class="isExpired(coach.authorizedUntil) ? 'text-red-400' : 'text-white/60'">
                {{ formatDate(coach.authorizedUntil) }}
              </td>
              <td class="py-3 pr-4">
                <div class="flex gap-1 flex-wrap">
                  <button
                    class="px-2 py-1 text-xs rounded transition-colors"
                    :class="coach.isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'"
                    @click="handleToggleActive(coach)"
                  >
                    {{ coach.isActive ? '停用' : '启用' }}
                  </button>
                  <button
                    class="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                    @click="handleExtendAuth(coach)"
                  >
                    延期
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="coaches.length === 0">
              <td colspan="8" class="text-center text-white/40 py-8">暂无教练数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api'

interface CoachItem {
  id: string
  phone: string
  name: string
  school: string
  isActive: boolean
  trialUntil: number
  authorizedUntil: number
  playerCount: number
}

const coaches = ref<CoachItem[]>([])
const newPhone = ref('')
const loading = ref(true)

onMounted(loadCoaches)

async function loadCoaches() {
  loading.value = true
  try {
    const res = await adminApi.getCoaches()
    coaches.value = res.data.data || []
  } catch (e) {
    console.error('Failed to load coaches', e)
  } finally {
    loading.value = false
  }
}

async function handleAddCoach() {
  if (!newPhone.value || !/^\d{11}$/.test(newPhone.value)) {
    alert('请输入有效的11位手机号')
    return
  }
  try {
    await adminApi.createCoach({ phone: newPhone.value })
    newPhone.value = ''
    alert('教练添加成功')
    await loadCoaches()
  } catch (e: any) {
    alert(e.response?.data?.error || '添加失败')
  }
}

async function handleToggleActive(coach: CoachItem) {
  try {
    await adminApi.updateCoach(coach.id, { isActive: !coach.isActive })
    await loadCoaches()
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

async function handleExtendAuth(coach: CoachItem) {
  const days = prompt('延期天数:', '30')
  if (!days) return
  const newDate = Date.now() + Number(days) * 24 * 3600 * 1000
  try {
    await adminApi.updateCoach(coach.id, { authorizedUntil: newDate })
    await loadCoaches()
    alert('授权延期成功')
  } catch (e: any) {
    alert(e.response?.data?.error || '操作失败')
  }
}

function formatDate(ts: number): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleDateString('zh-CN')
}

function isExpired(ts: number): boolean {
  return ts > 0 && ts < Date.now()
}
</script>
