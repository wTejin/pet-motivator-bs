<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">星宠契约</h1>
        <p class="text-blue-300 text-lg">教练登录</p>
      </div>

      <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <!-- Login Mode -->
        <div v-if="mode === 'login'">
          <div class="mb-4">
            <label class="block text-white/70 text-sm mb-2">手机号</label>
            <input
              v-model="phone"
              type="tel"
              maxlength="11"
              placeholder="请输入11位手机号"
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
            还没有账号？
            <button class="text-blue-400 hover:text-blue-300 transition-colors" @click="mode = 'register'">立即注册</button>
          </p>
          <p class="text-center mt-2 text-white/50 text-sm">
            <router-link to="/admin/login" class="text-blue-400 hover:text-blue-300 transition-colors">管理员登录</router-link>
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
              class="w-full bg-white/5 border border-white/20 text-white rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/30"
            />
          </div>
          <p class="text-white/50 text-sm mb-6">注册后默认密码为手机号后六位，享7天免费试用</p>
          <div v-if="error" class="text-red-400 text-sm mb-4">{{ error }}</div>
          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg py-3 font-semibold hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleRegister"
          >
            {{ loading ? '注册中...' : '注 册' }}
          </button>
          <p class="text-center mt-4 text-white/50 text-sm">
            <button class="text-blue-400 hover:text-blue-300 transition-colors" @click="mode = 'login'; error = ''">返回登录</button>
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
