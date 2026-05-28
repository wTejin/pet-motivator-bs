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
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.hash = '#/login'
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
  getStats() {
    return api.get('/admin/stats')
  },
  importPetSpecies(data: unknown) {
    return api.post('/admin/pet-species', data)
  },
  importAccessories(data: unknown) {
    return api.post('/admin/accessories', data)
  },
  importBackgrounds(data: unknown) {
    return api.post('/admin/backgrounds', data)
  },
}

// ── Coach API ────────────────────────────────────────────────────────────────

export const coachApi = {
  register(phone: string) {
    return api.post('/coach/register', { phone })
  },
  login(phone: string, password: string) {
    return api.post('/coach/login', { phone, password })
  },
  changePassword(data: { oldPassword: string; newPassword: string }) {
    return api.put('/coach/password', data)
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
  getShopItems() {
    return api.get('/coach/shop-items')
  },
  updateShopItem(id: string, data: Record<string, unknown>) {
    return api.put(`/coach/shop-items/${id}`, data)
  },
  getQuickLink(playerId: string) {
    return api.get(`/coach/players/${playerId}/quick-link`)
  },
  importData(type: string, data: unknown) {
    return api.post('/coach/import', { type, data })
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
}
