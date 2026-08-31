<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import {
  BarChart3,
  CalendarDays,
  ListChecks,
  LogOut,
  Plus,
  Settings,
  Sun,
  TriangleAlert,
  Users,
} from 'lucide-vue-next'
import AppLogo from '@/components/ui/AppLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import IconButton from '@/components/ui/IconButton.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseMenu from '@/components/ui/BaseMenu.vue'
import BookingFormDrawer from '@/components/booking/BookingFormDrawer.vue'
import BookingDetailDrawer from '@/components/booking/BookingDetailDrawer.vue'
import { useBookingsStore } from '@/stores/bookings'
import { useCustomersStore } from '@/stores/customers'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { fullDate } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const bookings = useBookingsStore()
const customers = useCustomersStore()
const settings = useSettingsStore()
const auth = useAuthStore()

const NAV = [
  { to: '/app', label: 'اليوم', icon: Sun },
  { to: '/app/calendar', label: 'التقويم', icon: CalendarDays },
  { to: '/app/bookings', label: 'الحجوزات', icon: ListChecks },
  { to: '/app/customers', label: 'العملاء', icon: Users },
  { to: '/app/analytics', label: 'التحليلات', icon: BarChart3 },
  { to: '/app/settings', label: 'الإعدادات', icon: Settings },
]

/**
 * Six is one too many for the bottom bar on a phone, so these two live in the
 * account menu there instead of being crushed to unreadable widths.
 */
const PHONE_HIDDEN = new Set(['/app/analytics', '/app/settings'])

const ACCOUNT_ITEMS = [
  { value: 'analytics', label: 'التحليلات', icon: BarChart3 },
  { value: 'settings', label: 'الإعدادات', icon: Settings },
  { value: 'signout', label: 'تسجيل الخروج', icon: LogOut, tone: 'danger', separated: true },
]

const query = ref('')
const createOpen = ref(false)
const searchRef = ref(null)

const attentionCount = computed(() => bookings.attention.length)
const openBookingId = computed(() => route.query.booking ?? null)

function isActive(to) {
  return to === '/app' ? route.path === '/app' : route.path.startsWith(to)
}

function openBooking(id) {
  void router.push({ query: { ...route.query, booking: id } })
}

function closeBooking() {
  const q = { ...route.query }
  delete q.booking
  void router.push({ query: q })
}

/** One search box for the whole shell. On the bookings screen it filters in
 *  place; anywhere else Enter takes you there with the query applied. */
function runSearch() {
  if (!query.value.trim()) return
  void router.push({ path: '/app/bookings', query: { q: query.value.trim() } })
}

watch(query, (q) => {
  if (route.path !== '/app/bookings') return
  const next = { ...route.query }
  if (q.trim()) next.q = q.trim()
  else delete next.q
  void router.replace({ query: next })
})

// Keep the box in sync when the route carries a query (deep link, back button).
watch(
  () => route.query.q,
  (q) => {
    const incoming = typeof q === 'string' ? q : ''
    if (incoming !== query.value) query.value = incoming
  },
  { immediate: true },
)

function signOut() {
  auth.signOut()
  void router.push('/')
}

function onAccountSelect(value) {
  if (value === 'signout') return signOut()
  void router.push(value === 'settings' ? '/app/settings' : '/app/analytics')
}

/** Global shortcuts: `/` focuses search, `n` opens the create drawer. */
function onKeydown(e) {
  const target = e.target
  const typing =
    /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '') || target?.isContentEditable
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return

  if (e.key === '/') {
    e.preventDefault()
    searchRef.value?.focus()
  } else if (e.key.toLowerCase() === 'n') {
    e.preventDefault()
    createOpen.value = true
  }
}

