import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { coachApi, adminApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<Record<string, unknown> | null>(null)
  const role = ref<'coach' | 'admin' | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const playerMode = computed(() => (user.value?.playerMode as string) || 'display')

  async function loginAsCoach(phone: string, password: string) {
    const res = await coachApi.login(phone, password)
    const body = res.data
    if (body.success && body.data?.token) {
      token.value = body.data.token as string
      user.value = (body.data.coach || null) as Record<string, unknown> | null
      role.value = 'coach'
      localStorage.setItem('token', body.data.token)
    }
  }

  async function loginAsAdmin(username: string, password: string) {
    const res = await adminApi.login(username, password)
    const body = res.data
    if (body.success && body.data?.token) {
      token.value = body.data.token as string
      user.value = (body.data.admin || null) as Record<string, unknown> | null
      role.value = 'admin'
      localStorage.setItem('token', body.data.token)
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    role.value = null
    localStorage.removeItem('token')
    window.location.hash = '#/login'
  }

  async function refreshMode() {
    if (role.value === 'coach') {
      const res = await coachApi.getMode()
      const body = res.data
      if (user.value) {
        user.value = {
          ...user.value,
          playerMode: body.data?.playerMode || 'display',
        }
      }
    }
  }

  async function refreshUser() {
    if (role.value === 'coach') {
      const res = await coachApi.getProfile()
      const body = res.data
      if (body.success && body.data && user.value) {
        user.value = { ...user.value, ...body.data }
      }
    }
  }

  async function setMode(mode: string) {
    await coachApi.setMode(mode)
    if (user.value) {
      user.value = { ...user.value, playerMode: mode }
    }
  }

  return {
    token,
    user,
    role,
    isLoggedIn,
    playerMode,
    loginAsCoach,
    loginAsAdmin,
    logout,
    refreshMode,
    setMode,
    refreshUser,
  }
})
