<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowDown, CalendarCheck, Play } from 'lucide-vue-next'
import HeroBoard from './hero/HeroBoard.vue'
import SceneProgress from './hero/SceneProgress.vue'
import { useScrollScenes } from '@/composables/useScrollScenes'

/**
 * Full-viewport hero told as four scenes over a pinned stage.
 *
 * Not a carousel. A carousel advances on its own timer, which is why most
 * viewers never reach slide two; here the scroll the viewer was going to do
 * anyway *is* the transport, so nothing moves without them. Same cinematic
 * feel, none of the reason carousels stopped converting.
 *
 * The narrative is deliberate: the problem, the fix, the reach, the payoff.
 * The CTA appears once, in the last scene, where the argument has been made.
 */
const SCENES = [
  {
    title: 'كل موعد في مكانه.',
    lede: 'لوحة واحدة تعرض يومك كما هو فعلاً — لا جداول متفرقة ولا دفتر مواعيد.',
  },
  {
    title: 'التعارض يُمنع، لا يُكتشف.',
    lede: 'النظام يعرف مدة كل خدمة ووقت التجهيز بينها، فيرفض الوقت المحجوز ويقترح أقرب بديل.',
  },
  {
    title: 'حجوزات من كل قناة.',
    lede: 'الموقع، الهاتف، أو الاستقبال — كلها تصبّ في تقويم واحد بلا إدخال مزدوج.',
  },
  {
    title: 'وأنت المتحكّم.',
    lede: 'أرقام اليوم أمامك، وما يحتاج تدخّلك مفصول عمّا يسير وحده.',
  },
]

const container = ref(null)

// The channels scene is the one that survives being cut: on a phone the three
// chips and the board cannot share the frame legibly, and the argument still
// lands without it.
const isNarrow = ref(false)
const sceneCount = computed(() => (isNarrow.value ? 3 : 4))
const activeScenes = computed(() => (isNarrow.value ? [SCENES[0], SCENES[1], SCENES[3]] : SCENES))
const { progress, sceneIndex, sceneProgress, goToScene, reduced } = useScrollScenes(
  container,
  sceneCount,
)

/** Maps the visible scene back to the board's own scene vocabulary. */
const boardScene = computed(() =>
  isNarrow.value ? ([0, 1, 3][sceneIndex.value] ?? 0) : sceneIndex.value,
)

let mq
function syncWidth(e) {
  isNarrow.value = e.matches
}
onMounted(() => {
  mq = window.matchMedia('(max-width: 767px)')
  syncWidth(mq)
  mq.addEventListener('change', syncWidth)
})
onBeforeUnmount(() => mq?.removeEventListener('change', syncWidth))

const current = computed(() => activeScenes.value[sceneIndex.value] ?? activeScenes.value[0])
</script>

<template>
  <!-- Reduced motion: no pinning, no transforms. Every scene becomes an
       ordinary stacked section with its full content — the failure mode to
       avoid is an empty hero, not a still one. -->
  <section
    v-if="reduced"
    data-dark-stage
    class="bg-surface-inverse mesh-brand grain relative overflow-hidden px-4 pt-28 pb-20 text-white sm:px-6 lg:px-8"
  >
    <div class="mx-auto max-w-6xl space-y-20">
      <div v-for="(s, i) in SCENES" :key="s.title" class="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 v-if="i === 0" class="type-display mb-5">{{ s.title }}</h1>
          <h2 v-else class="type-h1 mb-4">{{ s.title }}</h2>
          <p class="type-lede max-w-xl !text-white/70">{{ s.lede }}</p>
          <RouterLink
            v-if="i === SCENES.length - 1"
            to="/book"
            class="btn-brand mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-bold"
          >
            جرّب الحجز الآن
            <ArrowLeft class="h-4 w-4" />
          </RouterLink>
        </div>
        <HeroBoard :scene="i" :t="1" still />
      </div>
    </div>
  </section>

  <section
    v-else
    ref="container"
    data-dark-stage
    class="relative"
    :style="{ height: `${sceneCount * 100}dvh` }"
    aria-label="عرض تعريفي بالنظام"
  >
    <!-- overflow-x is clipped because the board tilts in scene 3, and a
         tilted element in RTL will otherwise widen the document. -->
    <div
      class="bg-surface-inverse mesh-brand grain sticky top-0 flex h-[100dvh] items-center overflow-x-clip text-white"
    >
      <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <!-- copy: swapped per scene, the only part that remounts -->
          <div class="relative z-10 text-center lg:text-start">
            <p
              class="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-bold backdrop-blur"
            >
              <CalendarCheck class="text-accent-300 h-3.5 w-3.5" aria-hidden="true" />
              نظام حجوزات عربي بالكامل
            </p>

            <Transition name="scene" mode="out-in">
              <div :key="sceneIndex">
                <h1 v-if="sceneIndex === 0" class="type-display mb-5">{{ current.title }}</h1>
                <p v-else class="type-display mb-5" role="heading" aria-level="2">
                  {{ current.title }}
                </p>
                <p class="type-lede mx-auto max-w-xl !text-white/70 lg:mx-0">{{ current.lede }}</p>
              </div>
            </Transition>

            <!-- One CTA, in the scene where the case has been made. -->
            <Transition name="scene">
              <div
                v-if="sceneIndex === sceneCount - 1"
                class="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
              >
                <RouterLink
                  to="/book"
                  class="btn-brand group inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-bold sm:w-auto"
                >
                  جرّب الحجز الآن
                  <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </RouterLink>
                <RouterLink
                  to="/login"
                  class="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-base font-bold backdrop-blur transition-colors hover:bg-white/10 sm:w-auto"
                >
                  <Play class="h-4 w-4" aria-hidden="true" />
                  شاهد لوحة التحكم
                </RouterLink>
              </div>
            </Transition>
          </div>

          <!-- Artifact: never remounted, only moved. On a phone it drops
               behind the copy at low opacity — at 390px the board and the
               headline cannot both be legible side by side. -->
          <div
            class="pointer-events-none absolute inset-x-6 top-1/2 -z-0 -translate-y-1/2 opacity-[0.18] md:pointer-events-auto md:relative md:inset-auto md:top-auto md:translate-y-0 md:opacity-100"
          >
            <HeroBoard :scene="boardScene" :t="sceneProgress" />
          </div>
        </div>
      </div>

      <div class="absolute inset-x-0 bottom-6 z-20 flex flex-col items-center gap-4">
        <SceneProgress
          :titles="activeScenes.map((s) => s.title)"
          :index="sceneIndex"
          :progress="progress"
          @select="goToScene"
        />
        <!-- Always available: nobody should be stuck inside a stage this tall. -->
        <a
          href="#proof"
          class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/60 transition-colors hover:text-white"
        >
          تخطَّ إلى المحتوى
          <ArrowDown class="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.scene-enter-active,
.scene-leave-active {
  transition:
    opacity 0.35s var(--ease-out-soft),
    transform 0.35s var(--ease-out-soft);
}
.scene-enter-from {
  opacity: 0;
  transform: translateY(14px);
}
.scene-leave-to {
  opacity: 0;
  transform: translateY(-14px);
}
</style>
