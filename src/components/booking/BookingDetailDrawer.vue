<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CalendarClock,
  Check,
  CircleCheckBig,
  MessageSquare,
  Phone,
  UserX,
  Wallet,
  XCircle,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { BookingStatus, PaymentStatus } from '@/types'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import BookingFormDrawer from './BookingFormDrawer.vue'
import { useBookingsStore } from '@/stores/bookings'
import { fullDate, money, time, timeRange, fromNow } from '@/lib/format'
import { hasConflict } from '@/lib/availability'
import { clone } from '@/lib/clone'

/**
 * The single source of truth for one booking. The action row is status-aware:
 * what the operator most likely needs to do next always leads.
 */
const props = defineProps<{ bookingId: string | null }>()
const emit = defineEmits<{ close: [] }>()

const store = useBookingsStore()

const booking = computed(() => (props.bookingId ? store.byId(props.bookingId) : null))
const view = computed(() => (booking.value ? store.hydrate(booking.value) : null))
const hasStarted = computed(() =>
  booking.value ? new Date(booking.value.startAt).getTime() < Date.now() : false,
)
const conflicted = computed(() => (booking.value ? hasConflict(booking.value, store.items) : false))
const isOpen = computed(() => booking.value !== null)

const confirmCancel = ref(false)
const rescheduleOpen = ref(false)

/** Snapshot before a destructive change so the toast can offer a real undo. */
function withUndo(label: string, mutate: () => void) {
  const before = booking.value ? clone(booking.value) : null
  mutate()
  toast.success(label, {
    action: before ? { label: 'تراجع', onClick: () => store.restore(before) } : undefined,
  })
}

function setStatus(status: BookingStatus, label: string) {
  if (!booking.value) return
  const id = booking.value.id
  withUndo(label, () => store.setStatus(id, status))
}

function setPayment(payment: PaymentStatus, label: string) {
  if (!booking.value) return
  const id = booking.value.id
  withUndo(label, () => store.setPayment(id, payment))
}

function doCancel() {
  confirmCancel.value = false
  setStatus('cancelled', 'أُلغي الحجز')
  emit('close')
}
</script>

