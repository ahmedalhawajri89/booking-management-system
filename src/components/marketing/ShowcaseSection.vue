<script setup lang="ts">
import { ref } from 'vue'
import { CalendarDays, ListChecks, PanelRightOpen, Sun } from 'lucide-vue-next'
import SectionHeading from './SectionHeading.vue'
import type { LucideIcon } from '@/types'

/**
 * Tabbed product tour. The panels are schematic recreations built from the same
 * tokens as the real screens — accurate about layout and hierarchy without
 * shipping screenshots that go stale the moment the UI changes.
 */
type Key = 'today' | 'calendar' | 'bookings' | 'detail'

const TABS: { key: Key; label: string; icon: LucideIcon; note: string }[] = [
  { key: 'today', label: 'اليوم', icon: Sun, note: 'ما يحتاج إجراءً، ثم يومك كخط زمني.' },
  { key: 'calendar', label: 'التقويم', icon: CalendarDays, note: 'يوم وقائمة، بألوان الحالة.' },
  { key: 'bookings', label: 'الحجوزات', icon: ListChecks, note: 'بحث ومرشّحات فورية.' },
  { key: 'detail', label: 'تفاصيل الحجز', icon: PanelRightOpen, note: 'درج واحد يجمع كل شيء.' },
]

const active = ref<Key>('today')

const ROWS = [
  { name: 'أحمد سعيد', service: 'استشارة طبية', tone: 'success', status: 'مكتمل' },
  { name: 'سارة خالد', service: 'قص وتصفيف', tone: 'info', status: 'مؤكد' },
  { name: 'نورة القحطاني', service: 'استشارة طبية', tone: 'warning', status: 'بانتظار' },
  { name: 'خالد الحربي', service: 'حجز طاولة', tone: 'info', status: 'مؤكد' },
]

const TONE: Record<string, string> = {
  success: 'bg-success-50 text-success-700 border-success-100',
  info: 'bg-info-50 text-info-700 border-info-100',
  warning: 'bg-warning-50 text-warning-700 border-warning-100',
}
</script>

