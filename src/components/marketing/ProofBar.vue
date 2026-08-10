<script setup lang="ts">
import { useCountUp } from '@/composables/useCountUp'

/** Four figures that arrive as you reach them. Suffixes stay outside the
 *  animated number so the layout never reflows mid-count. */
const a = useCountUp(94)
const b = useCountUp(38)
const c = useCountUp(12)
const d = useCountUp(0) // placeholder to keep the grid symmetric; see below

const SECTORS = [
  'عيادات',
  'صالونات',
  'مطاعم',
  'مراكز تدريب',
  'استوديوهات',
  'ورش صيانة',
  'مختبرات',
  'نوادٍ رياضية',
]
</script>

<template>
  <section class="border-primary-100 relative border-y bg-surface/60 py-12 backdrop-blur">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <dl class="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
        <div v-reveal class="text-center">
          <dt class="sr-only">نسبة تقليل المواعيد المهدرة</dt>
          <dd>
            <span :ref="a.el" class="text-gradient block text-4xl font-extrabold" data-numeric>
              {{ a.value.value }}%
            </span>
            <span class="mt-1.5 block text-[13px] text-gray-600"
              >مواعيد مؤكدة بلا متابعة يدوية</span
            >
          </dd>
        </div>

        <div v-reveal="80" class="text-center">
          <dt class="sr-only">الوقت الموفَّر أسبوعياً</dt>
          <dd>
            <span :ref="b.el" class="text-gradient block text-4xl font-extrabold" data-numeric>
              {{ b.value.value }}
            </span>
            <span class="mt-1.5 block text-[13px] text-gray-600"
              >دقيقة توفَّر يومياً على الموظف</span
            >
          </dd>
        </div>

        <div v-reveal="160" class="text-center">
          <dt class="sr-only">زمن إنشاء الحجز</dt>
          <dd>
            <span :ref="c.el" class="text-gradient block text-4xl font-extrabold" data-numeric>
              {{ c.value.value }}
            </span>
            <span class="mt-1.5 block text-[13px] text-gray-600">ثانية لإنشاء حجز كامل</span>
          </dd>
        </div>

        <div v-reveal="240" class="text-center">
          <dt class="sr-only">التعارضات</dt>
          <dd>
            <span :ref="d.el" class="text-gradient block text-4xl font-extrabold" data-numeric>
              {{ d.value.value }}
            </span>
            <span class="mt-1.5 block text-[13px] text-gray-600"
              >حجز مزدوج ممكن — النظام يمنعه</span
            >
          </dd>
        </div>
      </dl>

      <!-- sector marquee -->
      <div class="marquee mt-10 overflow-hidden" aria-hidden="true">
        <div class="marquee-track flex w-max gap-3">
          <span
            v-for="(s, i) in [...SECTORS, ...SECTORS]"
            :key="`${s}-${i}`"
            class="rounded-full border border-gray-200 bg-surface px-4 py-1.5 text-[13px] font-semibold whitespace-nowrap text-gray-500"
          >
            {{ s }}
          </span>
        </div>
      </div>
      <p class="mt-4 text-center text-[13px] text-gray-500">
        مصمَّم لأي نشاط يبيع وقتاً محجوزاً مسبقاً.
      </p>
    </div>
  </section>
</template>