<template>
  <BaseDrawer
    :open="isOpen"
    :title="booking?.reference ?? ''"
    :subtitle="view?.customer?.name"
    @close="emit('close')"
  >
    <div v-if="booking && view" class="space-y-5">
      <!-- state -->
      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge :status="booking.status" />
        <StatusBadge :payment="booking.paymentStatus" />
        <span
          v-if="conflicted"
          class="border-danger-100 bg-danger-50 text-danger-700 inline-flex items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-1 text-xs font-semibold"
        >
          تعارض مع حجز آخر
        </span>
      </div>

      <!-- when / what -->
      <div class="surface divide-y divide-gray-200">
        <div class="flex items-start gap-3 p-4">
          <CalendarClock class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900">{{ fullDate(booking.startAt) }}</p>
            <p class="mt-0.5 text-sm text-gray-600">
              {{ timeRange(booking.startAt, booking.endAt) }} · {{ view.resource?.name }}
            </p>
            <p class="mt-0.5 text-xs text-gray-400">{{ fromNow(booking.startAt) }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 p-4">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900">{{ view.service?.name }}</p>
            <p class="mt-0.5 text-xs text-gray-500">
              {{
                booking.channel === 'online'
                  ? 'حجز إلكتروني'
                  : booking.channel === 'phone'
                    ? 'حجز هاتفي'
                    : 'حضور مباشر'
              }}
            </p>
          </div>
          <span class="shrink-0 text-base font-bold text-gray-900" data-numeric>
            {{ money(booking.priceMinor) }}
          </span>
        </div>

        <div class="flex items-center justify-between gap-3 p-4">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900">{{ view.customer?.name }}</p>
            <p class="mt-0.5 text-xs text-gray-500" dir="ltr" style="text-align: start">
              {{ view.customer?.phone }}
            </p>
          </div>
          <a
            v-if="view.customer"
            :href="`tel:${view.customer.phone}`"
            class="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-md)] border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Phone class="h-4 w-4" aria-hidden="true" />
            اتصال
          </a>
        </div>

        <div v-if="booking.notes" class="flex items-start gap-3 p-4">
          <MessageSquare class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <p class="text-sm leading-relaxed text-gray-600">{{ booking.notes }}</p>
        </div>
      </div>

      <!-- payment -->
      <div>
        <h3 class="mb-2 text-[13px] font-semibold text-gray-700">الدفع</h3>
        <div class="flex flex-wrap gap-2">
          <BaseButton
            v-if="booking.paymentStatus !== 'paid'"
            size="sm"
            :icon="Wallet"
            @click="setPayment('paid', 'سُجّل الدفع كاملاً')"
          >
            تسجيل دفع كامل
          </BaseButton>
          <BaseButton
            v-if="booking.paymentStatus === 'unpaid'"
            size="sm"
            @click="setPayment('deposit_paid', 'سُجّل العربون')"
          >
            تسجيل عربون
          </BaseButton>
          <BaseButton
            v-if="booking.paymentStatus === 'paid'"
            size="sm"
            variant="ghost"
            @click="setPayment('refunded', 'تمت إعادة المبلغ')"
          >
            إعادة المبلغ
          </BaseButton>
        </div>
      </div>

      <!-- history -->
      <div>
        <h3 class="mb-2 text-[13px] font-semibold text-gray-700">السجل</h3>
        <ol class="space-y-2.5 border-s border-gray-200 ps-4">
          <li v-for="(e, i) in [...booking.history].reverse()" :key="i" class="relative">
            <span
              class="absolute top-1.5 h-1.5 w-1.5 rounded-full bg-gray-300"
              style="inset-inline-start: -19px"
              aria-hidden="true"
            />
            <p class="text-sm text-gray-700">{{ e.summary }}</p>
            <p class="text-xs text-gray-400">{{ fullDate(e.at) }} · {{ time(e.at) }}</p>
          </li>
        </ol>
      </div>
    </div>

    <template #footer>
      <div v-if="booking" class="flex flex-wrap items-center gap-2">
        <BaseButton
          v-if="booking.status === 'pending'"
          variant="primary"
          :icon="Check"
          @click="setStatus('confirmed', 'تم تأكيد الحجز')"
        >
          تأكيد
        </BaseButton>
        <BaseButton
          v-else-if="booking.status === 'confirmed' && hasStarted"
          variant="primary"
          :icon="CircleCheckBig"
          @click="setStatus('completed', 'اكتملت الخدمة')"
        >
          إكمال
        </BaseButton>

        <BaseButton
          v-if="booking.status === 'confirmed' || booking.status === 'pending'"
          :icon="CalendarClock"
          @click="rescheduleOpen = true"
        >
          إعادة جدولة
        </BaseButton>

        <BaseButton
          v-if="booking.status === 'confirmed' && hasStarted"
          :icon="UserX"
          @click="setStatus('no_show', 'سُجّل عدم الحضور')"
        >
          لم يحضر
        </BaseButton>

        <BaseButton
          v-if="booking.status === 'pending' || booking.status === 'confirmed'"
          variant="danger"
          :icon="XCircle"
          class="ms-auto"
          @click="confirmCancel = true"
        >
          إلغاء
        </BaseButton>
      </div>
    </template>
  </BaseDrawer>

  <ConfirmDialog
    :open="confirmCancel"
    title="إلغاء الحجز؟"
    :message="`سيتم إلغاء حجز ${view?.customer?.name ?? ''} في ${booking ? fullDate(booking.startAt) : ''}. يمكنك التراجع مباشرة بعد الإلغاء.`"
    confirm-label="نعم، ألغِ الحجز"
    @confirm="doCancel"
    @cancel="confirmCancel = false"
  />

  <BookingFormDrawer
    :open="rescheduleOpen"
    :reschedule-id="booking?.id ?? null"
    @close="rescheduleOpen = false"
  />
</template>
