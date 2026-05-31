<template>
  <div class="admin-login-page">
    <div class="login-container">
      <div class="login-brand">
        <div class="brand-icon">🛡️</div>
        <h1 class="brand-title">管理后台</h1>
        <p class="brand-sub">星宠契约 · 系统管理</p>
      </div>

      <div class="login-card">
        <div class="form-group">
          <label class="form-label">管理员账号</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入管理员账号"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            class="form-input"
            @keyup.enter="handleLogin"
          />
        </div>
        <div v-if="error" class="form-error">{{ error }}</div>
        <button
          :disabled="loading"
          class="login-btn"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <p class="login-footer">
          <router-link to="/login" class="footer-link">教练登录 →</router-link>
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

<style scoped>
.admin-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.login-container {
  width: 100%;
  max-width: 380px;
}

.login-brand {
  text-align: center;
  margin-bottom: 28px;
}

.brand-icon {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 12px;
}

.brand-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 6px;
}

.brand-sub {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.login-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 32px 28px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: #333;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #42a5f5;
  box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.15);
}

.form-error {
  color: #dc2626;
  font-size: 13px;
  text-align: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.06);
  border-radius: 8px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  box-shadow: 0 4px 12px rgba(66, 165, 245, 0.25);
}

.login-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  text-align: center;
  margin: 16px 0 0;
}

.footer-link {
  color: #888;
  font-size: 13px;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #42a5f5;
}
</style>
