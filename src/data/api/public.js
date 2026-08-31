import { request } from './client'

/**
 * The guest paths, which are not repository operations.
 *
 * A guest does not read a table and write it back — they hand the server four
 * facts and get a reference. Routing that through `repository.saveBookings()`
 * would mean asking an anonymous visitor to PUT the entire booking list, which
 * is both absurd and refused: those writes are operator-only.
 *
 * The server computes the duration, the end time, the price and the reference
 * from the service row. Everything here is what the caller is trusted for, and
 * nothing else.
 */

/**
 * @param {{ serviceId: string, resourceId: string, startAt: string,
 *           name: string, phone: string, email?: string, notes?: string }} input
 * @returns {Promise<{ id: string, reference: string }>}
 */
export function bookPublic(input) {
  return request('/public/bookings', { method: 'POST', body: input, auth: false })
}

/** Reference plus the phone it was booked with — one factor is not enough. */
export function lookupBooking(reference, phone) {
  return request(
    `/public/bookings/${encodeURIComponent(reference)}?phone=${encodeURIComponent(phone)}`,
    {
      auth: false,
    },
  )
}

export function cancelBooking(reference, phone) {
  return request(`/public/bookings/${encodeURIComponent(reference)}/cancel`, {
    method: 'POST',
    body: { phone },
    auth: false,
  })
}
