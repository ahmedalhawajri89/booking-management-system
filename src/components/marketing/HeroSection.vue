<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, CalendarCheck, Play } from 'lucide-vue-next'
import HeroPreview from './HeroPreview.vue'

/**
 * Editorial hero: asymmetric, type-led, with a real product artifact instead of
 * a decorative illustration. The rotating word keeps the headline alive without
 * animating the layout, and a light parallax on the background separates the
 * copy plane from the wash behind it.
 */
const WORDS = ['بلا تعارضات', 'بلا مكالمات', 'بلا مواعيد ضائعة', 'بلا فوضى']
const wordIndex = ref(0)
const parallax = ref(0)

let wordTimer: number | undefined
let ticking = false

const REDUCED =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function onScroll() {
  if (ticking || REDUCED) return
  ticking = true
  requestAnimationFrame(() => {
    parallax.value = Math.min(120, window.scrollY * 0.18)
    ticking = false
  })
}

onMounted(() => {
  if (!REDUCED) {
    wordTimer = window.setInterval(() => {
      wordIndex.value = (wordIndex.value + 1) % WORDS.length
    }, 2600)
    window.addEventListener('scroll', onScroll, { passive: true })
  }
})
onBeforeUnmount(() => {
  clearInterval(wordTimer)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <section class="relative overflow-hidden pt-24 pb-16 sm:pt-28 md:pt-32 md:pb-24">
    <!-- background planes -->
    <div
      class="mesh-sunset grain pointer-events-none absolute inset-0 -z-10"
      :style="{ transform: `translateY(${parallax * 0.5}px)` }"
      aria-hidden="true"
    />
    <div
      class="dot-field pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
      :style="{ transform: `translateY(${-parallax * 0.25}px)` }"
      aria-hidden="true"
    />

    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <!-- copy -->
        <div class="text-center lg:text-start">
          <p
            v-reveal
            class="ring-sunset mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-bold shadow-sm"
          >
            <CalendarCheck class="text-primary-600 h-3.5 w-3.5" aria-hidden="true" />
            <span class="text-gradient">نظام حجوزات عربي بالكامل</span>
          </p>

          <h1 v-reveal="80" class="display-xl mb-5 text-gray-900">
            جدولك اليوم
            <br class="hidden sm:block" />
            <!-- pb keeps Arabic descenders inside the clipping box -->
            <span class="relative inline-grid overflow-hidden pb-[0.14em] align-bottom">
              <Transition name="word" mode="out-in">
                <span :key="wordIndex" class="text-gradient col-start-1 row-start-1">
                  {{ WORDS[wordIndex] }}
                </span>
              </Transition>
            </span>
          </h1>

          <p v-reveal="160" class="lede mx-auto mb-8 max-w-xl lg:mx-0">
            نظام يعرف ساعات عملك ومدة كل خدمة، فيمنع الحجز المزدوج قبل حدوثه — ويعطيك لوحة تريك ما
            يحتاج تدخّلك اليوم، لا مجرد أرقام.
          </p>

          <div v-reveal="240" class="flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <RouterLink
              to="/book"
              class="btn-sunset group inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-bold sm:w-auto"
            >
              جرّب الحجز الآن
              <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </RouterLink>
            <RouterLink
              to="/login"
              class="border-primary-200 hover:border-primary-300 inline-flex w-full items-center justify-center gap-2 rounded-full border bg-white/80 px-7 py-3.5 text-base font-bold text-gray-900 backdrop-blur transition-colors hover:bg-white sm:w-auto"
            >
              <Play class="text-primary-600 h-4 w-4" aria-hidden="true" />
              شاهد لوحة التحكم
            </RouterLink>
          </div>

          <p v-reveal="300" class="mt-5 text-[13px] text-gray-500">
            نسخة تجريبية كاملة — بلا تسجيل، بلا بطاقة ائتمانية.
          </p>
        </div>

        <!-- artifact -->
        <div
          v-reveal.scale="120"
          class="relative mx-auto w-full max-w-md lg:max-w-none"
          :style="{ transform: `translateY(${-parallax * 0.12}px)` }"
        >
          <HeroPreview />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.word-enter-active,
.word-leave-active {
  transition:
    opacity 0.4s var(--ease-out-soft),
    transform 0.4s var(--ease-out-soft);
}
.word-enter-from {
  opacity: 0;
  transform: translateY(0.35em);
}
.word-leave-to {
  opacity: 0;
  transform: translateY(-0.35em);
}
@media (prefers-reduced-motion: reduce) {
  .word-enter-active,
  .word-leave-active {
    transition: none;
  }
}
</style>
