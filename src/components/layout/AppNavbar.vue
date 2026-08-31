<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'
import AppLogo from '@/components/ui/AppLogo.vue'
import { useAuthStore } from '@/stores/auth'

/** Marketing chrome. Below `md` the links move into a disclosure menu rather
 *  than disappearing — the previous build left mobile users with no navigation. */
const open = ref(false)
const route = useRoute()
const auth = useAuthStore()

watch(
  () => route.fullPath,
  () => (open.value = false),
)

/**
 * The bar rides transparent while a dark stage is behind it, and takes on a
 * surface once that stage has scrolled past.
 *
 * Keyed off the stage's own bounds rather than a scrollY threshold: the home
 * hero is four viewports tall, so any fixed offset would turn the bar solid
 * white while it is still sitting on black.
 */
const overDark = ref(false)
const onHero = computed(() => overDark.value && !open.value)

let ticking = false
function measure() {
  const stage = document.querySelector('[data-dark-stage]')
  // 64px is the bar's own height — it stops being "over" the stage once the
  // stage's bottom edge has passed under it.
  overDark.value = !!stage && stage.getBoundingClientRect().bottom > 64
}

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    measure()
    ticking = false
  })
}

// The stage belongs to the route's component, which mounts after this one.
watch(
  () => route.fullPath,
  () => requestAnimationFrame(measure),
  { immediate: true },
)

onMounted(() => {
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})

const LINKS = [
  { href: '#features', label: 'القدرات' },
  { href: '#how-it-works', label: 'آلية العمل' },
  { href: '#pricing', label: 'الأسعار' },
]
</script>

<template>
  <nav
    class="fixed top-0 z-50 w-full border-b transition-colors duration-300"
    :class="
      onHero ? 'border-transparent bg-transparent' : 'border-border bg-surface/85 backdrop-blur-xl'
    "
  >
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between sm:h-20">
        <AppLogo :inverse="onHero" />

        <div class="hidden items-center gap-8 md:flex">
          <a
            v-for="l in LINKS"
            :key="l.href"
            :href="l.href"
            class="font-medium transition-colors"
            :class="
              onHero ? 'text-white/70 hover:text-white' : 'text-fg-muted hover:text-primary-600'
            "
          >
            {{ l.label }}
          </a>
          <RouterLink
            :to="auth.isAuthenticated ? '/app' : '/login'"
            class="font-medium transition-colors"
            :class="
              onHero ? 'text-white/70 hover:text-white' : 'text-fg-muted hover:text-primary-600'
            "
          >
            {{ auth.isAuthenticated ? 'لوحة التحكم' : 'تسجيل الدخول' }}
          </RouterLink>
        </div>

        <div class="flex items-center gap-2">
          <RouterLink
            to="/book"
            class="rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-6 sm:py-2.5"
            :class="onHero ? 'bg-white text-gray-900 hover:bg-white/90' : 'btn-brand'"
          >
            احجز الآن
          </RouterLink>

          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] md:hidden"
            :class="
              onHero ? 'text-white hover:bg-white/10' : 'text-fg-muted hover:bg-surface-sunken'
            "
            :aria-expanded="open"
            aria-controls="mobile-menu"
            :aria-label="open ? 'إغلاق القائمة' : 'فتح القائمة'"
            @click="open = !open"
          >
            <X v-if="open" class="h-5 w-5" />
            <Menu v-else class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="open" id="mobile-menu" class="border-border bg-surface border-t md:hidden">
        <div class="space-y-1 px-4 py-3">
          <a
            v-for="l in LINKS"
            :key="l.href"
            :href="l.href"
            class="text-fg hover:bg-surface-sunken block rounded-[var(--radius-md)] px-3 py-2.5 font-medium"
            @click="open = false"
          >
            {{ l.label }}
          </a>
          <RouterLink
            :to="auth.isAuthenticated ? '/app' : '/login'"
            class="text-fg hover:bg-surface-sunken block rounded-[var(--radius-md)] px-3 py-2.5 font-medium"
          >
            {{ auth.isAuthenticated ? 'لوحة التحكم' : 'تسجيل الدخول' }}
          </RouterLink>
        </div>
      </div>
    </Transition>
  </nav>
</template>
