<script setup lang="ts">
import { ArrowLeft, PhoneOff, CalendarX2, NotebookPen, UserX } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'
import type { LucideIcon } from '@/types'

/** Before/after, stated plainly. Each pain maps to one specific mechanism —
 *  no claim appears here that the product cannot actually deliver. */
const ROWS: { icon: LucideIcon; pain: string; fix: string }[] = [
  {
    icon: PhoneOff,
    pain: 'المواعيد تُحجز بمكالمة، وتُنسى بمكالمة.',
    fix: 'العميل يحجز بنفسه ٢٤/٧، ويصله رقم مرجعي يتابع به.',
  },
  {
    icon: CalendarX2,
    pain: 'حجزان في نفس الوقت — وتكتشف ذلك أمام العميل.',
    fix: 'النظام يحسب نهاية كل موعد ويمنع التعارض قبل حدوثه.',
  },
  {
    icon: NotebookPen,
    pain: 'الدفتر أو ملف Excel هو الذاكرة الوحيدة.',
    fix: 'كل حجز له سجل كامل: من أنشأه، متى تأكّد، ومتى دُفع.',
  },
  {
    icon: UserX,
    pain: 'لا تعرف من لم يحضر ولا من لم يدفع.',
    fix: 'حالة الحجز وحالة الدفع منفصلتان وواضحتان في كل شاشة.',
  },
]
</script>

<template>
  <section class="section">
    <div class="section-inner">
      <SectionHeading
        eyebrow="المشكلة"
        title="إدارة المواعيد ليست جدولاً — بل قرارات صغيرة كثيرة"
        lede="كل صف هنا مشكلة يومية حقيقية، وأمامها الآلية التي يعالجها بها النظام."
      />

      <ul class="space-y-3">
        <li
          v-for="(row, i) in ROWS"
          :key="row.pain"
          v-reveal="i * 90"
          class="hover:border-primary-200 grid items-center gap-4 rounded-[var(--radius-lg)] border border-gray-200 bg-surface p-5 transition-colors md:grid-cols-[auto_1fr_auto_1fr] md:gap-6"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gray-100 text-gray-500"
          >
            <component :is="row.icon" class="h-5 w-5" aria-hidden="true" />
          </span>

          <p class="text-[15px] leading-relaxed text-gray-500 line-through decoration-gray-300">
            {{ row.pain }}
          </p>

          <ArrowLeft class="text-primary-400 hidden h-4 w-4 shrink-0 md:block" aria-hidden="true" />

          <p class="text-[15px] leading-relaxed font-semibold text-gray-900">{{ row.fix }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>
