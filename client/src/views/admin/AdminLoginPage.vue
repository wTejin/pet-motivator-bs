<template>
  <div class="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-5xl mb-4">🛡️</div>
        <h1 class="text-2xl font-bold text-white mb-2" style="font-family: var(--font-display)">管理后台</h1>
        <p class="text-white/40 text-sm">星宠契约 · 系统管理</p>
      </div>

      <div class="glass-card p-8">
        <div class="mb-4">
          <label class="block text-white/70 text-sm mb-2">管理员账号</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入管理员账号"
            class="input-field"
          />
        </div>
        <div class="mb-6">
          <label class="block text-white/70 text-sm mb-2">密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            class="input-field"
            @keyup.enter="handleLogin"
          />
        </div>
        <div v-if="error" class="text-red-400 text-sm mb-4 text-center">{{ error }}</div>
        <button
          :disabled="loading"
          class="btn-primary w-full"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <p class="text-center mt-4 text-white/50 text-sm">
          <router-link to="/login" class="text-white/40 hover:text-white transition-colors">教练登录</router-link>
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