<template>
  <section class="section bg-surface">
    <div class="section-inner">
      <SectionHeading
        eyebrow="جولة سريعة"
        title="أربع شاشات تغطي يوم عمل كامل"
        lede="اختر شاشة لتراها — كل ما يظهر هنا موجود في النسخة التجريبية."
      />

      <!-- tabs -->
      <div
        v-reveal
        class="mb-6 flex flex-wrap justify-center gap-2"
        role="tablist"
        aria-label="شاشات النظام"
      >
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          role="tab"
          :aria-selected="active === t.key"
          :class="
            active === t.key
              ? 'border-primary-600 bg-primary-600 text-white'
              : 'hover:border-primary-300 hover:text-primary-700 border-gray-200 bg-surface text-gray-600'
          "
          class="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          @click="active = t.key"
        >
          <component :is="t.icon" class="h-4 w-4" aria-hidden="true" />
          {{ t.label }}
        </button>
      </div>

      <!-- panel -->
      <div
        v-reveal.scale="80"
        class="elev-overlay overflow-hidden rounded-[var(--radius-xl)] border border-gray-200 bg-gray-50"
      >
        <div class="flex items-center gap-2 border-b border-gray-200 bg-surface px-4 py-3">
          <span class="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span class="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span class="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span class="mx-auto text-[11px] text-gray-400" dir="ltr">bookingpro.app/app</span>
        </div>

        <Transition name="swap" mode="out-in">
          <div :key="active" class="p-4 sm:p-6" role="tabpanel">
            <!-- TODAY -->
            <div v-if="active === 'today'" class="grid gap-4 sm:grid-cols-[1fr_16rem]">
              <div class="space-y-3">
                <div class="border-warning-100 bg-warning-50 rounded-[var(--radius-lg)] border p-3">
                  <p class="text-warning-700 mb-2 text-[13px] font-bold">يحتاج إجراء · ٣</p>
                  <div class="space-y-1.5">
                    <div
                      v-for="n in 3"
                      :key="n"
                      class="border-warning-100 h-8 rounded-[var(--radius-md)] border bg-surface"
                    />
                  </div>
                </div>
                <div class="rounded-[var(--radius-lg)] border border-gray-200 bg-surface p-3">
                  <p class="mb-2 text-[13px] font-bold text-gray-900">جدول اليوم</p>
                  <div class="space-y-2">
                    <div
                      v-for="(r, i) in ROWS"
                      :key="r.name"
                      class="rounded-[var(--radius-md)] border px-2.5 py-1.5"
                      :class="TONE[r.tone]"
                      :style="{ marginInlineStart: `${i * 10}px` }"
                    >
                      <p class="text-[11px] font-bold">{{ r.name }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="space-y-3">
                <div class="rounded-[var(--radius-lg)] border border-gray-200 bg-surface p-3">
                  <p class="mb-2 text-[13px] font-bold text-gray-900">التالي</p>
                  <div class="space-y-1.5">
                    <div v-for="n in 3" :key="n" class="h-7 rounded bg-gray-100" />
                  </div>
                </div>
                <div class="rounded-[var(--radius-lg)] border border-gray-200 bg-surface p-3">
                  <p class="mb-2 text-[13px] font-bold text-gray-900">نبض اليوم</p>
                  <div class="mb-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div class="bg-primary-500 h-full w-[63%] rounded-full" />
                  </div>
                  <p class="text-[11px] text-gray-500">الإشغال ٦٣٪</p>
                </div>
              </div>
            </div>

            <!-- CALENDAR -->
            <div
              v-else-if="active === 'calendar'"
              class="rounded-[var(--radius-lg)] border border-gray-200 bg-surface p-4"
            >
              <div class="mb-3 flex items-center justify-between">
                <p class="text-[13px] font-bold text-gray-900">الأحد ٩ أغسطس</p>
                <div class="flex gap-1">
                  <span class="rounded bg-gray-900 px-2 py-1 text-[11px] text-white">يوم</span>
                  <span class="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-500"
                    >قائمة</span
                  >
                </div>
              </div>
              <div class="relative space-y-1.5">
                <div
                  v-for="(r, i) in ROWS"
                  :key="r.name"
                  class="flex items-center gap-2 rounded-[var(--radius-md)] border px-2.5 py-2"
                  :class="TONE[r.tone]"
                  :style="{ marginInlineStart: `${i * 16}px`, width: `${100 - i * 8}%` }"
                >
                  <span class="text-[11px] font-bold">{{ r.name }}</span>
                  <span class="me-auto text-[10px] opacity-70">{{ r.service }}</span>
                </div>
                <div class="flex items-center gap-1.5 pt-1">
                  <span class="now-dot bg-primary-600 h-1.5 w-1.5 rounded-full" />
                  <span class="bg-primary-500/70 h-px flex-1" />
                  <span class="text-primary-600 text-[10px] font-bold">الآن</span>
                </div>
              </div>
            </div>

            <!-- BOOKINGS -->
            <div v-else-if="active === 'bookings'" class="space-y-3">
              <div class="flex flex-wrap gap-1.5">
                <span
                  class="bg-primary-600 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
                  >الكل</span
                >
                <span
                  v-for="l in ['اليوم', 'بانتظار التأكيد', 'غير مدفوع', 'يحتاج إجراء']"
                  :key="l"
                  class="rounded-full border border-gray-200 bg-surface px-3 py-1 text-[11px] text-gray-500"
                >
                  {{ l }}
                </span>
              </div>
              <div
                class="divide-y divide-gray-200 rounded-[var(--radius-lg)] border border-gray-200 bg-surface"
              >
                <div v-for="r in ROWS" :key="r.name" class="flex items-center gap-3 px-3 py-2.5">
                  <span class="w-16 text-[11px] font-bold text-gray-900" data-numeric>١٠:٠٠ ص</span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[12px] font-semibold text-gray-900">{{
                      r.name
                    }}</span>
                    <span class="block truncate text-[10px] text-gray-500">{{ r.service }}</span>
                  </span>
                  <span
                    class="rounded border px-1.5 py-0.5 text-[10px] font-bold"
                    :class="TONE[r.tone]"
                  >
                    {{ r.status }}
                  </span>
                </div>
              </div>
            </div>

            <!-- DETAIL -->
            <div
              v-else
              class="mx-auto max-w-sm rounded-[var(--radius-lg)] border border-gray-200 bg-surface"
            >
              <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <span class="text-[13px] font-bold text-gray-900" dir="ltr">BK-2026-0431</span>
                <span
                  class="border-info-100 bg-info-50 text-info-700 rounded border px-1.5 py-0.5 text-[10px] font-bold"
                >
                  مؤكد
                </span>
              </div>
              <div class="space-y-2.5 p-4">
                <div
                  v-for="n in 3"
                  :key="n"
                  class="rounded-[var(--radius-md)] border border-gray-200 p-2.5"
                >
                  <div class="mb-1.5 h-2.5 w-1/3 rounded bg-gray-200" />
                  <div class="h-2 w-2/3 rounded bg-gray-100" />
                </div>
                <div class="pt-1">
                  <div class="mb-2 h-2.5 w-16 rounded bg-gray-200" />
                  <div class="space-y-1.5 border-s border-gray-200 ps-3">
                    <div v-for="n in 3" :key="n" class="h-2 w-3/4 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
              <div class="flex gap-2 border-t border-gray-200 p-3">
                <span
                  class="bg-primary-600 flex-1 rounded-[var(--radius-md)] py-2 text-center text-[11px] font-bold text-white"
                >
                  إكمال
                </span>
                <span
                  class="flex-1 rounded-[var(--radius-md)] border border-gray-200 py-2 text-center text-[11px] font-bold text-gray-700"
                >
                  إعادة جدولة
                </span>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <p v-reveal class="mt-4 text-center text-[13px] text-gray-500">
        {{ TABS.find((t) => t.key === active)?.note }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.25s var(--ease-out-soft),
    transform 0.25s var(--ease-out-soft);
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
