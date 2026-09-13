import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: 'Flowboard' } },
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: 'Sign in' } },
  {
    path: '/board',
    name: 'board',
    component: () => import('@/views/BoardView.vue'),
    meta: { requiresAuth: true, title: 'Board' },
    children: [
      // Modal route: renders on top of the board, deep-linkable as /board/<cardId>.
      { path: ':cardId', name: 'card', component: () => import('@/views/CardModalView.vue'), props: true, meta: { requiresAuth: true, title: 'Card' } },
    ],
  },
  { path: '/admin', name: 'admin', component: () => import('@/views/AdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true, title: 'Admin' } },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { requiresAuth: true, title: 'Settings' } },
  { path: '/api-mock', name: 'api-mock', component: () => import('@/views/ApiMockView.vue'), meta: { title: 'API mock' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: 'Not found' } },
]

const router = createRouter({
  // HTML5 history mode: the server must rewrite unknown paths to index.html.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'login', query: { redirect: to.fullPath, reason: 'admin' } }
  }
  if (to.name === 'login' && auth.isAuthenticated && !to.query.reason) {
    return { name: 'board' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Flowboard` : 'Flowboard'
})

export default router
