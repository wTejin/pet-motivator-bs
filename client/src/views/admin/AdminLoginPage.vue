<template>
  <div class="min-h-screen bg-slate-900 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">星宠契约 · 管理后台</h1>
      </div>

      <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <div class="mb-4">
          <label class="block text-white/70 text-sm mb-2">管理员账号</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入管理员账号"
            class="w-full bg-white/5 border border-white/20 text-white rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/30"
          />
        </div>
        <div class="mb-6">
          <label class="block text-white/70 text-sm mb-2">密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            class="w-full bg-white/5 border border-white/20 text-white rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/30"
            @keyup.enter="handleLogin"
          />
        </div>
        <div v-if="error" class="text-red-400 text-sm mb-4">{{ error }}</div>
        <button
          :disabled="loading"
          class="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg py-3 font-semibold hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <p class="text-center mt-4 text-white/50 text-sm">
          <router-link to="/login" class="text-blue-400 hover:text-blue-300 transition-colors">教练登录</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  if (!username.value) {
    error.value = '请输入管理员账号'
    return
  }
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  loading.value = true
  try {
    await auth.loginAsAdmin(username.value, password.value)
    router.push('/admin/dashboard')
  } catch (e: any) {
    error.value = e.response?.data?.error || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>
