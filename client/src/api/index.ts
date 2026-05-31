import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Request interceptor: attach Bearer token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: on 401, clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    if (status === 401) {
      localStorage.removeItem('token')
      window.location.hash = '#/login'
    }
    if (status === 403) {
      localStorage.removeItem('token')
      // Admin 路径的 403 → 跳转 admin 登录页；其他路径跳转 coach 登录页
      window.location.hash = url.startsWith('/admin') ? '#/admin/login' : '#/login'
    }
    return Promise.reject(error)
  },
)

export default api

// ── Admin API ────────────────────────────────────────────────────────────────

export const adminApi = {
  login(username: string, password: string) {
    return api.post('/admin/login', { username, password })
  },
  getCoaches() {
    return api.get('/admin/coaches')
  },
  createCoach(data: Record<string, unknown>) {
    return api.post('/admin/coaches', data)
  },
  updateCoach(id: string, data: Record<string, unknown>) {
    return api.put(`/admin/coaches/${id}`, data)
  },
  resetCoachPassword(id: string) {
    return api.put(`/admin/coaches/${id}/reset-password`)
  },
  getStats() {
    return api.get('/admin/stats')
  },
  importPetSpecies(data: unknown) {
    return api.post('/admin/pet-species', data)
  },
  getPetSpecies() {
    return api.get('/admin/pet-species')
  },
  createPetSpecies(data: Record<string, unknown>) {
    return api.post('/admin/pet-species', data)
  },
  updatePetSpecies(id: string, data: Record<string, unknown>) {
    return api.put(`/admin/pet-species/${id}`, data)
  },
  deletePetSpecies(id: string) {
    return api.delete(`/admin/pet-species/${id}`)
  },
  uploadImage(data: FormData) {
    return api.post('/admin/upload-image', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  importAccessories(data: unknown) {
    return api.post('/admin/accessories', data)
  },
  importBackgrounds(data: unknown) {
    return api.post('/admin/backgrounds', data)
  },
  getShopItems() {
    return api.get('/admin/shop-items')
  },
  createShopItem(data: Record<string, unknown>) {
    return api.post('/admin/shop-items', data)
  },
  updateShopItem(id: string, data: Record<string, unknown>) {
    return api.put(`/admin/shop-items/${id}`, data)
  },
  deleteShopItem(id: string) {
    return api.delete(`/admin/shop-items/${id}`)
  },
}

// ── Coach API ────────────────────────────────────────────────────────────────

export const coachApi = {
  register(phone: string, password?: string, school?: string) {
    return api.post('/coach/register', { phone, password, school })
  },
  login(phone: string, password: string) {
    return api.post('/coach/login', { phone, password })
  },
  changePassword(data: { oldPassword: string; newPassword: string }) {
    return api.put('/coach/password', data)
  },
  getDashboardStats() {
    return api.get('/coach/dashboard-stats')
  },
  getPlayers() {
    return api.get('/coach/players')
  },
  createPlayer(data: Record<string, unknown>) {
    return api.post('/coach/players', data)
  },
  updatePlayer(id: string, data: Record<string, unknown>) {
    return api.put(`/coach/players/${id}`, data)
  },
  deletePlayer(id: string) {
    return api.delete(`/coach/players/${id}`)
  },
  addScore(data: Record<string, unknown>) {
    return api.post('/coach/scores', data)
  },
  getPlayerScores(playerId: string) {
    return api.get(`/coach/scores/${playerId}`)
  },
  getPlayerStats(playerId: string) {
    return api.get(`/coach/player-stats/${playerId}`)
  },
  getDimensions() {
    return api.get('/coach/dimensions')
  },
  createDimension(data: Record<string, unknown>) {
    return api.post('/coach/dimensions', data)
  },
  updateDimension(id: string, data: Record<string, unknown>) {
    return api.put(`/coach/dimensions/${id}`, data)
  },
  deleteDimension(id: string) {
    return api.delete(`/coach/dimensions/${id}`)
  },
  createIndicator(data: Record<string, unknown>) {
    return api.post('/coach/indicators', data)
  },
  updateIndicator(id: string, data: Record<string, unknown>) {
    return api.put(`/coach/indicators/${id}`, data)
  },
  deleteIndicator(id: string) {
    return api.delete(`/coach/indicators/${id}`)
  },
  getCustomIndicators() {
    return api.get('/coach/custom-indicators')
  },
  createCustomIndicator(data: Record<string, unknown>) {
    return api.post('/coach/custom-indicators', data)
  },
  updateCustomIndicator(id: string, data: Record<string, unknown>) {
    return api.put(`/coach/custom-indicators/${id}`, data)
  },
  deleteCustomIndicator(id: string) {
    return api.delete(`/coach/custom-indicators/${id}`)
  },
  getBonusRules() {
    return api.get('/coach/bonus-rules')
  },
  updateBonusRule(id: string, data: Record<string, unknown>) {
    return api.put(`/coach/bonus-rules/${id}`, data)
  },
  getMode() {
    return api.get('/coach/mode')
  },
  setMode(mode: string) {
    return api.put('/coach/mode', { playerMode: mode })
  },
  getQuickLink(playerId: string) {
    return api.get(`/coach/players/${playerId}/quick-link`)
  },
  importData(type: string, data: unknown) {
    return api.post('/coach/import', { type, data })
  },
  uploadAvatar(data: FormData) {
    return api.post('/coach/upload-avatar', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getProfile() {
    return api.get('/coach/me')
  },
  updateProfile(data: Record<string, unknown>) {
    return api.put('/coach/me', data)
  },
}

// ── Player API ───────────────────────────────────────────────────────────────

export const playerApi = {
  getPet(playerId: string) {
    return api.get(`/player/${playerId}/pet`)
  },
  getMode(playerId: string) {
    return api.get(`/player/${playerId}/mode`)
  },
  feed(playerId: string) {
    return api.post(`/player/${playerId}/pet/feed`)
  },
  play(playerId: string) {
    return api.post(`/player/${playerId}/pet/play`)
  },
  getShop(playerId: string) {
    return api.get(`/player/${playerId}/shop`)
  },
  buy(playerId: string, itemId: string) {
    return api.post(`/player/${playerId}/shop/buy`, { itemId })
  },
  equip(playerId: string, inventoryId: string) {
    return api.put(`/player/${playerId}/shop/equip`, { inventoryId })
  },
  use(playerId: string, inventoryId: string) {
    return api.post(`/player/${playerId}/shop/use`, { inventoryId })
  },
  getLeaderboard(playerId: string) {
    return api.get(`/player/${playerId}/leaderboard`)
  },
}

// ── Public API ───────────────────────────────────────────────────────────────

export const publicApi = {
  getPlayers(phone: string) {
    return api.get(`/public/players/${phone}`)
  },
  getLeaderboard(phone: string) {
    return api.get(`/public/leaderboard/${phone}`)
  },
  getActivities(phone: string) {
    return api.get(`/public/activities/${phone}`)
  },
  getMode(phone: string) {
    return api.get(`/public/mode/${phone}`)
  },
  getPlayerStats(phone: string, playerId: string) {
    return api.get(`/public/player-stats/${phone}/${playerId}`)
  },
  getDimensions(phone: string) {
    return api.get(`/public/dimensions/${phone}`)
  },
  getPlayerPet(playerId: string) {
    return api.get(`/public/player/${playerId}/pet`)
  },
  getPlayerMode(playerId: string) {
    return api.get(`/public/player/${playerId}/mode`)
  },
  feedPlayerPet(playerId: string) {
    return api.post(`/public/player/${playerId}/pet/feed`)
  },
  playPlayerPet(playerId: string) {
    return api.post(`/public/player/${playerId}/pet/play`)
  },
  getPlayerShop(playerId: string) {
    return api.get(`/public/player/${playerId}/shop`)
  },
  buyPlayerShopItem(playerId: string, itemId: string) {
    return api.post(`/public/player/${playerId}/shop/buy`, { itemId })
  },
  equipPlayerShopItem(playerId: string, inventoryId: string) {
    return api.put(`/public/player/${playerId}/shop/equip`, { inventoryId })
  },
  usePlayerShopItem(playerId: string, inventoryId: string) {
    return api.post(`/public/player/${playerId}/shop/use`, { inventoryId })
  },
  getPlayerLeaderboard(playerId: string) {
    return api.get(`/public/player/${playerId}/leaderboard`)
  },
  getPlayerRecords(playerId: string) {
    return api.get(`/public/player/${playerId}/records`)
  },
  getCoach(phone: string) {
    return api.get(`/public/coach/${phone}`)
  },
  getPetSpecies() {
    return api.get('/public/pet-species')
  },
  createPlayerPet(playerId: string, speciesId: string) {
    return api.post(`/public/player/${playerId}/pet/create`, { speciesId })
  },
  checkin(playerId: string) {
    return api.post(`/public/player/${playerId}/checkin`)
  },
  uploadAvatar(playerId: string, data: FormData) {
    return api.post(`/public/player/${playerId}/avatar`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  updateAvatar(playerId: string, avatar: string) {
    return api.put(`/public/player/${playerId}/avatar`, { avatar })
  },
}
