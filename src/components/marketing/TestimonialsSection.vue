<script setup>
import { Quote } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

/**
 * Editorial: one scenario carries the section at display size, the other two
 * sit beside it as supporting notes. Three equal quote cards is exactly the
 * shape this page overused, and it also flattens the argument — one story
 * told well is more persuasive than three told identically.
 *
 * The header is the page's only end-aligned one. After six sections that
 * start on the same edge, moving it is a deliberate break in the rhythm.
 *
 * These are illustrative scenarios and the section says so. Inventing named
 * customers for a product that has none would be dishonest.
 */
const LEAD = {
  sector: 'عيادة أسنان',
  size: 'طبيبان · غرفتان',
  quote:
    'الفاصل بين المواعيد كان أكبر مشكلة — النظام يحسبه تلقائياً فلم يعد هناك مريض ينتظر لأن الغرفة لم تُجهَّز.',
  metric: 'صفر تعارض',
}

const SUPPORTING = [
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
  <section class="section bg-surface-sunken">
    <div class="section-inner">
      <SectionHeading
        eyebrow="حالات استخدام"
        title="ثلاثة أنشطة، نفس المشكلة"
        lede="سيناريوهات توضيحية تبيّن كيف يُستخدم النظام في كل نشاط."
        align="end"
      />

      <div class="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-10">
        <figure v-reveal class="flex flex-col justify-center">
          <Quote class="text-primary-300 mb-5 h-9 w-9" aria-hidden="true" />
          <blockquote class="type-h2 text-fg leading-[1.45]">{{ LEAD.quote }}</blockquote>
          <figcaption class="mt-6 flex items-center gap-3">
            <span class="bg-primary-600 h-10 w-1 rounded-full" aria-hidden="true" />
            <span>
              <span class="text-fg block text-sm font-bold">{{ LEAD.sector }}</span>
              <span class="text-fg-subtle block text-[12px]">{{ LEAD.size }}</span>
            </span>
            <span
              class="bg-primary-50 text-primary-700 ms-auto rounded-full px-2.5 py-1 text-[11px] font-bold"
            >
              {{ LEAD.metric }}
            </span>
          </figcaption>
        </figure>

        <div class="space-y-4">
          <BaseCard
            v-for="(c, i) in SUPPORTING"
            :key="c.sector"
            v-reveal="120 + i * 110"
            as="article"
          >
            <figure>
              <blockquote class="text-fg-muted text-[15px] leading-relaxed">
                {{ c.quote }}
              </blockquote>
              <figcaption
                class="border-border mt-4 flex items-center justify-between border-t pt-4"
              >
                <span>
                  <span class="text-fg block text-sm font-bold">{{ c.sector }}</span>
                  <span class="text-fg-subtle block text-[12px]">{{ c.size }}</span>
                </span>
                <span
                  class="bg-surface-sunken text-fg-muted rounded-full px-2.5 py-1 text-[11px] font-bold"
                >
                  {{ c.metric }}
                </span>
              </figcaption>
            </figure>
          </BaseCard>
        </div>
      </div>

      <p v-reveal class="text-fg-subtle mt-8 text-center text-[12px]">
        سيناريوهات توضيحية لأغراض العرض، وليست شهادات عملاء حقيقيين.
      </p>
    </div>
  </section>
</template>
