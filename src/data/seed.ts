import { addDays, addMinutes, set, startOfDay } from 'date-fns'
import type { Booking, BookingStatus, Customer, PaymentStatus } from '@/types'
import { bookingReference } from '@/lib/id'
import { serviceById } from './catalog'

/* Seed data is generated relative to "now" so the product always has a live
 * today. It deliberately contains the awkward cases — a scheduling conflict,
 * a no-show, an unpaid imminent booking and a past booking never closed out —
 * so that empty, healthy and problematic states are all reachable in the UI. */

export const customers: Customer[] = [
  {
    id: 'c1',
    name: 'أحمد سعيد',
    phone: '0501234567',
    email: 'ahmed@example.com',
    createdAt: '2025-11-02T09:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'سارة خالد',
    phone: '0552345678',
    email: 'sara@example.com',
    createdAt: '2025-12-14T09:00:00.000Z',
  },
  { id: 'c3', name: 'محمد علي', phone: '0533456789', createdAt: '2026-01-08T09:00:00.000Z' },
  {
    id: 'c4',
    name: 'فاطمة أحمد',
    phone: '0544567890',
    email: 'fatima@example.com',
    createdAt: '2026-01-21T09:00:00.000Z',
  },
  { id: 'c5', name: 'خالد الحربي', phone: '0565678901', createdAt: '2026-02-03T09:00:00.000Z' },
  {
    id: 'c6',
    name: 'نورة القحطاني',
    phone: '0576789012',
    email: 'noura@example.com',
    createdAt: '2026-02-19T09:00:00.000Z',
  },
  { id: 'c7', name: 'عبدالله المطيري', phone: '0587890123', createdAt: '2026-03-05T09:00:00.000Z' },
  {
    id: 'c8',
    name: 'ريم الشمري',
    phone: '0598901234',
    email: 'reem@example.com',
    createdAt: '2026-03-27T09:00:00.000Z',
  },
  { id: 'c9', name: 'يوسف الزهراني', phone: '0509012345', createdAt: '2026-04-11T09:00:00.000Z' },
  {
    id: 'c10',
    name: 'هند العتيبي',
    phone: '0510123456',
    email: 'hind@example.com',
    createdAt: '2026-05-02T09:00:00.000Z',
  },
  { id: 'c11', name: 'ماجد الدوسري', phone: '0521234567', createdAt: '2026-06-16T09:00:00.000Z' },
  {
    id: 'c12',
    name: 'لمى السبيعي',
    phone: '0532345678',
    email: 'lama@example.com',
    createdAt: '2026-07-09T09:00:00.000Z',
  },
]

interface SeedSpec {
  dayOffset: number
  hm: string
  customerId: string
  serviceId: string
  resourceId: string
  status: BookingStatus
  paymentStatus: PaymentStatus
  channel: Booking['channel']
  notes?: string
}

