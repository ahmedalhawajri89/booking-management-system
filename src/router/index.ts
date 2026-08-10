import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    /* ---------------------------------------------------------- guest */
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: 'نظام الحجوزات الاحترافي' },
    },
    {
      path: '/book',
      name: 'book',
      component: () => import('@/views/BookingView.vue'),
      meta: { title: 'احجز موعدك' },
    },
    { path: '/booking', redirect: '/book' },
    {
      path: '/booking/:reference',
      name: 'my-booking',
      component: () => import('@/views/MyBookingView.vue'),
      meta: { title: 'حجزي' },
    },

    /* ----------------------------------------------------------- auth */
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'تسجيل الدخول', guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { title: 'إنشاء حساب', guestOnly: true },
    },

    /* ------------------------------------------------------- operator */
    {
      path: '/app',
      component: () => import('@/layouts/OperatorLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'today',
          component: () => import('@/views/app/TodayView.vue'),
          meta: { title: 'اليوم' },
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('@/views/app/CalendarView.vue'),
          meta: { title: 'التقويم' },
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('@/views/app/AnalyticsView.vue'),
          meta: { title: 'التحليلات' },
        },
        {
          path: 'bookings',
          name: 'bookings',
          component: () => import('@/views/app/BookingsView.vue'),
          meta: { title: 'الحجوزات' },
        },
        {
          path: 'customers',
          name: 'customers',
          component: () => import('@/views/app/CustomersView.vue'),
          meta: { title: 'العملاء' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/app/SettingsView.vue'),
          meta: { title: 'الإعدادات' },
        },
      ],
    },
    /* legacy link from the previous build — it meant "the numbers screen",
       which now exists, so send it there rather than to Today */
    { path: '/dashboard', redirect: '/app/analytics' },

    /* A wrong URL is told it is wrong — never silently redirected. */
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'الصفحة غير موجودة' },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    // Opening or closing a drawer only changes the query — don't jump.
    if (to.path === from.path) return
    return savedPosition ?? { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'today' }
  }
  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} — حجوزات برو` : 'حجوزات برو'
})

export default router
