<script setup lang="ts">
import { computed, ref } from 'vue'
import { addDays, isSameDay, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useBookingsStore } from '@/stores/bookings'
import { fullDate, relativeDay } from '@/lib/format'
import { businessHours } from '@/data/catalog'
import { isOpenOn } from '@/lib/availability'
import BaseButton from '@/components/ui/BaseButton.vue'
import IconButton from '@/components/ui/IconButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import DayTimeline from '@/components/booking/DayTimeline.vue'

const emit = defineEmits<{ openBooking: [id: string] }>()
const store = useBookingsStore()

type Mode = 'day' | 'agenda'
const mode = ref<Mode>('day')
const cursor = ref(startOfDay(new Date()))

const dayBookings = computed(() => store.onDay(cursor.value))

/** Agenda groups the next 14 days, skipping days with nothing on them. */
const agenda = computed(() => {
  const out: { date: Date; items: ReturnType<typeof store.onDay> }[] = []
  for (let i = 0; i < 14; i++) {
    const d = addDays(startOfDay(new Date()), i)
    const items = store.onDay(d).filter((b) => b.status !== 'cancelled')
    if (items.length) out.push({ date: d, items })
  }
  return out
})

function shift(days: number) {
  cursor.value = addDays(cursor.value, days)
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 lg:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <!-- RTL: "previous" points right -->
        <IconButton :icon="ChevronRight" label="اليوم السابق" @click="shift(-1)" />
        <div class="min-w-0">
          <h1 class="truncate text-base font-bold text-gray-900">{{ fullDate(cursor) }}</h1>
          <p class="text-xs text-gray-500">
            {{ isOpenOn(businessHours, cursor) ? `${dayBookings.length} حجز` : 'مغلق' }}
          </p>
        </div>
        <IconButton :icon="ChevronLeft" label="اليوم التالي" @click="shift(1)" />
      </div>

      <div class="flex items-center gap-2">
        <BaseButton
          v-if="!isSameDay(cursor, new Date())"
          size="sm"
          @click="cursor = startOfDay(new Date())"
        >
          اليوم
        </BaseButton>
        <div class="flex rounded-[var(--radius-md)] border border-gray-200 p-0.5" role="tablist">
          <button
            v-for="m in ['day', 'agenda'] as Mode[]"
            :key="m"
            type="button"
            role="tab"
            :aria-selected="mode === m"
            class="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-colors"
            :class="mode === m ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'"
            @click="mode = m"
          >
            {{ m === 'day' ? 'يوم' : 'قائمة' }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="mode === 'day'" class="surface p-4">
      <DayTimeline :date="cursor" :bookings="dayBookings" @open="emit('openBooking', $event)" />
    </div>

    <div v-else class="space-y-4">
      <section v-for="group in agenda" :key="group.date.toISOString()">
        <h2 class="mb-2 text-sm font-bold text-gray-900">{{ relativeDay(group.date) }}</h2>
        <ul class="surface divide-y divide-gray-200 overflow-hidden">
          <li v-for="b in group.items" :key="b.id">
            <button
              type="button"
              class="hover:bg-primary-50/40 flex w-full items-center gap-3 px-4 py-3 text-start"
              @click="emit('openBooking', b.id)"
            >
              <time :datetime="b.startAt" class="w-16 shrink-0 text-sm font-bold text-gray-900">
                {{
                  new Date(b.startAt).toLocaleTimeString('ar-SA', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                }}
              </time>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm text-gray-900">
                  {{ store.hydrate(b).customer?.name }}
                </span>
                <span class="block truncate text-xs text-gray-500">
                  {{ store.hydrate(b).service?.name }}
                </span>
              </span>
              <StatusBadge :status="b.status" size="sm" />
            </button>
          </li>
        </ul>
      </section>

      <p v-if="agenda.length === 0" class="surface px-4 py-10 text-center text-sm text-gray-500">
        لا حجوزات في الأسبوعين القادمين.
      </p>
    </div>
  </div>
</template>
