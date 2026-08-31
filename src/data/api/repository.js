import { ConflictError } from '@/data/errors'
import { request } from './client'

/**
 * Repository backed by the Laravel API, implementing exactly the interface
 * LocalRepository does — no store or component changes to switch.
 *
 * There are no mappers here, unlike the Supabase implementation this replaces.
 * That layer existed to translate `start_at` into `startAt` because the client
 * was reading table rows directly. This API is first-party, so its resources
 * emit the domain shape the app already speaks and the translation has nowhere
 * left to live. The seam is still the seam: the storage schema is snake_case
 * and stays behind the controller.
 *
 * The save* methods take a whole array because that is the shape the stores
 * speak, and changing it would mean rewriting every caller. The server takes
 * that array in one transaction, so a bulk save is still atomic — which is the
 * property that actually matters. Granular writes remain the better answer and
 * remain the next step.
 */
export class ApiRepository {
  async loadBookings() {
    return request('/bookings')
  }

  async saveBookings(bookings) {
    if (bookings.length === 0) return
    try {
      await request('/bookings', { method: 'PUT', body: { bookings } })
    } catch (e) {
      // The server refuses an overlap inside the transaction that writes it.
      // Surfacing it as a typed error lets the stores say "that time is taken"
      // rather than showing an operator a database message.
      if (e.status === 409) throw new ConflictError()
      throw e
    }
  }

  async loadCustomers() {
    return request('/customers')
  }

  async saveCustomers(customers) {
    if (customers.length === 0) return
    await request('/customers', { method: 'PUT', body: { customers } })
  }

  async loadCatalog() {
    return request('/catalog')
  }

  async saveCatalog(snapshot) {
    await request('/catalog', { method: 'PUT', body: snapshot })
  }

  /**
   * Not implemented on purpose. Against localStorage, reset wipes a browser;
   * against a real database it would wipe a business. Reseeding is an operator
   * task, run with `php artisan db:seed`.
   */
  async reset() {
    throw new Error('reset is only available on the local demo backend')
  }
}
