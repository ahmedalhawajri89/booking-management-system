import type { FunctionalComponent } from 'vue'
import type { LucideProps } from 'lucide-vue-next'

export type LucideIcon = FunctionalComponent<LucideProps>

/* ------------------------------------------------------------------ *
 * Conventions
 * - Money is stored in minor units (halalas). 15000 → 150.00 ر.س
 * - Durations are whole minutes.
 * - Instants are ISO 8601 strings. Never a pre-formatted display string.
 * - Statuses are machine values; Arabic labels live in the UI layer only.
 * ------------------------------------------------------------------ */

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded'
export type BookingChannel = 'online' | 'phone' | 'walk_in'

export interface Service {
  id: string
  name: string
  description: string
  durationMin: number
  /** Clean-up / turnaround gap reserved after the appointment. */
  bufferMin: number
  priceMinor: number
  resourceIds: string[]
  icon: LucideIcon
  isActive: boolean
}

/** The thing that can be double-booked: a room, a chair, a practitioner. */
export interface Resource {
  id: string
  name: string
  isActive: boolean
}

export interface Customer {
  id: string
  name: string
  /** The identity key in this market — used for lookup and dedupe. */
  phone: string
  email?: string
  notes?: string
  createdAt: string
}

export type BookingEventType =
  | 'created'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'payment_recorded'
  | 'note_added'

export interface BookingEvent {
  at: string
  type: BookingEventType
  summary: string
}

export interface Booking {
  id: string
  /** Human-quotable reference, e.g. BK-2026-0431 */
  reference: string
  customerId: string
  serviceId: string
  resourceId: string
  startAt: string
  /** startAt + durationMin + bufferMin, precomputed for cheap overlap tests. */
  endAt: string
  status: BookingStatus
  paymentStatus: PaymentStatus
  /** Snapshot of the price at booking time — services change price over time. */
  priceMinor: number
  channel: BookingChannel
  notes?: string
  createdAt: string
  updatedAt: string
  history: BookingEvent[]
}

/** Per-weekday opening times. weekday follows Date#getDay() — 0 = Sunday. */
export interface BusinessHours {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  open: string // "09:00"
  close: string // "18:00"
  isClosed: boolean
}

/* ------------------------------------------------------------------ *
 * Derived / view-model types
 * ------------------------------------------------------------------ */

export type SlotState = 'available' | 'taken' | 'past'

export interface Slot {
  startAt: string
  endAt: string
  label: string
  state: SlotState
}

export type AttentionReason = 'pending_soon' | 'overdue_completion' | 'unpaid_imminent' | 'conflict'

export interface AttentionItem {
  booking: Booking
  reason: AttentionReason
}

/** A booking joined with its related entities, ready for display. */
export interface BookingView {
  booking: Booking
  customer: Customer | null
  service: Service | null
  resource: Resource | null
}
