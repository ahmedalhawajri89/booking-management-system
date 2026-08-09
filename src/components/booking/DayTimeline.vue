<script setup lang="ts">
import { computed } from 'vue'
import { differenceInMinutes, isSameDay, set, startOfDay } from 'date-fns'
import type { Booking } from '@/types'
import { useBookingsStore } from '@/stores/bookings'
import { businessHours } from '@/data/catalog'
import { hoursFor } from '@/lib/availability'
import { time } from '@/lib/format'
import { BOOKING_STATUS } from '@/lib/status'

/**
 * The day as a proportional timeline rather than a list. Free time reads as
 * literal empty space, which is what "availability" actually means to an
 * operator glancing at the screen.
 */
const props = defineProps<{ date: Date; bookings: Booking[] }>()
defineEmits<{ open: [id: string] }>()

const store = useBookingsStore()
const PX_PER_MIN = 1.4

const hours = computed(() => hoursFor(businessHours, props.date))

const bounds = computed(() => {
  const h = hours.value
  if (!h || h.isClosed) return null
  const [oh, om] = h.open.split(':').map(Number)
  const [ch, cm] = h.close.split(':').map(Number)
  const open = set(startOfDay(props.date), { hours: oh, minutes: om })
  const close = set(startOfDay(props.date), { hours: ch, minutes: cm })
  return { open, close, totalMin: differenceInMinutes(close, open) }
})

const ticks = computed(() => {
  const b = bounds.value
  if (!b) return []
  const out: { label: string; top: number }[] = []
  for (let m = 0; m <= b.totalMin; m += 60) {
    out.push({ label: time(new Date(b.open.getTime() + m * 60000)), top: m * PX_PER_MIN })
  }
  return out
})

const blocks = computed(() => {
  const b = bounds.value
  if (!b) return []
  return props.bookings
    .filter((bk) => bk.status !== 'cancelled')
    .map((bk) => {
      const start = new Date(bk.startAt)
      const end = new Date(bk.endAt)
      const top = Math.max(0, differenceInMinutes(start, b.open)) * PX_PER_MIN
      const height = Math.max(26, differenceInMinutes(end, start) * PX_PER_MIN)
      return { booking: bk, view: store.hydrate(bk), top, height }
    })
})

/** Only meaningful when the timeline is showing today. */
const nowTop = computed(() => {
  const b = bounds.value
  if (!b || !isSameDay(props.date, new Date())) return null
  const mins = differenceInMinutes(new Date(), b.open)
  if (mins < 0 || mins > b.totalMin) return null
  return mins * PX_PER_MIN
})

const TONE: Record<string, string> = {
  success: 'border-success-700/30 bg-success-50 text-success-700',
  warning: 'border-warning-700/30 bg-warning-50 text-warning-700',
  danger: 'border-danger-700/30 bg-danger-50 text-danger-700',
  info: 'border-info-700/30 bg-info-50 text-info-700',
  neutral: 'border-gray-300 bg-gray-100 text-gray-700',
  muted: 'border-gray-200 bg-gray-50 text-gray-400',
}
</script>

<template>
  <div v-if="!bounds" class="px-4 py-10 text-center text-sm text-gray-500">مغلق في هذا اليوم.</div>

  <div v-else class="relative" :style="{ height: `${bounds.totalMin * PX_PER_MIN + 16}px` }">
    <!-- hour rail -->
    <div
      v-for="t in ticks"
      :key="t.label"
      class="inset-inline-start-0 absolute flex w-full items-center gap-2"
      :style="{ top: `${t.top}px` }"
    >
      <span class="w-14 shrink-0 text-[11px] text-gray-400" data-numeric>{{ t.label }}</span>
      <span class="h-px flex-1 bg-gray-100" />
    </div>

    <!-- now -->
    <div
      v-if="nowTop !== null"
      class="pointer-events-none absolute z-20 flex w-full items-center gap-1.5"
      :style="{ top: `${nowTop}px` }"
      aria-label="الوقت الحالي"
    >
      <span class="w-14 shrink-0" />
      <span class="bg-primary-600 h-2 w-2 shrink-0 rounded-full" />
      <span class="bg-primary-500 h-px flex-1" />
    </div>

    <!-- bookings -->
    <button
      v-for="b in blocks"
      :key="b.booking.id"
      type="button"
      class="hover:elev-raised absolute z-10 overflow-hidden rounded-[var(--radius-md)] border px-2.5 py-1.5 text-start transition-shadow"
      :class="TONE[BOOKING_STATUS[b.booking.status].tone]"
      :style="{
        top: `${b.top}px`,
        height: `${b.height}px`,
        insetInlineStart: '60px',
        insetInlineEnd: '0px',
      }"
      @click="$emit('open', b.booking.id)"
    >
      <span class="flex items-center gap-1.5">
        <component
          :is="BOOKING_STATUS[b.booking.status].icon"
          class="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
        <span class="truncate text-xs font-bold">{{ b.view.customer?.name }}</span>
      </span>
      <span v-if="b.height > 40" class="mt-0.5 block truncate text-[11px] opacity-80">
        {{ b.view.service?.name }} · {{ b.view.resource?.name }}
      </span>
    </button>
  </div>
</template>
