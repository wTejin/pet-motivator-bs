import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/join',
    },
    {
      path: '/join',
      name: 'playerSelection',
      component: () => import('@/views/player/PlayerSelectionPage.vue'),
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
      path: '/login',
      name: 'coachLogin',
      component: () => import('@/views/coach/CoachLoginPage.vue'),
    },
    {
      path: '/coach/dashboard',
      name: 'coachDashboard',
      component: () => import('@/views/coach/CoachDashboardPage.vue'),
    },
    {
      path: '/coach/score',
      name: 'coachScore',
      component: () => import('@/views/coach/CoachScorePage.vue'),
    },
    {
      path: '/coach/score-config',
      name: 'coachScoreConfig',
      component: () => import('@/views/coach/CoachScoreConfigPage.vue'),
    },
    {
      path: '/coach/players',
      name: 'coachPlayers',
      component: () => import('@/views/coach/CoachPlayersPage.vue'),
    },
    {
      path: '/coach/player-cards',
      name: 'coachPlayerCards',
      component: () => import('@/views/coach/CoachPlayerCardsPage.vue'),
    },
    {
      path: '/coach/shop',
      name: 'coachShop',
      component: () => import('@/views/coach/CoachShopPage.vue'),
    },
    {
      path: '/admin/login',
      name: 'adminLogin',
      component: () => import('@/views/admin/AdminLoginPage.vue'),
    },
    {
      path: '/admin/dashboard',
      name: 'adminDashboard',
      component: () => import('@/views/admin/AdminDashboardPage.vue'),
    },
    {
      path: '/admin/coaches',
      name: 'adminCoaches',
      component: () => import('@/views/admin/AdminCoachesPage.vue'),
    },
  ],
})

export default router
