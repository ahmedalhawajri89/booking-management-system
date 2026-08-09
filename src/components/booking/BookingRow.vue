<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import type { Booking } from '@/types'
import { useBookingsStore } from '@/stores/bookings'
import { money, relativeDayTime, timeRange } from '@/lib/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'

/**
 * One booking, rendered as a card on small screens and as a dense row from
 * `sm` up. Same data, same target — the whole thing is one button so the
 * keyboard path is a single stop.
 */
const props = defineProps<{ booking: Booking; showDay?: boolean }>()
defineEmits<{ open: [id: string] }>()

const bookings = useBookingsStore()
const view = computed(() => bookings.hydrate(props.booking))
</script>

<template>
  <button
    type="button"
    class="group hover:bg-primary-50/40 flex w-full flex-col gap-2 border-b border-gray-200 px-4 py-3 text-start transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
    @click="$emit('open', booking.id)"
  >
    <!-- when -->
    <div class="flex shrink-0 items-baseline gap-2 sm:w-40 sm:flex-col sm:items-start sm:gap-0.5">
      <time :datetime="booking.startAt" class="text-sm font-bold text-gray-900">
        {{ showDay ? relativeDayTime(booking.startAt) : timeRange(booking.startAt, booking.endAt) }}
      </time>
      <span v-if="showDay" class="text-xs text-gray-400 sm:hidden">·</span>
      <span class="text-xs text-gray-500">{{ view.resource?.name ?? '—' }}</span>
    </div>

    <!-- who / what -->
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold text-gray-900">
        {{ view.customer?.name ?? 'عميل محذوف' }}
      </p>
      <p class="truncate text-xs text-gray-500">{{ view.service?.name ?? '—' }}</p>
    </div>

    <!-- state -->
    <div class="flex shrink-0 items-center gap-2">
      <StatusBadge :status="booking.status" size="sm" />
      <StatusBadge :payment="booking.paymentStatus" size="sm" />
      <span class="hidden w-20 text-end text-sm font-semibold text-gray-700 md:block" data-numeric>
        {{ money(booking.priceMinor) }}
      </span>
      <ChevronLeft
        class="hidden h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-gray-500 sm:block"
        aria-hidden="true"
      />
    </div>
  </button>
</template>
