<template>
  <div class="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="text-6xl mb-4">⚽</div>
        <h1 class="text-3xl font-bold text-white mb-2" style="font-family: var(--font-display)">星宠契约</h1>
        <p class="text-white/50 text-lg">教练端</p>
      </div>

      <div class="glass-card p-8">
        <!-- Login Mode -->
        <div v-if="mode === 'login'">
          <div class="mb-4">
            <label class="block text-white/70 text-sm mb-2">手机号</label>
            <input
              v-model="phone"
              type="tel"
              maxlength="11"
              placeholder="请输入11位手机号"
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
            还没有账号？
            <button class="text-[#39FF14] hover:text-green-300 transition-colors" @click="mode = 'register'">立即注册</button>
          </p>
          <p class="text-center mt-2 text-white/50 text-sm">
            <router-link to="/admin/login" class="text-white/40 hover:text-white transition-colors">管理员登录</router-link>
          </p>
        </div>

        <!-- Register Mode -->
        <div v-else>
          <div class="mb-4">
            <label class="block text-white/70 text-sm mb-2">手机号</label>
            <input
              v-model="phone"
              type="tel"
              maxlength="11"
              placeholder="请输入11位手机号"
              class="input-field"
            />
          </div>
          <p class="text-white/50 text-sm mb-6 text-center">注册后默认密码为手机号后六位，享7天免费试用</p>
          <div v-if="error" class="text-red-400 text-sm mb-4 text-center">{{ error }}</div>
          <button
            :disabled="loading"
            class="btn-primary w-full"
            @click="handleRegister"
          >
            {{ loading ? '注册中...' : '注 册' }}
          </button>
          <p class="text-center mt-4 text-white/50 text-sm">
            <button class="text-[#39FF14] hover:text-green-300 transition-colors" @click="mode = 'login'; error = ''">返回登录</button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { coachApi } from '@/api'

const router = useRouter()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const phone = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  if (!phone.value || !/^\d{11}$/.test(phone.value)) {
    error.value = '请输入有效的11位手机号'
    return
  }
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  loading.value = true
  try {
    await auth.loginAsCoach(phone.value, password.value)
    router.push('/coach/dashboard')
  } catch (e: any) {
    error.value = e.response?.data?.error || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  error.value = ''
  if (!phone.value || !/^\d{11}$/.test(phone.value)) {
    error.value = '请输入有效的11位手机号'
    return
  }
  loading.value = true
  try {
    await coachApi.register(phone.value)
    error.value = ''
    mode.value = 'login'
    alert('注册成功！默认密码为手机号后六位')
  } catch (e: any) {
    error.value = e.response?.data?.error || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>
