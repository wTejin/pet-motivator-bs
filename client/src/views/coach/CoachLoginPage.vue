<template>
  <div class="coach-login-page">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="text-6xl mb-4">⚽</div>
        <h1 class="login-title">星宠契约</h1>
        <p class="login-subtitle">教练端</p>
      </div>

      <div class="login-card">
        <!-- Login Mode -->
        <div v-if="mode === 'login'">
          <div class="mb-4">
            <label class="login-label">手机号</label>
            <input
              v-model="phone"
              type="tel"
              maxlength="11"
              placeholder="请输入11位手机号"
              class="login-input"
            />
          </div>
          <div class="mb-6">
            <label class="login-label">密码</label>
            <input
              v-model="password"
              type="password"
              placeholder="请输入密码"
              class="login-input"
              @keyup.enter="handleLogin"
            />
          </div>
          <div v-if="error" class="text-red-500 text-sm mb-4 text-center">{{ error }}</div>
          <button
            :disabled="loading"
            class="btn-primary w-full"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </button>
          <p class="text-center mt-4 text-gray-500 text-sm">
            还没有账号？
            <button class="text-blue-600 hover:text-blue-500 font-medium transition-colors" @click="mode = 'register'">立即注册</button>
          </p>
        </div>

        <!-- Register Mode -->
        <div v-else>
          <div class="mb-4">
            <label class="login-label">手机号</label>
            <input
              v-model="phone"
              type="tel"
              maxlength="11"
              placeholder="请输入11位手机号"
              class="login-input"
            />
          </div>
          <div class="mb-4">
            <label class="login-label">密码</label>
            <input
              v-model="password"
              type="password"
              placeholder="请设置密码（至少6位）"
              class="login-input"
            />
          </div>
          <div class="mb-4">
            <label class="login-label">学校 / 团队（选填）</label>
            <input
              v-model="school"
              type="text"
              placeholder="例如：北京大学"
              class="login-input"
            />
          </div>
          <div class="mb-6">
            <label class="login-label">确认密码</label>
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              class="login-input"
              @keyup.enter="handleRegister"
            />
          </div>
          <p class="text-gray-500 text-sm mb-4 text-center">注册后享7天免费试用</p>
          <div v-if="error" class="text-red-500 text-sm mb-4 text-center">{{ error }}</div>
          <button
            :disabled="loading"
            class="btn-primary w-full"
            @click="handleRegister"
          >
            {{ loading ? '注册中...' : '注 册' }}
          </button>
          <p class="text-center mt-4 text-gray-500 text-sm">
            <button class="text-blue-600 hover:text-blue-500 font-medium transition-colors" @click="mode = 'login'; error = ''">返回登录</button>
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
const confirmPassword = ref('')
const school = ref('')
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
    router.push('/coach/score')
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
  if (!password.value || password.value.length < 6) {
    error.value = '密码至少6位'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await coachApi.register(phone.value, password.value, school.value)
    error.value = ''
    mode.value = 'login'
    alert('注册成功！请使用新密码登录')
  } catch (e: any) {
    error.value = e.response?.data?.error || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.coach-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
}

.login-title {
  font-size: 28px;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 8px;
  font-family: var(--font-display);
}

.login-subtitle {
  font-size: 16px;
  color: #666;
}

.login-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 32px;
}

.login-label {
  display: block;
  font-size: 14px;
  color: #555;
  margin-bottom: 8px;
}

.login-input {
  width: 100%;
  padding: 12px 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  color: #333;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.login-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.15);
}

.login-input::placeholder {
  color: #aaa;
}
</style>
