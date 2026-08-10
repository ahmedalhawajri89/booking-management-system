<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check, Minus } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'

const yearly = ref(true)

interface Plan {
  name: string
  monthly: number
  tagline: string
  features: { label: string; included: boolean }[]
  featured?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'البداية',
    monthly: 0,
    tagline: 'لنشاط فردي يبدأ الآن.',
    features: [
      { label: 'مورد واحد', included: true },
      { label: 'حجوزات غير محدودة', included: true },
      { label: 'صفحة حجز للعملاء', included: true },
      { label: 'موارد متعددة', included: false },
      { label: 'تتبّع المدفوعات', included: false },
    ],
  },
  {
    name: 'الاحترافي',
    monthly: 79,
    tagline: 'للنشاط الذي يديره فريق.',
    featured: true,
    features: [
      { label: 'موارد وموظفون بلا حد', included: true },
      { label: 'كشف التعارضات', included: true },
      { label: 'تتبّع المدفوعات والعربون', included: true },
      { label: 'ملفات العملاء وسجلهم', included: true },
      { label: 'سجل تدقيق كامل', included: true },
    ],
  },
  {
    name: 'المنشآت',
    monthly: 199,
    tagline: 'لعدة فروع تحت إدارة واحدة.',
    features: [
      { label: 'كل مزايا الاحترافي', included: true },
      { label: 'فروع متعددة', included: true },
      { label: 'صلاحيات مخصّصة', included: true },
      { label: 'تكامل عبر API', included: true },
      { label: 'دعم مخصّص', included: true },
    ],
  },
]

const price = computed(() => (p: Plan) => {
  if (p.monthly === 0) return 'مجاناً'
  const v = yearly.value ? Math.round(p.monthly * 0.8) : p.monthly
  return `${v} ر.س`
})
</script>

<template>
  <section id="pricing" class="section bg-surface">
    <div class="section-inner">
      <SectionHeading
        eyebrow="الأسعار"
        title="ابدأ مجاناً، وادفع حين يكبر نشاطك"
        lede="بلا عقود، بلا رسوم إعداد."
      />

      <!-- billing toggle -->
      <div v-reveal class="mb-10 flex items-center justify-center gap-3">
        <span class="text-sm font-semibold" :class="!yearly ? 'text-gray-900' : 'text-gray-400'">
          شهري
        </span>
        <button
          type="button"
          role="switch"
          :aria-checked="yearly"
          aria-label="التبديل بين الدفع الشهري والسنوي"
          class="relative h-7 w-13 shrink-0 rounded-full border border-gray-200 bg-gray-100 transition-colors"
          :class="yearly && 'bg-primary-600 border-primary-600'"
          style="width: 3.25rem"
          @click="yearly = !yearly"
        >
          <span
            class="absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all duration-300"
            :style="{ insetInlineStart: yearly ? 'calc(100% - 1.375rem)' : '0.125rem' }"
          />
        </button>
        <span class="text-sm font-semibold" :class="yearly ? 'text-gray-900' : 'text-gray-400'">
          سنوي
        </span>
        <span class="bg-success-50 text-success-700 rounded-full px-2 py-0.5 text-[11px] font-bold">
          وفّر ٢٠٪
        </span>
      </div>

      <div class="grid items-start gap-4 md:grid-cols-3">
        <article
          v-for="(p, i) in PLANS"
          :key="p.name"
          v-reveal="i * 100"
          class="relative rounded-[var(--radius-xl)] border bg-surface p-6 transition-all"
          :class="
            p.featured
              ? 'border-primary-300 elev-overlay md:-mt-4 md:pb-8'
              : 'hover:border-primary-200 border-gray-200'
          "
        >
          <span
            v-if="p.featured"
            class="bg-brand absolute -top-3 rounded-full px-3 py-1 text-[11px] font-bold text-white"
            style="inset-inline-start: 1.5rem"
          >
            الأكثر اختياراً
          </span>

          <h3 class="text-lg font-bold text-gray-900">{{ p.name }}</h3>
          <p class="mt-1 text-[13px] text-gray-500">{{ p.tagline }}</p>

          <p class="mt-5 flex items-baseline gap-1.5">
            <span class="text-3xl font-extrabold text-gray-900" data-numeric>{{ price(p) }}</span>
            <span v-if="p.monthly > 0" class="text-[13px] text-gray-500">/ شهرياً</span>
          </p>

          <RouterLink
            :to="p.monthly === 0 ? '/register' : '/register'"
            class="mt-5 block rounded-[var(--radius-md)] py-2.5 text-center text-sm font-bold transition-colors"
            :class="
              p.featured
                ? 'btn-brand'
                : 'hover:border-primary-300 hover:bg-primary-50 border border-gray-200 text-gray-900'
            "
          >
            {{ p.monthly === 0 ? 'ابدأ مجاناً' : 'ابدأ التجربة' }}
          </RouterLink>

          <ul class="mt-6 space-y-2.5 border-t border-gray-100 pt-5">
            <li
              v-for="f in p.features"
              :key="f.label"
              class="flex items-start gap-2 text-[13px]"
              :class="f.included ? 'text-gray-700' : 'text-gray-400'"
            >
              <Check
                v-if="f.included"
                class="text-success-700 mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <Minus v-else class="mt-0.5 h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" />
              <span>{{ f.label }}</span>
              <span class="sr-only">{{ f.included ? '— متضمّن' : '— غير متضمّن' }}</span>
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>
