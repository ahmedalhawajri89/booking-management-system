import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { addMinutes, isAfter, isBefore, isSameDay } from 'date-fns'
import { repository } from '@/data/repository'
import { isConflict } from '@/data/errors'
import { businessHours, resourceById, serviceById } from '@/data/catalog'
import { hasConflict, occupancyFor } from '@/lib/availability'
import { bookingReference, uid } from '@/lib/id'
import { clone } from '@/lib/clone'
import { useCustomersStore } from './customers'

const HOUR = 60 * 60 * 1000

export const useBookingsStore = defineStore('bookings', () => {
  const items = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const loaded = ref(false)

  /* ---------------------------------------------------------------- load */

  async function load(force = false) {
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

  /**
   * Fire-and-forget, but not fire-and-ignore.
   *
   * The mutations that call this are synchronous — the screen has already
   * moved on by the time the write resolves — so it cannot be awaited without
   * making every caller async. What it must not do is drop the failure: an
   * unhandled rejection is a save that silently did not happen, which is the
   * worst of both worlds. Surfacing it in `error` means the screen says so.
   */
  function persist() {
    repository.saveBookings(items.value).catch((e) => {
      error.value = isConflict(e) ? e.message : 'تعذّر حفظ التغييرات.'
    })
  }

  /* ------------------------------------------------------------- getters */

  /** @returns {import('@/types').BookingView} */
  function hydrate(booking) {
    const customers = useCustomersStore()
    return {
      booking,
      customer: customers.byId(booking.customerId),
      service: serviceById(booking.serviceId),
      resource: resourceById(booking.resourceId),
    }
  }

  const byId = (id) => items.value.find((b) => b.id === id) ?? null

  const sorted = computed(() => [...items.value].sort((a, b) => a.startAt.localeCompare(b.startAt)))

  function onDay(date) {
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
  const attention = computed(() => {
    const now = Date.now()
    const seen = new Set()
    const out = []

    const push = (b, reason) => {
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

  /**
   * Built once per change instead of scanning on every call.
   *
   * CustomersView calls forCustomer() from inside a v-for, and a function call
   * in a template re-runs on every render — so a linear scan there was O(n·m)
   * per paint. The customer drawer and the analytics screen want the same
   * index, so it lives here rather than in the view.
   */
  const byCustomer = computed(() => {
    const m = new Map()
    for (const b of sorted.value) {
      const list = m.get(b.customerId)
      if (list) list.push(b)
      else m.set(b.customerId, [b])
    }
    return m
  })

  function forCustomer(customerId) {
    return byCustomer.value.get(customerId) ?? []
  }

  /* ------------------------------------------------------------- actions */

  function appendEvent(b, type, summary) {
    b.history.push({ at: new Date().toISOString(), type, summary })
    b.updatedAt = new Date().toISOString()
  }

  /**
   * @param {{ customerId: string, serviceId: string, resourceId: string, startAt: string,
   *           status?: import('@/types').BookingStatus,
   *           paymentStatus?: import('@/types').PaymentStatus,
   *           channel?: import('@/types').BookingChannel,
   *           notes?: string }} input
   * @returns {import('@/types').Booking}
   */
  function create(input) {
    const service = serviceById(input.serviceId)
    if (!service) throw new Error('unknown service')

    const start = new Date(input.startAt)
    const end = addMinutes(start, service.durationMin + service.bufferMin)
    const now = new Date().toISOString()
    const year = start.getFullYear()

    const booking = {
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

  function setStatus(id, status) {
    const b = byId(id)
    if (!b) return
    const summaries = {
      pending: 'أُعيد الحجز إلى الانتظار',
      confirmed: 'تم تأكيد الحجز',
      completed: 'اكتملت الخدمة',
      cancelled: 'أُلغي الحجز',
      no_show: 'لم يحضر العميل',
    }
    const eventType =
      status === 'confirmed'
        ? 'confirmed'
        : status === 'completed'
          ? 'completed'
          : status === 'cancelled'
            ? 'cancelled'
            : status === 'no_show'
              ? 'no_show'
              : 'note_added'

    b.status = status
    appendEvent(b, eventType, summaries[status])
    persist()
  }

  function setPayment(id, paymentStatus) {
    const b = byId(id)
    if (!b) return
    const summaries = {
      unpaid: 'أُلغي تسجيل الدفع',
      deposit_paid: 'سُجّل عربون',
      paid: 'سُجّل الدفع كاملاً',
      refunded: 'تمت إعادة المبلغ',
    }
    b.paymentStatus = paymentStatus
    appendEvent(b, 'payment_recorded', summaries[paymentStatus])
    persist()
  }

  /**
   * Returns false and writes nothing if the new slot is taken.
   *
   * Until now the only thing stopping a double-booking here was that
   * TimeSlotGrid does not offer occupied slots — correct for the one path
   * that exists, but the store would happily write an overlap for any caller
   * that skipped the grid. The rule belongs with the data, not with one form.
   */
  function reschedule(id, startAt) {
    const b = byId(id)
    if (!b) return false
    const service = serviceById(b.serviceId)
    if (!service) return false

    const start = new Date(startAt)
    const end = addMinutes(start, service.durationMin + service.bufferMin)
    const candidate = { ...b, startAt: start.toISOString(), endAt: end.toISOString() }
    if (hasConflict(candidate, items.value)) return false

    b.startAt = candidate.startAt
    b.endAt = candidate.endAt
    appendEvent(b, 'rescheduled', 'أُعيدت جدولة الحجز')
    persist()
    return true
  }

  function addNote(id, note) {
    const b = byId(id)
    if (!b) return
    b.notes = note
    appendEvent(b, 'note_added', 'أُضيفت ملاحظة')
    persist()
  }

  /** Restore a previous snapshot — powers the undo affordance on destructive actions. */
  function restore(snapshot) {
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
    byCustomer,
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
