import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/screen',
    },
    {
      path: '/player/:playerId',
      name: 'playerDashboard',
      component: () => import('@/views/player/PlayerDashboardPage.vue'),
    },
    {
      path: '/player/:playerId/shop',
      name: 'playerShop',
      component: () => import('@/views/player/PlayerShopPage.vue'),
    },
    {
      path: '/screen',
      name: 'teamScreen',
      component: () => import('@/views/team/TeamScreenPage.vue'),
    },
    {
      path: '/login',
      name: 'coachLogin',
      component: () => import('@/views/coach/CoachLoginPage.vue'),
    },
    {
      path: '/coach',
      component: () => import('@/views/coach/CoachLayout.vue'),
      children: [
        { path: '', redirect: '/coach/score' },
        { path: 'score', name: 'coachScore', component: () => import('@/views/coach/CoachScorePage.vue') },
        { path: 'score-config', name: 'coachScoreConfig', component: () => import('@/views/coach/CoachScoreConfigPage.vue') },
        { path: 'players', name: 'coachPlayers', component: () => import('@/views/coach/CoachPlayersPage.vue') },
        { path: 'player-cards', name: 'coachPlayerCards', component: () => import('@/views/coach/CoachPlayerCardsPage.vue') },
        { path: 'shop', redirect: '/coach/score' },
      ],
    },
    {
      path: '/admin/login',
      name: 'adminLogin',
      component: () => import('@/views/admin/AdminLoginPage.vue'),
    },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', name: 'adminDashboard', component: () => import('@/views/admin/AdminDashboardPage.vue') },
        { path: 'coaches', name: 'adminCoaches', component: () => import('@/views/admin/AdminCoachesPage.vue') },
        { path: 'shop', name: 'adminShop', component: () => import('@/views/admin/AdminShopPage.vue') },
      ],
    },
  ],
})

export default router
