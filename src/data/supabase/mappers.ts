import type { Booking, BookingEvent, Customer, Resource } from '@/types'
import type { CatalogSnapshot, ServiceRow } from '@/data/catalog'

/**
 * snake_case rows in, camelCase domain objects out.
 *
 * This translation lives in one file on purpose. The alternative — teaching
 * the stores to read `start_at` — would spread the storage schema through the
 * whole app and undo the point of having a repository seam at all.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

export function toBooking(row: Row): Booking {
  return {
    id: row.id,
    reference: row.reference,
    customerId: row.customer_id,
    serviceId: row.service_id,
    resourceId: row.resource_id,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    paymentStatus: row.payment_status,
    priceMinor: row.price_minor,
    channel: row.channel,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // The trigger writes these, so a fetch that skipped the join would
    // silently show an empty history rather than fail.
    history: (row.booking_events ?? [])
      .map(
        (e: Row): BookingEvent => ({ at: e.at, type: e.type, summary: e.summary }),
      )
      .sort((a: BookingEvent, b: BookingEvent) => a.at.localeCompare(b.at)),
  }
}

/** Only the columns a client may write. Generated and audit columns are not
 *  in this list, which is the point: they cannot be spoofed from here. */
export function fromBooking(b: Booking, orgId: string): Row {
  return {
    id: b.id,
    org_id: orgId,
    reference: b.reference,
    customer_id: b.customerId,
    service_id: b.serviceId,
    resource_id: b.resourceId,
    start_at: b.startAt,
    end_at: b.endAt,
    status: b.status,
    payment_status: b.paymentStatus,
    price_minor: b.priceMinor,
    channel: b.channel,
    notes: b.notes ?? null,
  }
}

export function toCustomer(row: Row): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

export function fromCustomer(c: Customer, orgId: string): Row {
  return {
    id: c.id,
    org_id: orgId,
    name: c.name,
    phone: c.phone,
    email: c.email ?? null,
    notes: c.notes ?? null,
  }
}

export function toCatalog(
  services: Row[],
  resources: Row[],
  hours: Row[],
  links: Row[],
): CatalogSnapshot {
  const byService = new Map<string, string[]>()
  for (const l of links) {
    const list = byService.get(l.service_id)
    if (list) list.push(l.resource_id)
    else byService.set(l.service_id, [l.resource_id])
  }

  return {
    services: services.map(
      (s): ServiceRow => ({
        id: s.id,
        name: s.name,
        description: s.description ?? '',
        durationMin: s.duration_min,
        bufferMin: s.buffer_min,
        priceMinor: s.price_minor,
        resourceIds: byService.get(s.id) ?? [],
        iconKey: s.icon_key,
        isActive: s.is_active,
      }),
    ),
    resources: resources.map(
      (r): Resource => ({ id: r.id, name: r.name, isActive: r.is_active }),
    ),
    businessHours: hours.map((h) => ({
      weekday: h.weekday,
      // Postgres returns "09:00:00"; the client's BusinessHours is "09:00".
      open: String(h.open_time).slice(0, 5),
      close: String(h.close_time).slice(0, 5),
      isClosed: h.is_closed,
    })),
  }
}