onMounted(() => {
  // Settings first: services and opening hours are what the availability
  // engine reads, so every other screen depends on them being current.
  void settings.load()
  void bookings.load()
  void customers.load()
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <a
      href="#main"
      class="sr-only-focusable fixed top-2 z-[70] rounded-[var(--radius-md)] bg-gray-900 px-3 py-2 text-sm text-white"
      style="inset-inline-start: 8px"
    >
      تخطَّ إلى المحتوى
    </a>

    <!-- Rail: labels ≥lg, icons ≥md, bottom tabs below md -->
    <aside
      class="bg-surface fixed bottom-0 z-30 flex w-full shrink-0 border-t border-gray-200 md:sticky md:top-0 md:h-screen md:w-16 md:flex-col md:border-e md:border-t-0 md:border-gray-200 lg:w-60"
    >
      <div class="hidden h-16 items-center px-4 md:flex lg:px-5">
        <AppLogo compact />
      </div>

      <nav class="flex flex-1 justify-around gap-1 p-1 md:flex-col md:justify-start md:p-2">
        <RouterLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="flex-1 flex-col items-center gap-0.5 rounded-[var(--radius-md)] px-2 py-2 text-[11px] font-semibold transition-colors md:flex-none md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-sm"
          :class="[
            isActive(item.to)
              ? 'bg-primary-50 text-primary-700'
              : 'text-fg-subtle hover:bg-surface-sunken hover:text-fg',
            PHONE_HIDDEN.has(item.to) ? 'hidden md:flex' : 'flex',
          ]"
        >
          <component :is="item.icon" class="h-5 w-5 shrink-0" aria-hidden="true" />
          <span class="md:hidden lg:inline">{{ item.label }}</span>
          <span class="sr-only md:sr-only md:not-sr-only lg:hidden">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="border-border hidden border-t p-2 md:block">
        <button
          type="button"
          class="hover:bg-danger-50 hover:text-danger-700 text-fg-subtle flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold transition-colors"
          @click="signOut"
        >
          <LogOut class="h-5 w-5 shrink-0" aria-hidden="true" />
          <span class="hidden lg:inline">تسجيل الخروج</span>
        </button>
      </div>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
      <header
        class="bg-surface/95 sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-gray-200 px-4 backdrop-blur sm:gap-3 lg:px-6"
      >
        <p class="hidden min-w-0 truncate text-sm font-semibold text-gray-500 lg:block">
          {{ fullDate(new Date()) }}
        </p>

        <div class="min-w-0 flex-1 sm:max-w-sm lg:ms-4">
          <SearchInput
            ref="searchRef"
            v-model="query"
            placeholder="ابحث برقم الحجز أو الاسم أو الجوال"
            shortcut
            @keydown.enter="runSearch"
          />
        </div>

        <RouterLink
          v-if="attentionCount > 0"
          to="/app/bookings?filter=attention"
          class="border-warning-100 bg-warning-50 text-warning-700 hover:bg-warning-100 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 text-xs font-bold transition-colors sm:px-3 sm:text-sm"
        >
          <TriangleAlert class="h-4 w-4" aria-hidden="true" />
          <span class="hidden sm:inline">يحتاج إجراء</span>
          <span data-numeric>{{ attentionCount }}</span>
        </RouterLink>

        <!-- Wrappers own the responsive display: a component's own `inline-flex`
             would otherwise win over a passed-in `hidden` at the same layer. -->
        <span class="hidden sm:block">
          <BaseButton variant="primary" :icon="Plus" @click="createOpen = true">
            حجز جديد
          </BaseButton>
        </span>
        <span class="block sm:hidden">
          <IconButton
            :icon="Plus"
            label="حجز جديد"
            variant="secondary"
            @click="createOpen = true"
          />
        </span>

        <!-- The only way out of the session on a phone: the rail's sign-out
             button is hidden below md, which used to leave mobile users with
             no way to log out at all. -->
        <BaseMenu :items="ACCOUNT_ITEMS" label="قائمة الحساب" @select="onAccountSelect">
          <template #trigger="{ open }">
            <button
              type="button"
              class="focus-visible:ring-ring shrink-0 rounded-full transition-opacity hover:opacity-80"
              :aria-expanded="open"
              aria-haspopup="menu"
              :aria-label="`الحساب: ${auth.user?.name ?? 'المشغّل'}`"
            >
              <BaseAvatar :name="auth.user?.name ?? 'المشغّل'" size="sm" />
            </button>
          </template>
        </BaseMenu>
      </header>

      <main id="main" class="flex-1">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" @open-booking="openBooking" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <BookingFormDrawer :open="createOpen" @close="createOpen = false" @created="openBooking" />
    <BookingDetailDrawer :booking-id="openBookingId" @close="closeBooking" />
  </div>
</template>
