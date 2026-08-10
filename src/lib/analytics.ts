import { eachDayOfInterval, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import type { Booking, BookingChannel, BookingStatus, BusinessHours } from '@/types'
import { occupancyFor } from './availability'

/**
 * Every figure the analytics screen shows, as pure functions over the
 * bookings already in the store.
 *
 * Pure and separate from the view for two reasons: these are the numbers an
 * operator would act on, so they need to be testable without mounting
 * anything; and nothing here may invent data. If a metric cannot be derived
 * from the booking model it does not belong on the screen.
 */

export interface DateRange {
  from: Date
  to: Date
}

/** Bookings that have reached a decision — the denominator for rate metrics. */
const SETTLED: ReadonlySet<BookingStatus> = new Set(['completed', 'no_show'])

export function inRange(bookings: Booking[], range: DateRange): Booking[] {
  const interval = { start: startOfDay(range.from), end: endOfDay(range.to) }
  return bookings.filter((b) => isWithinInterval(new Date(b.startAt), interval))
}

export interface Kpis {
  /** 0–1. Booked minutes over open minutes, averaged across open days. */
  occupancy: number
  /** Minor units. */
  revenueCollected: number
  revenueOutstanding: number
  /** 0–1. */
  noShowRate: number
  cancellationRate: number
  /** Hours between creating a booking and the appointment itself. */
  medianLeadHours: number
  bookingCount: number
}

export function computeKpis(
  bookings: Booking[],
  range: DateRange,
  hours: BusinessHours[],
): Kpis {
  const scoped = inRange(bookings, range)

  // Averaged over open days only. Including closed days would silently
  // dilute the number by however many days a week the business is shut.
  const days = eachDayOfInterval({ start: range.from, end: range.to })
  let ratioSum = 0
  let openDays = 0
  for (const day of days) {
    const dayBookings = scoped.filter((b) => isSameDayIso(b.startAt, day))
    const { openMin, ratio } = occupancyFor(day, dayBookings, hours)
    if (openMin === 0) continue
    ratioSum += ratio
    openDays += 1
  }

  const collected = scoped
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((s, b) => s + b.priceMinor, 0)

  // Money the business is owed: work it is committed to or has done, not yet
  // paid for. Cancelled bookings are not owed; refunded ones are settled.
  const outstanding = scoped
    .filter(
      (b) =>
        (b.status === 'confirmed' || b.status === 'completed') &&
        (b.paymentStatus === 'unpaid' || b.paymentStatus === 'deposit_paid'),
    )
    .reduce((s, b) => s + b.priceMinor, 0)

  const settled = scoped.filter((b) => SETTLED.has(b.status))
  const noShows = settled.filter((b) => b.status === 'no_show').length
  const cancelled = scoped.filter((b) => b.status === 'cancelled').length

  const leads = scoped
    .map((b) => (new Date(b.startAt).getTime() - new Date(b.createdAt).getTime()) / 3_600_000)
    .filter((h) => h >= 0)
    .sort((a, b) => a - b)

  return {
    occupancy: openDays === 0 ? 0 : ratioSum / openDays,
    revenueCollected: collected,
    revenueOutstanding: outstanding,
    noShowRate: settled.length === 0 ? 0 : noShows / settled.length,
    cancellationRate: scoped.length === 0 ? 0 : cancelled / scoped.length,
    medianLeadHours: median(leads),
    bookingCount: scoped.length,
  }
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? ((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!
}

function isSameDayIso(iso: string, day: Date): boolean {
  const d = new Date(iso)
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  )
}

/* ------------------------------------------------------------------ series */

export interface DailyPoint {
  date: Date
  label: string
  bookings: number
  revenueMinor: number
}

export function dailySeries(bookings: Booking[], range: DateRange): DailyPoint[] {
  const scoped = inRange(bookings, range)
  return eachDayOfInterval({ start: range.from, end: range.to }).map((date) => {
    const onDay = scoped.filter((b) => isSameDayIso(b.startAt, date))
    return {
      date,
      label: format(date, 'd/M'),
      bookings: onDay.length,
      revenueMinor: onDay
        .filter((b) => b.paymentStatus === 'paid')
        .reduce((s, b) => s + b.priceMinor, 0),
    }
  })
}

export function countBy<K extends string>(
  bookings: Booking[],
  range: DateRange,
  key: (b: Booking) => K,
  keys: readonly K[],
): Record<K, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>
  for (const b of inRange(bookings, range)) out[key(b)] += 1
  return out
}

export function byChannel(bookings: Booking[], range: DateRange) {
  return countBy<BookingChannel>(bookings, range, (b) => b.channel, [
    'online',
    'phone',
    'walk_in',
  ])
}

export function byStatus(bookings: Booking[], range: DateRange) {
  return countBy<BookingStatus>(bookings, range, (b) => b.status, [
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show',
  ])
}

/**
 * Demand by weekday and hour.
 *
 * The most operationally useful chart here: it answers "when do I need more
 * staff", which no single number can. Cancelled bookings are excluded —
 * demand means time people actually wanted.
 */
export function demandHeatmap(
  bookings: Booking[],
  range: DateRange,
  fromHour = 8,
  toHour = 20,
): { weekday: number; hour: number; count: number }[] {
  const grid = new Map<string, number>()
  for (const b of inRange(bookings, range)) {
    if (b.status === 'cancelled') continue
    const d = new Date(b.startAt)
    const h = d.getHours()
    if (h < fromHour || h > toHour) continue
    const k = `${d.getDay()}:${h}`
    grid.set(k, (grid.get(k) ?? 0) + 1)
  }

  const out: { weekday: number; hour: number; count: number }[] = []
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = fromHour; hour <= toHour; hour++) {
      out.push({ weekday, hour, count: grid.get(`${weekday}:${hour}`) ?? 0 })
    }
  }
  return out
}

export interface ServiceTotals {
  serviceId: string
  count: number
  revenueMinor: number
}

export function topServices(bookings: Booking[], range: DateRange): ServiceTotals[] {
  const m = new Map<string, ServiceTotals>()
  for (const b of inRange(bookings, range)) {
    if (b.status === 'cancelled') continue
    const row = m.get(b.serviceId) ?? { serviceId: b.serviceId, count: 0, revenueMinor: 0 }
    row.count += 1
    row.revenueMinor += b.priceMinor
    m.set(b.serviceId, row)
  }
  return [...m.values()].sort((a, b) => b.revenueMinor - a.revenueMinor)
}
