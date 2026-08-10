<script setup lang="ts">
import { Quote } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'

/**
 * Illustrative scenarios, labelled as such. Inventing named customers for a
 * product that has none would be dishonest — these are written as use cases,
 * and the section says so plainly.
 */
const CASES = [
  {
    sector: 'عيادة أسنان',
    size: 'طبيبان · غرفتان',
    quote:
      'الفاصل بين المواعيد كان أكبر مشكلة — النظام يحسبه تلقائياً فلم يعد هناك مريض ينتظر لأن الغرفة لم تُجهَّز.',
    metric: 'صفر تعارض',
  },
  {
    sector: 'صالون حلاقة',
    size: 'ثلاثة كراسي',
    quote: 'الزبائن صاروا يحجزون ليلاً بعد إغلاقنا. الصباح يبدأ بجدول جاهز بدل عشر مكالمات.',
    metric: 'حجوزات ٢٤/٧',
  },
  {
    sector: 'مطعم',
    size: 'قسم هادئ · ١٢ طاولة',
    quote: 'شاشة «يحتاج إجراء» اختصرت المتابعة — نعرف من لم يؤكد ومن لم يدفع دون فتح أي تقرير.',
    metric: 'متابعة أسرع',
  },
]
</script>

<template>
  <section class="section">
    <div class="section-inner">
      <SectionHeading
        eyebrow="حالات استخدام"
        title="ثلاثة أنشطة، نفس المشكلة"
        lede="سيناريوهات توضيحية تبيّن كيف يُستخدم النظام في كل نشاط."
      />

      <div class="grid gap-4 md:grid-cols-3">
        <figure
          v-for="(c, i) in CASES"
          :key="c.sector"
          v-reveal="i * 110"
          class="hover:border-primary-200 flex flex-col rounded-[var(--radius-xl)] border border-gray-200 bg-surface p-6 transition-colors"
        >
          <Quote class="text-primary-300 mb-4 h-6 w-6" aria-hidden="true" />
          <blockquote class="flex-1 text-[15px] leading-relaxed text-gray-700">
            {{ c.quote }}
          </blockquote>
          <figcaption class="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
            <span>
              <span class="block text-sm font-bold text-gray-900">{{ c.sector }}</span>
              <span class="block text-[12px] text-gray-500">{{ c.size }}</span>
            </span>
            <span
              class="bg-primary-50 text-primary-700 rounded-full px-2.5 py-1 text-[11px] font-bold"
            >
              {{ c.metric }}
            </span>
          </figcaption>
        </figure>
      </div>

      <p v-reveal class="mt-6 text-center text-[12px] text-gray-400">
        سيناريوهات توضيحية لأغراض العرض، وليست شهادات عملاء حقيقيين.
      </p>
    </div>
  </section>
</template>
