<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BadgeCheck, ClipboardCheck, Clock4, MousePointerClick } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'

const STEPS = [
  {
    icon: MousePointerClick,
    title: 'العميل يختار الخدمة',
    body: 'السعر والمدة ظاهران من اللحظة الأولى — لا مفاجآت في آخر خطوة.',
    caption: 'استشارة أولى · ١٥٠ ر.س · ٣٠ دقيقة',
  },
  {
    icon: Clock4,
    title: 'يرى الأوقات المتاحة فعلاً',
    body: 'الأوقات محسوبة من ساعات عملك والحجوزات القائمة، لا قائمة ثابتة.',
    caption: '١٠:٠٠ ص متاح · ١١:٠٠ ص محجوز',
  },
  {
    icon: ClipboardCheck,
    title: 'يؤكد ويستلم رقماً مرجعياً',
    body: 'يصله رقم يتابع به حجزه ويلغيه بنفسه دون الاتصال بك.',
    caption: 'BK-2026-0431',
  },
  {
    icon: BadgeCheck,
    title: 'يصلك في «يحتاج إجراء»',
    body: 'تؤكد بضغطة، أو تعيد الجدولة، أو تسجّل الدفع — والسجل يوثّق كل شيء.',
    caption: 'مؤكد · مدفوع',
  },
]

const active = ref(0)
const fill = computed(() => (active.value + 1) / STEPS.length)
const stepEls = ref([])
let io = null

function setRef(el, i) {
  if (el) stepEls.value[i] = el
}

onMounted(() => {
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const i = stepEls.value.indexOf(e.target)
        if (i !== -1) active.value = Math.max(active.value, i)
      }
    },
    { rootMargin: '-40% 0px -40% 0px' },
  )
  stepEls.value.forEach((el) => el && io?.observe(el))
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <section id="how-it-works" class="section bg-canvas">
    <div class="section-inner">
      <SectionHeading
        eyebrow="آلية العمل"
        title="من نقرة العميل إلى موعد مؤكد"
        lede="أربع خطوات، ولا واحدة منها تحتاج مكالمة."
        align="start"
      />

      <ol class="relative grid gap-10 md:grid-cols-4 md:gap-6">
        <!-- The rail, filling as you reach each stop. Two elements rather than
             one, because the fill runs along a different axis per breakpoint
             and a single transform cannot be both. -->
        <div
          class="bg-border absolute top-0 bottom-0 w-px md:hidden"
          style="inset-inline-start: 19px"
          aria-hidden="true"
        >
          <div
            class="bg-primary-600 w-full origin-top transition-transform duration-700 ease-[var(--ease-out-soft)]"
            style="height: 100%"
            :style="{ transform: `scaleY(${fill})` }"
          />
        </div>
        <div
          class="bg-border absolute top-5 right-0 left-0 hidden h-px md:block"
          aria-hidden="true"
        >
          <!-- origin-right: the sequence reads right-to-left in Arabic. -->
          <div
            class="bg-primary-600 h-full origin-right transition-transform duration-700 ease-[var(--ease-out-soft)]"
            :style="{ transform: `scaleX(${fill})` }"
          />
        </div>

        <li
          v-for="(s, i) in STEPS"
          :key="s.title"
          :ref="(el) => setRef(el, i)"
          v-reveal
          class="relative ps-14 transition-opacity duration-500 md:ps-0"
          :class="i <= active ? 'opacity-100' : 'md:opacity-45'"
        >
          <span
            class="absolute top-0 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-extrabold transition-colors duration-500 md:relative md:mb-5"
            style="inset-inline-start: 0"
            :class="
              i <= active
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-border bg-surface text-fg-subtle'
            "
            data-numeric
          >
            {{ i + 1 }}
          </span>

          <component
            :is="s.icon"
            class="text-primary-600 mb-3 hidden h-5 w-5 md:block"
            aria-hidden="true"
          />
          <h3 class="type-h3 text-fg mb-1.5">{{ s.title }}</h3>
          <p class="text-fg-muted text-[15px] leading-relaxed">{{ s.body }}</p>
          <p
            class="border-border bg-surface text-fg-muted mt-3 inline-block rounded-[var(--radius-md)] border px-2.5 py-1 text-[12px] font-semibold"
            data-numeric
          >
            {{ s.caption }}
          </p>
        </li>
      </ol>
    </div>
  </section>
</template>
