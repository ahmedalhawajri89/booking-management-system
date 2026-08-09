<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { CalendarDays, CheckCircle2, ClipboardCheck, MousePointerClick } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'
import type { LucideIcon } from '@/types'

/**
 * Sticky-scroll walkthrough: the visual pins while the steps scroll past it,
 * and the active step is driven by an IntersectionObserver rather than a
 * scroll-position calculation. Below `lg` it degrades to a plain stacked list.
 */
interface Step {
  icon: LucideIcon
  title: string
  body: string
  caption: string
}

const STEPS: Step[] = [
  {
    icon: MousePointerClick,
    title: 'العميل يختار الخدمة',
    body: 'السعر والمدة ظاهران من اللحظة الأولى — لا مفاجآت في آخر خطوة.',
    caption: 'استشارة طبية · ١٥٠ ر.س · ٣٠ دقيقة',
  },
  {
    icon: CalendarDays,
    title: 'يرى الأوقات المتاحة فعلاً',
    body: 'الأوقات المحسوبة من ساعات عملك والحجوزات القائمة، لا قائمة ثابتة.',
    caption: '١٠:٠٠ ص متاح · ١١:٠٠ ص محجوز',
  },
  {
    icon: ClipboardCheck,
    title: 'يؤكد ويستلم رقماً مرجعياً',
    body: 'يصله رقم يتابع به حجزه ويلغيه بنفسه دون الاتصال بك.',
    caption: 'BK-2026-0431',
  },
  {
    icon: CheckCircle2,
    title: 'يصلك في «يحتاج إجراء»',
    body: 'تؤكد بضغطة، أو تعيد الجدولة، أو تسجّل الدفع — والسجل يوثّق كل شيء.',
    caption: 'مؤكد · مدفوع',
  },
]

const active = ref(0)
const stepEls = ref<HTMLElement[]>([])
let io: IntersectionObserver | null = null

function setRef(el: Element | null, i: number) {
  if (el) stepEls.value[i] = el as HTMLElement
}

onMounted(() => {
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const i = stepEls.value.indexOf(e.target as HTMLElement)
        if (i !== -1) active.value = i
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  )
  stepEls.value.forEach((el) => el && io?.observe(el))
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <section id="how-it-works" class="section surface-soft grain">
    <div class="section-inner relative">
      <SectionHeading
        eyebrow="آلية العمل"
        title="من نقرة العميل إلى موعد مؤكد"
        lede="أربع خطوات، ولا واحدة منها تحتاج مكالمة."
      />

      <div class="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <!-- pinned visual -->
        <div class="order-2 hidden lg:order-1 lg:block">
          <div class="sticky top-28">
            <div
              class="elev-overlay relative overflow-hidden rounded-[var(--radius-xl)] border border-gray-200 bg-white p-8"
            >
              <div class="mb-6 flex items-center gap-2">
                <span
                  v-for="(s, i) in STEPS"
                  :key="s.title"
                  class="h-1 flex-1 rounded-full transition-colors duration-500"
                  :class="i <= active ? 'bg-primary-500' : 'bg-gray-200'"
                />
              </div>

              <Transition name="swap" mode="out-in">
                <div :key="active" class="text-center">
                  <span
                    class="bg-sunset shadow-primary-500/25 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] text-white shadow-lg"
                  >
                    <component :is="STEPS[active]!.icon" class="h-7 w-7" aria-hidden="true" />
                  </span>
                  <p class="text-primary-600 mb-2 text-[13px] font-bold">
                    الخطوة {{ active + 1 }} من {{ STEPS.length }}
                  </p>
                  <h3 class="mb-3 text-xl font-bold text-gray-900">{{ STEPS[active]!.title }}</h3>
                  <p
                    class="mx-auto inline-block rounded-[var(--radius-md)] border border-gray-200 bg-gray-50 px-3 py-1.5 text-[13px] font-semibold text-gray-700"
                    data-numeric
                  >
                    {{ STEPS[active]!.caption }}
                  </p>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- scrolling steps -->
        <ol class="order-1 space-y-5 lg:order-2 lg:space-y-24">
          <li
            v-for="(s, i) in STEPS"
            :key="s.title"
            :ref="(el) => setRef(el as Element | null, i)"
            v-reveal
            class="rounded-[var(--radius-lg)] border bg-white p-5 transition-all duration-500 lg:border-0 lg:bg-transparent lg:p-0"
            :class="[
              i === active ? 'border-primary-200' : 'border-gray-200',
              'lg:opacity-100',
              i === active ? 'lg:opacity-100' : 'lg:opacity-40',
            ]"
          >
            <div class="flex items-start gap-4">
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-colors duration-500"
                :class="
                  i === active
                    ? 'bg-primary-600 text-white'
                    : 'border-2 border-gray-200 bg-white text-gray-400'
                "
                data-numeric
              >
                {{ i + 1 }}
              </span>
              <div>
                <h3 class="mb-1.5 text-lg font-bold text-gray-900">{{ s.title }}</h3>
                <p class="text-[15px] leading-relaxed text-gray-600">{{ s.body }}</p>
                <p class="text-primary-600 mt-2 text-[13px] font-semibold lg:hidden" data-numeric>
                  {{ s.caption }}
                </p>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>

<style scoped>
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.3s var(--ease-out-soft),
    transform 0.3s var(--ease-out-soft);
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
