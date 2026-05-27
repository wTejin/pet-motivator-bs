<template>
  <div class="min-h-screen bg-slate-900 text-white">
    <!-- Top Nav -->
    <nav class="bg-gray-800/50 border-b border-white/10 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <router-link to="/admin/dashboard" class="text-white/60 hover:text-white transition-colors">
          &#8592; 返回
        </router-link>
        <h1 class="text-lg font-bold">教练管理</h1>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-sm text-white/60">{{ auth.user?.username }}</span>
        <button
          class="text-sm text-white/60 hover:text-red-400 transition-colors"
          @click="auth.logout()"
        >
          退出
        </button>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto p-4 md:p-6">
      <!-- Add Coach Form -->
      <div class="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
        <h3 class="text-sm font-semibold mb-3">添加教练</h3>
        <div class="flex flex-col md:flex-row gap-3">
          <input
            v-model="newPhone"
            type="tel"
            maxlength="11"
            placeholder="输入11位手机号"
            class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 flex-1 focus:border-blue-500 focus:outline-none placeholder:text-white/30"
          />
          <button
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            @click="handleAddCoach"
          >
            添加
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center text-white/60 py-8">加载中...</div>

      <!-- Coaches Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left text-white/40 text-sm border-b border-white/10">
              <th class="pb-3 pr-4">手机号</th>
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
            <tr v-for="coach in coaches" :key="coach.id" class="border-b border-white/5">
              <td class="py-3 pr-4 text-sm">{{ coach.phone }}</td>
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
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

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
