<script setup lang="ts">
import { ref, watch } from 'vue'
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

const LINKS = [
  { href: '#features', label: 'القدرات' },
  { href: '#how-it-works', label: 'آلية العمل' },
  { href: '#pricing', label: 'الأسعار' },
]
</script>

<template>
  <nav class="border-primary-100/70 fixed top-0 z-50 w-full border-b bg-surface/80 backdrop-blur-xl">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between sm:h-20">
        <AppLogo />

        <div class="hidden items-center gap-8 md:flex">
          <a
            v-for="l in LINKS"
            :key="l.href"
            :href="l.href"
            class="hover:text-primary-600 font-medium text-gray-600 transition-colors"
          >
            {{ l.label }}
          </a>
          <RouterLink
            :to="auth.isAuthenticated ? '/app' : '/login'"
            class="hover:text-primary-600 font-medium text-gray-600 transition-colors"
          >
            {{ auth.isAuthenticated ? 'لوحة التحكم' : 'تسجيل الدخول' }}
          </RouterLink>
        </div>

        <div class="flex items-center gap-2">
          <RouterLink
            to="/book"
            class="btn-brand rounded-full px-4 py-2 text-sm font-medium sm:px-6 sm:py-2.5"
          >
            احجز الآن
          </RouterLink>

          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-gray-600 hover:bg-gray-100 md:hidden"
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
      <div v-if="open" id="mobile-menu" class="border-t border-gray-200 bg-surface md:hidden">
        <div class="space-y-1 px-4 py-3">
          <a
            v-for="l in LINKS"
            :key="l.href"
            :href="l.href"
            class="block rounded-[var(--radius-md)] px-3 py-2.5 font-medium text-gray-700 hover:bg-gray-100"
            @click="open = false"
          >
            {{ l.label }}
          </a>
          <RouterLink
            :to="auth.isAuthenticated ? '/app' : '/login'"
            class="block rounded-[var(--radius-md)] px-3 py-2.5 font-medium text-gray-700 hover:bg-gray-100"
          >
            {{ auth.isAuthenticated ? 'لوحة التحكم' : 'تسجيل الدخول' }}
          </RouterLink>
        </div>
      </div>
    </Transition>
  </nav>
</template>
