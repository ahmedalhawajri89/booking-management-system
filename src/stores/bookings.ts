import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { addMinutes, isAfter, isBefore, isSameDay } from 'date-fns'
import type {
  AttentionItem,
  Booking,
  BookingChannel,
  BookingStatus,
  BookingView,
  PaymentStatus,
} from '@/types'
import { repository } from '@/data/repository'
import { businessHours, resourceById, serviceById } from '@/data/catalog'
import { hasConflict, occupancyFor } from '@/lib/availability'
import { bookingReference, uid } from '@/lib/id'
import { clone } from '@/lib/clone'
import { useCustomersStore } from './customers'

const HOUR = 60 * 60 * 1000

export const useBookingsStore = defineStore('bookings', () => {
  const items = ref<Booking[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  /* ---------------------------------------------------------------- load */

  async function load(force = false): Promise<void> {
    if (loaded.value && !force) return
    isLoading.value = true
    error.value = null
    try {
      items.value = await repository.loadBookings()
      loaded.value = true
    } catch {
      error.value = 'تعذّر تحميل الحجوزات. تحقّق من الاتصال ثم أعد المحاولة.'
    } finally {
      isLoading.value = false
    }
  }

  function persist(): void {
    void repository.saveBookings(items.value)
  }

  /* ------------------------------------------------------------- getters */

  function hydrate(booking: Booking): BookingView {
    const customers = useCustomersStore()
    return {
      booking,
      customer: customers.byId(booking.customerId),
      service: serviceById(booking.serviceId),
      resource: resourceById(booking.resourceId),
    }
  }

  const byId = (id: string): Booking | null => items.value.find((b) => b.id === id) ?? null

  const sorted = computed(() => [...items.value].sort((a, b) => a.startAt.localeCompare(b.startAt)))

  function onDay(date: Date): Booking[] {
    return sorted.value.filter((b) => isSameDay(new Date(b.startAt), date))
  }

  const today = computed(() => onDay(new Date()))

  /** The next bookings still ahead of us today or later. */
  const upcoming = computed(() => {
    const now = new Date()
    return sorted.value.filter(
      (b) =>
        isAfter(new Date(b.startAt), now) && (b.status === 'confirmed' || b.status === 'pending'),
    )
  })

  const conflicts = computed(() => items.value.filter((b) => hasConflict(b, items.value)))

  /** The predicate the Today screen is built around. Order matters: most urgent first. */
  const attention = computed<AttentionItem[]>(() => {
    const now = Date.now()
    const seen = new Set<string>()
    const out: AttentionItem[] = []

    const push = (b: Booking, reason: AttentionItem['reason']) => {
      if (seen.has(b.id)) return
      seen.add(b.id)
      out.push({ booking: b, reason })
    }

    for (const b of conflicts.value) push(b, 'conflict')

    for (const b of sorted.value) {
      const start = new Date(b.startAt).getTime()
      const end = new Date(b.endAt).getTime()

      if (b.status === 'confirmed' && end < now) {
        push(b, 'overdue_completion')
      } else if (b.status === 'pending' && start - now < 24 * HOUR && start > now - HOUR) {
        push(b, 'pending_soon')
      } else if (
        b.status === 'confirmed' &&
        b.paymentStatus === 'unpaid' &&
        start - now < 2 * HOUR &&
        start > now
      ) {
        push(b, 'unpaid_imminent')
      }
    }

    return out.sort((a, b) => a.booking.startAt.localeCompare(b.booking.startAt))
  })

  const occupancyToday = computed(() => occupancyFor(new Date(), today.value, businessHours))

  function forCustomer(customerId: string): Booking[] {
    return sorted.value.filter((b) => b.customerId === customerId)
  }

  /* ------------------------------------------------------------- actions */

  function appendEvent(b: Booking, type: Booking['history'][number]['type'], summary: string) {
    b.history.push({ at: new Date().toISOString(), type, summary })
    b.updatedAt = new Date().toISOString()
  }

  function create(input: {
    customerId: string
    serviceId: string
    resourceId: string
    startAt: string
    status?: BookingStatus
    paymentStatus?: PaymentStatus
    channel?: BookingChannel
    notes?: string
  }): Booking {
    const service = serviceById(input.serviceId)
    if (!service) throw new Error('unknown service')

    const start = new Date(input.startAt)
    const end = addMinutes(start, service.durationMin + service.bufferMin)
    const now = new Date().toISOString()
    const year = start.getFullYear()

    const booking: Booking = {
      id: uid('b_'),
      reference: bookingReference(year, 500 + items.value.length + 1),
      customerId: input.customerId,
      serviceId: input.serviceId,
      resourceId: input.resourceId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      status: input.status ?? 'confirmed',
      paymentStatus: input.paymentStatus ?? 'unpaid',
      priceMinor: service.priceMinor,
      channel: input.channel ?? 'phone',
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, type: 'created', summary: 'أُنشئ الحجز' }],
    }
    if (booking.status === 'confirmed') {
      booking.history.push({ at: now, type: 'confirmed', summary: 'تم تأكيد الحجز' })
    }

    items.value.push(booking)
    persist()
    return booking
  }

  function setStatus(id: string, status: BookingStatus): void {
    const b = byId(id)
    if (!b) return
    const summaries: Record<BookingStatus, string> = {
      pending: 'أُعيد الحجز إلى الانتظار',
      confirmed: 'تم تأكيد الحجز',
      completed: 'اكتملت الخدمة',
      cancelled: 'أُلغي الحجز',
      no_show: 'لم يحضر العميل',
    }
    const eventType = (
      status === 'confirmed'
        ? 'confirmed'
        : status === 'completed'
          ? 'completed'
          : status === 'cancelled'
            ? 'cancelled'
            : status === 'no_show'
              ? 'no_show'
              : 'note_added'
    ) as Booking['history'][number]['type']

    b.status = status
    appendEvent(b, eventType, summaries[status])
    persist()
  }

  function setPayment(id: string, paymentStatus: PaymentStatus): void {
    const b = byId(id)
    if (!b) return
    const summaries: Record<PaymentStatus, string> = {
      unpaid: 'أُلغي تسجيل الدفع',
      deposit_paid: 'سُجّل عربون',
      paid: 'سُجّل الدفع كاملاً',
      refunded: 'تمت إعادة المبلغ',
    }
    b.paymentStatus = paymentStatus
    appendEvent(b, 'payment_recorded', summaries[paymentStatus])
    persist()
  }

  function reschedule(id: string, startAt: string): void {
    const b = byId(id)
    if (!b) return
    const service = serviceById(b.serviceId)
    if (!service) return
    const start = new Date(startAt)
    b.startAt = start.toISOString()
    b.endAt = addMinutes(start, service.durationMin + service.bufferMin).toISOString()
    appendEvent(b, 'rescheduled', 'أُعيدت جدولة الحجز')
    persist()
  }

  function addNote(id: string, note: string): void {
    const b = byId(id)
    if (!b) return
    b.notes = note
    appendEvent(b, 'note_added', 'أُضيفت ملاحظة')
    persist()
  }

  /** Restore a previous snapshot — powers the undo affordance on destructive actions. */
  function restore(snapshot: Booking): void {
    const i = items.value.findIndex((b) => b.id === snapshot.id)
    if (i === -1) return
    items.value[i] = clone(snapshot)
    persist()
  }

  return {
    items,
    isLoading,
    error,
    loaded,
    load,
    hydrate,
    byId,
    sorted,
    onDay,
    today,
    upcoming,
    conflicts,
    attention,
    occupancyToday,
    forCustomer,
    create,
    setStatus,
    setPayment,
    reschedule,
    addNote,
    restore,
  }
})

export { isBefore }
