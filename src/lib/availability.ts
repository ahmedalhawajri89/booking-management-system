import { addMinutes, isBefore, set, startOfDay } from 'date-fns'
import type { Booking, BusinessHours, Service, Slot } from '@/types'
import { time } from './format'

/** Statuses that occupy their slot. Cancelled and no-show release the time. */
const BLOCKING: ReadonlySet<Booking['status']> = new Set(['pending', 'confirmed'])

function parseHm(base: Date, hm: string): Date {
  const [h, m] = hm.split(':').map(Number)
  return set(startOfDay(base), { hours: h ?? 0, minutes: m ?? 0 })
}

/** Half-open overlap: touching edges do not collide. */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function hoursFor(hours: BusinessHours[], date: Date): BusinessHours | undefined {
  return hours.find((h) => h.weekday === date.getDay())
}

export function isOpenOn(hours: BusinessHours[], date: Date): boolean {
  const h = hoursFor(hours, date)
  return !!h && !h.isClosed
}

/**
 * The single source of truth for "when can this be booked".
 * Everything — the guest wizard, the operator form, the calendar and conflict
 * detection — reads availability from here, so they can never disagree.
 */
export function generateSlots(opts: {
  date: Date
  service: Service
  resourceId: string
  bookings: Booking[]
  hours: BusinessHours[]
  /** Grid granularity in minutes. */
  stepMin?: number
  now?: Date
  /** Ignore this booking when testing overlap — used when rescheduling. */
  excludeBookingId?: string
}): Slot[] {
  const { date, service, resourceId, bookings, hours, stepMin = 30, excludeBookingId } = opts
  const now = opts.now ?? new Date()

  const dayHours = hoursFor(hours, date)
  if (!dayHours || dayHours.isClosed) return []

  const open = parseHm(date, dayHours.open)
  const close = parseHm(date, dayHours.close)
  const occupied = service.durationMin + service.bufferMin

  const relevant = bookings.filter(
    (b) =>
      b.resourceId === resourceId &&
      b.id !== excludeBookingId &&
      BLOCKING.has(b.status) &&
      new Date(b.startAt) < close &&
      new Date(b.endAt) > open,
  )

  const slots: Slot[] = []
  for (let cursor = open; !isBefore(close, addMinutes(cursor, occupied));) {
    const start = cursor
    const end = addMinutes(start, occupied)

    const taken = relevant.some((b) => overlaps(start, end, new Date(b.startAt), new Date(b.endAt)))

    slots.push({
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      label: time(start),
      state: taken ? 'taken' : isBefore(start, now) ? 'past' : 'available',
    })

    cursor = addMinutes(cursor, stepMin)
  }

  return slots
}

/** Would a booking at this time collide with anything already on the resource? */
export function hasConflict(
  candidate: { startAt: string; endAt: string; resourceId: string; id?: string },
  bookings: Booking[],
): boolean {
  const start = new Date(candidate.startAt)
  const end = new Date(candidate.endAt)
  return bookings.some(
    (b) =>
      b.resourceId === candidate.resourceId &&
      b.id !== candidate.id &&
      BLOCKING.has(b.status) &&
      overlaps(start, end, new Date(b.startAt), new Date(b.endAt)),
  )
}

/** Booked minutes vs. open minutes for a given day — drives the occupancy bar. */
export function occupancyFor(
  date: Date,
  bookings: Booking[],
  hours: BusinessHours[],
): { bookedMin: number; openMin: number; ratio: number } {
  const dayHours = hoursFor(hours, date)
  if (!dayHours || dayHours.isClosed) return { bookedMin: 0, openMin: 0, ratio: 0 }

  const open = parseHm(date, dayHours.open)
  const close = parseHm(date, dayHours.close)
  const openMin = (close.getTime() - open.getTime()) / 60000

  const bookedMin = bookings
    .filter((b) => BLOCKING.has(b.status))
    .reduce((total, b) => {
      const s = new Date(b.startAt)
      const e = new Date(b.endAt)
      if (!overlaps(s, e, open, close)) return total
      const from = Math.max(s.getTime(), open.getTime())
      const to = Math.min(e.getTime(), close.getTime())
      return total + (to - from) / 60000
    }, 0)

  return { bookedMin, openMin, ratio: openMin === 0 ? 0 : Math.min(1, bookedMin / openMin) }
}
