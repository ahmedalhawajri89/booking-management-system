<script setup>
import { ShieldCheck } from 'lucide-vue-next'
import { useCountUp } from '@/composables/useCountUp'

/**
 * Low band between the hero stage and the argument. No section header — after
 * a full-viewport stage the eye needs a horizontal breath, not another
 * centred title.
 *
 * Three figures, not four. The fourth used to be a counter animating to zero
 * ("zero possible double-bookings"), which rendered as a bare 0 and read as
 * broken. A claim of zero is not a quantity that counts up; it moved to the
 * badge below, where it can be stated rather than tallied.
 */
const confirmed = useCountUp(94)
const saved = useCountUp(38)
const seconds = useCountUp(12)

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
  <!-- id is the hero's "skip to content" target -->
  <section id="proof" class="border-border bg-canvas relative scroll-mt-4 border-y py-12">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
        <dl class="grid w-full grid-cols-3 gap-6 lg:w-auto lg:gap-12">
          <div v-reveal class="text-center lg:text-start">
            <dt class="sr-only">نسبة المواعيد المؤكدة بلا متابعة يدوية</dt>
            <dd>
              <span
                :ref="confirmed.el"
                class="text-gradient block text-3xl font-extrabold sm:text-4xl"
                data-numeric
              >
                {{ confirmed.value.value }}%
              </span>
              <span class="text-fg-muted mt-1.5 block text-[13px]">مؤكدة بلا متابعة يدوية</span>
            </dd>
          </div>

          <div v-reveal="80" class="text-center lg:text-start">
            <dt class="sr-only">الوقت الموفَّر يومياً</dt>
            <dd>
              <span
                :ref="saved.el"
                class="text-gradient block text-3xl font-extrabold sm:text-4xl"
                data-numeric
              >
                {{ saved.value.value }}
              </span>
              <span class="text-fg-muted mt-1.5 block text-[13px]">دقيقة توفَّر يومياً</span>
            </dd>
          </div>

          <div v-reveal="160" class="text-center lg:text-start">
            <dt class="sr-only">زمن إنشاء الحجز</dt>
            <dd>
              <span
                :ref="seconds.el"
                class="text-gradient block text-3xl font-extrabold sm:text-4xl"
                data-numeric
              >
                {{ seconds.value.value }}
              </span>
              <span class="text-fg-muted mt-1.5 block text-[13px]">ثانية لإنشاء حجز</span>
            </dd>
          </div>
        </dl>

        <p
          v-reveal="240"
          class="border-success-100 bg-success-50 text-success-700 inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold"
        >
          <ShieldCheck class="h-4 w-4" aria-hidden="true" />
          صفر حجز مزدوج — النظام يمنعه، لا يبلّغ عنه
        </p>
      </div>

      <div class="marquee mt-10 overflow-hidden" aria-hidden="true">
        <div class="marquee-track flex w-max gap-3">
          <span
            v-for="(s, i) in [...SECTORS, ...SECTORS]"
            :key="`${s}-${i}`"
            class="border-border bg-surface text-fg-subtle rounded-full border px-4 py-1.5 text-[13px] font-semibold whitespace-nowrap"
          >
            {{ s }}
          </span>
        </div>
      </div>
      <p class="text-fg-subtle mt-4 text-center text-[13px]">
        مصمَّم لأي نشاط يبيع وقتاً محجوزاً مسبقاً.
      </p>
    </div>
  </section>
</template>