/* dayOffset 0 = today. Times are local wall-clock. */
const SPECS: SeedSpec[] = [
  // ---- today -------------------------------------------------------------
  {
    dayOffset: 0,
    hm: '09:00',
    customerId: 'c1',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'phone',
  },
  {
    dayOffset: 0,
    hm: '10:00',
    customerId: 'c2',
    serviceId: 's2',
    resourceId: 'r1',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  // never closed out — will surface in "needs attention" once its time passes
  {
    dayOffset: 0,
    hm: '11:30',
    customerId: 'c3',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'confirmed',
    paymentStatus: 'paid',
    channel: 'walk_in',
  },
  // unpaid and imminent
  {
    dayOffset: 0,
    hm: '13:00',
    customerId: 'c4',
    serviceId: 's1',
    resourceId: 'r2',
    status: 'confirmed',
    paymentStatus: 'unpaid',
    channel: 'online',
    notes: 'تفضل الدفع نقداً عند الحضور.',
  },
  {
    dayOffset: 0,
    hm: '14:00',
    customerId: 'c5',
    serviceId: 's2',
    resourceId: 'r1',
    status: 'confirmed',
    paymentStatus: 'deposit_paid',
    channel: 'phone',
  },
  // pending, starts today — needs a decision
  {
    dayOffset: 0,
    hm: '15:30',
    customerId: 'c6',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'pending',
    paymentStatus: 'unpaid',
    channel: 'online',
  },
  {
    dayOffset: 0,
    hm: '16:00',
    customerId: 'c7',
    serviceId: 's3',
    resourceId: 'r2',
    status: 'confirmed',
    paymentStatus: 'paid',
    channel: 'online',
    notes: 'طاولة بجانب النافذة.',
  },

  // ---- tomorrow ----------------------------------------------------------
  {
    dayOffset: 1,
    hm: '09:30',
    customerId: 'c8',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'confirmed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  {
    dayOffset: 1,
    hm: '11:00',
    customerId: 'c9',
    serviceId: 's2',
    resourceId: 'r1',
    status: 'pending',
    paymentStatus: 'unpaid',
    channel: 'online',
  },
  // deliberate conflict with the booking above on the same resource
  {
    dayOffset: 1,
    hm: '11:30',
    customerId: 'c10',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'confirmed',
    paymentStatus: 'unpaid',
    channel: 'phone',
  },
  {
    dayOffset: 1,
    hm: '14:00',
    customerId: 'c11',
    serviceId: 's3',
    resourceId: 'r2',
    status: 'confirmed',
    paymentStatus: 'deposit_paid',
    channel: 'phone',
  },

  // ---- next few days -----------------------------------------------------
  {
    dayOffset: 2,
    hm: '10:00',
    customerId: 'c12',
    serviceId: 's1',
    resourceId: 'r2',
    status: 'confirmed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  {
    dayOffset: 2,
    hm: '12:00',
    customerId: 'c1',
    serviceId: 's2',
    resourceId: 'r1',
    status: 'pending',
    paymentStatus: 'unpaid',
    channel: 'online',
  },
  {
    dayOffset: 3,
    hm: '09:00',
    customerId: 'c3',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'confirmed',
    paymentStatus: 'unpaid',
    channel: 'walk_in',
  },
  {
    dayOffset: 3,
    hm: '15:00',
    customerId: 'c5',
    serviceId: 's3',
    resourceId: 'r2',
    status: 'confirmed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  {
    dayOffset: 4,
    hm: '11:00',
    customerId: 'c8',
    serviceId: 's2',
    resourceId: 'r1',
    status: 'confirmed',
    paymentStatus: 'deposit_paid',
    channel: 'phone',
  },
  {
    dayOffset: 5,
    hm: '15:00',
    customerId: 'c2',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'confirmed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  {
    dayOffset: 6,
    hm: '11:00',
    customerId: 'c6',
    serviceId: 's1',
    resourceId: 'r2',
    status: 'pending',
    paymentStatus: 'unpaid',
    channel: 'online',
  },

  // ---- history -----------------------------------------------------------
  {
    dayOffset: -1,
    hm: '10:00',
    customerId: 'c1',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  {
    dayOffset: -1,
    hm: '13:00',
    customerId: 'c4',
    serviceId: 's2',
    resourceId: 'r1',
    status: 'no_show',
    paymentStatus: 'unpaid',
    channel: 'online',
  },
  {
    dayOffset: -2,
    hm: '09:30',
    customerId: 'c2',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'phone',
  },
  {
    dayOffset: -2,
    hm: '14:00',
    customerId: 'c7',
    serviceId: 's3',
    resourceId: 'r2',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  {
    dayOffset: -3,
    hm: '11:00',
    customerId: 'c9',
    serviceId: 's2',
    resourceId: 'r1',
    status: 'cancelled',
    paymentStatus: 'refunded',
    channel: 'online',
  },
  {
    dayOffset: -3,
    hm: '16:00',
    customerId: 'c10',
    serviceId: 's1',
    resourceId: 'r2',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'walk_in',
  },
  {
    dayOffset: -4,
    hm: '10:30',
    customerId: 'c3',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  {
    dayOffset: -5,
    hm: '12:00',
    customerId: 'c11',
    serviceId: 's2',
    resourceId: 'r1',
    status: 'no_show',
    paymentStatus: 'unpaid',
    channel: 'online',
  },
  {
    dayOffset: -6,
    hm: '15:00',
    customerId: 'c12',
    serviceId: 's1',
    resourceId: 'r1',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'phone',
  },
  {
    dayOffset: -8,
    hm: '09:00',
    customerId: 'c1',
    serviceId: 's2',
    resourceId: 'r1',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  {
    dayOffset: -11,
    hm: '14:00',
    customerId: 'c5',
    serviceId: 's1',
    resourceId: 'r2',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'online',
  },
  {
    dayOffset: -14,
    hm: '10:00',
    customerId: 'c8',
    serviceId: 's3',
    resourceId: 'r2',
    status: 'completed',
    paymentStatus: 'paid',
    channel: 'phone',
  },
]

const STATUS_EVENT: Partial<
  Record<BookingStatus, { type: 'completed' | 'cancelled' | 'no_show'; summary: string }>
> = {
  completed: { type: 'completed', summary: 'اكتملت الخدمة' },
  cancelled: { type: 'cancelled', summary: 'أُلغي الحجز' },
  no_show: { type: 'no_show', summary: 'لم يحضر العميل' },
}

export function buildSeedBookings(now = new Date()): Booking[] {
  return SPECS.map((spec, i) => {
    const service = serviceById(spec.serviceId)!
    const [h, m] = spec.hm.split(':').map(Number)
    const start = set(startOfDay(addDays(now, spec.dayOffset)), { hours: h, minutes: m })
    const end = addMinutes(start, service.durationMin + service.bufferMin)
    const createdAt = addDays(start, -3).toISOString()

    const history: Booking['history'] = [{ at: createdAt, type: 'created', summary: 'أُنشئ الحجز' }]
    if (spec.status !== 'pending') {
      history.push({
        at: addDays(start, -2).toISOString(),
        type: 'confirmed',
        summary: 'تم تأكيد الحجز',
      })
    }
    if (spec.paymentStatus === 'paid' || spec.paymentStatus === 'deposit_paid') {
      history.push({
        at: addDays(start, -1).toISOString(),
        type: 'payment_recorded',
        summary: spec.paymentStatus === 'paid' ? 'سُجّل الدفع كاملاً' : 'سُجّل عربون',
      })
    }
    const closing = STATUS_EVENT[spec.status]
    if (closing) {
      history.push({ at: end.toISOString(), type: closing.type, summary: closing.summary })
    }

    return {
      id: `b${i + 1}`,
      reference: bookingReference(start.getFullYear(), 401 + i),
      customerId: spec.customerId,
      serviceId: spec.serviceId,
      resourceId: spec.resourceId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      status: spec.status,
      paymentStatus: spec.paymentStatus,
      priceMinor: service.priceMinor,
      channel: spec.channel,
      notes: spec.notes,
      createdAt,
      updatedAt: createdAt,
      history,
    }
  })
}
