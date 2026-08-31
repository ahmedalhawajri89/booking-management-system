<script setup>
import { computed } from 'vue'
import { CalendarCheck, PartyPopper, RefreshCw, TriangleAlert } from 'lucide-vue-next'
import { useBookingsStore } from '@/stores/bookings'
import { ATTENTION } from '@/lib/status'
import { duration, money, relativeDayTime, time } from '@/lib/format'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import DayTimeline from '@/components/booking/DayTimeline.vue'

/**
 * The operator's working surface, ordered by the questions actually asked:
 * what needs me → what is the shape of my day → what is next → how full am I.
 */
const emit = defineEmits(['openBooking'])
const store = useBookingsStore()

const attention = computed(() => store.attention)
const todays = computed(() => store.today)
const next = computed(() => store.upcoming.slice(0, 3))
const occupancy = computed(() => store.occupancyToday)

const unpaidToday = computed(
  () => todays.value.filter((b) => b.paymentStatus === 'unpaid' && b.status !== 'cancelled').length,
)
const expectedToday = computed(() =>
  todays.value
    .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
    .reduce((sum, b) => sum + b.priceMinor, 0),
)

const freeMin = computed(() => Math.max(0, occupancy.value.openMin - occupancy.value.bookedMin))
</script>

<template>
  <div class="mx-auto max-w-7xl p-4 lg:p-6">
    <!-- loading -->
    <div v-if="store.isLoading && !store.loaded" class="space-y-4">
      <SkeletonBlock variant="card" :count="1" />
      <SkeletonBlock variant="row" :count="5" />
    </div>

    <!-- error -->
    <div v-else-if="store.error" class="surface">
      <EmptyState
        variant="error"
        :icon="TriangleAlert"
        title="تعذّر تحميل جدول اليوم"
        :description="store.error"
      >
        <template #action>
          <BaseButton variant="primary" :icon="RefreshCw" @click="store.load(true)">
            أعد المحاولة
          </BaseButton>
        </template>
      </EmptyState>
    </div>

    <template v-else>
      <!-- needs attention — rendered only when it has something to say -->
      <section v-if="attention.length" class="mb-5" aria-labelledby="attention-heading">
        <h2
          id="attention-heading"
          class="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900"
        >
          <TriangleAlert class="text-warning-700 h-4 w-4" aria-hidden="true" />
          يحتاج إجراء
          <span
            class="bg-warning-100 text-warning-700 rounded-full px-2 py-0.5 text-xs"
            data-numeric
          >
            {{ attention.length }}
          </span>
        </h2>

        <ul class="surface divide-y divide-gray-200 overflow-hidden">
          <li v-for="item in attention" :key="item.booking.id">
            <button
              type="button"
              class="hover:bg-warning-50/60 flex w-full items-center gap-3 px-4 py-3 text-start transition-colors"
              @click="emit('openBooking', item.booking.id)"
            >
              <component
                :is="ATTENTION[item.reason].icon"
                class="h-4 w-4 shrink-0"
                :class="
                  ATTENTION[item.reason].tone === 'danger' ? 'text-danger-700' : 'text-warning-700'
                "
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold text-gray-900">
                  {{ store.hydrate(item.booking).customer?.name }}
                </span>
                <span class="block truncate text-xs text-gray-500">
                  {{ ATTENTION[item.reason].label }} · {{ relativeDayTime(item.booking.startAt) }}
                </span>
              </span>
              <StatusBadge :status="item.booking.status" size="sm" class="hidden sm:inline-flex" />
            </button>
          </li>
        </ul>
      </section>

      <div class="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <!-- the day -->
        <section class="surface overflow-hidden" aria-labelledby="timeline-heading">
          <header class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 id="timeline-heading" class="text-sm font-bold text-gray-900">جدول اليوم</h2>
            <span class="text-xs text-gray-500">
              <span data-numeric>{{ todays.length }}</span> حجز
            </span>
          </header>

          <div v-if="todays.length === 0" class="px-4">
            <EmptyState
              variant="first-run"
              :icon="PartyPopper"
              title="لا حجوزات اليوم"
              description="يومك فارغ تماماً. استخدم زر «حجز جديد» أو اضغط N لإضافة موعد."
            />
          </div>
          <div v-else class="p-4">
            <DayTimeline
              :date="new Date()"
              :bookings="todays"
              @open="emit('openBooking', $event)"
            />
          </div>
        </section>

        <!-- next up + pulse -->
        <div class="space-y-5">
          <section class="surface overflow-hidden" aria-labelledby="next-heading">
            <header class="border-b border-gray-200 px-4 py-3">
              <h2 id="next-heading" class="text-sm font-bold text-gray-900">التالي</h2>
            </header>

            <div v-if="next.length === 0" class="px-4">
              <EmptyState
                variant="no-results"
                :icon="CalendarCheck"
                title="لا مواعيد قادمة"
                description="لا يوجد شيء مجدول بعد هذه اللحظة."
              />
            </div>
            <ul v-else class="divide-y divide-gray-200">
              <li v-for="b in next" :key="b.id">
                <button
                  type="button"
                  class="hover:bg-primary-50/40 flex w-full items-center gap-3 px-4 py-3 text-start transition-colors"
                  @click="emit('openBooking', b.id)"
                >
                  <time :datetime="b.startAt" class="w-16 shrink-0 text-sm font-bold text-gray-900">
                    {{ time(b.startAt) }}
                  </time>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm text-gray-900">
                      {{ store.hydrate(b).customer?.name }}
                    </span>
                    <span class="block truncate text-xs text-gray-500">
                      {{ store.hydrate(b).service?.name }}
                    </span>
                  </span>
                  <StatusBadge :status="b.status" size="sm" icon-only />
                </button>
              </li>
            </ul>
          </section>

          <section class="surface p-4" aria-labelledby="pulse-heading">
            <h2 id="pulse-heading" class="mb-3 text-sm font-bold text-gray-900">نبض اليوم</h2>

            <div class="mb-1.5 flex items-baseline justify-between">
              <span class="text-xs text-gray-500">الإشغال</span>
              <span class="text-sm font-bold text-gray-900" data-numeric>
                {{ Math.round(occupancy.ratio * 100) }}%
              </span>
            </div>
            <div
              class="h-2 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              :aria-valuenow="Math.round(occupancy.ratio * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="نسبة إشغال اليوم"
            >
              <div
                class="bg-primary-500 h-full rounded-full transition-[width] duration-500"
                :style="{ width: `${Math.round(occupancy.ratio * 100)}%` }"
              />
            </div>

            <dl class="mt-4 space-y-2.5 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">وقت متاح</dt>
                <dd class="font-semibold text-gray-900">{{ duration(Math.round(freeMin)) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">غير مدفوع</dt>
                <dd
                  class="font-semibold"
                  :class="unpaidToday ? 'text-warning-700' : 'text-gray-900'"
                >
                  <span data-numeric>{{ unpaidToday }}</span> حجز
                </dd>
              </div>
              <div class="flex justify-between border-t border-gray-200 pt-2.5">
                <dt class="text-gray-500">إجمالي متوقع</dt>
                <dd class="font-bold text-gray-900" data-numeric>{{ money(expectedToday) }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
