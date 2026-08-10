<script setup lang="ts">
import { ArrowLeft, PhoneOff, CalendarX2, NotebookPen, UserX } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'
import type { LucideIcon } from '@/types'

/**
 * Split layout: the header holds still on one side while the pains scroll
 * past on the other. The problem statement stays in view for as long as the
 * evidence for it does, which a centred header cannot do.
 *
 * Each pain maps to one specific mechanism — no claim appears here that the
 * product cannot actually deliver.
 */
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
  <section class="section bg-surface-sunken">
    <div class="section-inner grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
      <SectionHeading
        eyebrow="المشكلة"
        title="إدارة المواعيد ليست جدولاً — بل قرارات صغيرة كثيرة"
        lede="كل بند هنا مشكلة يومية حقيقية، وتحته الآلية التي يعالجها بها النظام."
        align="start"
        sticky
      />

      <ul class="space-y-4">
        <li
          v-for="(row, i) in ROWS"
          :key="row.pain"
          v-reveal="i * 90"
          class="border-border bg-surface rounded-[var(--radius-lg)] border p-5 md:p-6"
        >
          <div class="flex items-start gap-3">
            <span
              class="bg-surface-sunken text-fg-subtle flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
            >
              <component :is="row.icon" class="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <p class="text-fg-subtle decoration-border pt-1.5 text-[15px] leading-relaxed line-through">
              {{ row.pain }}
            </p>
          </div>

          <div class="mt-4 flex items-start gap-3">
            <span
              class="bg-primary-50 text-primary-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
            >
              <ArrowLeft class="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <p class="text-fg pt-1.5 text-[15px] leading-relaxed font-semibold">{{ row.fix }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
