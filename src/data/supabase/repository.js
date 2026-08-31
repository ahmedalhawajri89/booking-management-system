import { ConflictError } from '@/data/errors'
import { ORG_ID, requireSupabase } from './client'
import { fromBooking, fromCustomer, toBooking, toCatalog, toCustomer } from './mappers'

/**
 * Repository backed by Supabase, implementing exactly the interface
 * LocalRepository does — no store or component changes to switch.
 *
 * The save* methods take a whole array because that is the shape the stores
 * already speak. That is fine for localStorage and wasteful here: it upserts
 * every row on every change. It is deliberate for this step — one commit that
 * swaps the backend and changes nothing else, so the switch can be verified
 * on its own and reverted with an env var. Granular writes come next.
 */
/** @implements {import('@/data/repository').Repository} */
export class SupabaseRepository {
  get #orgId() {
    if (!ORG_ID) throw new Error('VITE_SUPABASE_ORG_ID is not set')
    return ORG_ID
  }

  async loadBookings() {
    const { data, error } = await requireSupabase()
      .from('bookings')
      // The audit trail is a separate table; without this join every booking
      // would arrive with an empty history and look like it had none.
      .select('*, booking_events(at, type, summary)')
      .eq('org_id', this.#orgId)
      .order('start_at', { ascending: true })

    if (error) throw error
    return (data ?? []).map(toBooking)
  }

  async saveBookings(bookings) {
    if (bookings.length === 0) return
    const { error } = await requireSupabase()
      .from('bookings')
      .upsert(bookings.map((b) => fromBooking(b, this.#orgId)))

    // 23P01 is bookings_no_double_booking. Surfacing it as a typed error lets
    // the stores say "that time is taken" instead of showing a Postgres
    // constraint name to an operator.
    if (error?.code === '23P01') throw new ConflictError()
    if (error) throw error
  }

  async loadCustomers() {
    const { data, error } = await requireSupabase()
      .from('customers')
      .select('*')
      .eq('org_id', this.#orgId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []).map(toCustomer)
  }

  async saveCustomers(customers) {
    if (customers.length === 0) return
    const { error } = await requireSupabase()
      .from('customers')
      .upsert(customers.map((c) => fromCustomer(c, this.#orgId)))
    if (error) throw error
  }

  async loadCatalog() {
    const db = requireSupabase()
    const [services, resources, hours, links] = await Promise.all([
      db.from('services').select('*').eq('org_id', this.#orgId).order('sort_order'),
      db.from('resources').select('*').eq('org_id', this.#orgId).order('sort_order'),
      db.from('business_hours').select('*').eq('org_id', this.#orgId).order('weekday'),
      db.from('service_resources').select('*'),
    ])

    const failed = [services, resources, hours, links].find((r) => r.error)
    if (failed?.error) throw failed.error

    return toCatalog(services.data ?? [], resources.data ?? [], hours.data ?? [], links.data ?? [])
  }

  async saveCatalog(snapshot) {
    const db = requireSupabase()
    const org = this.#orgId

    const { error: resourceError } = await db.from('resources').upsert(
      snapshot.resources.map((r) => ({
        id: r.id,
        org_id: org,
        name: r.name,
        is_active: r.isActive,
      })),
    )
    if (resourceError) throw resourceError

    const { error: serviceError } = await db.from('services').upsert(
      snapshot.services.map((s) => ({
        id: s.id,
        org_id: org,
        name: s.name,
        description: s.description,
        duration_min: s.durationMin,
        buffer_min: s.bufferMin,
        price_minor: s.priceMinor,
        icon_key: s.iconKey,
        is_active: s.isActive,
      })),
    )
    if (serviceError) throw serviceError

    // service_resources is a set, not a row to patch: replacing it is the only
    // way an unchecked resource actually goes away.
    const serviceIds = snapshot.services.map((s) => s.id)
    if (serviceIds.length > 0) {
      const { error: clearError } = await db
        .from('service_resources')
        .delete()
        .in('service_id', serviceIds)
      if (clearError) throw clearError

      const links = snapshot.services.flatMap((s) =>
        s.resourceIds.map((rid) => ({ service_id: s.id, resource_id: rid })),
      )
      if (links.length > 0) {
        const { error: linkError } = await db.from('service_resources').insert(links)
        if (linkError) throw linkError
      }
    }

    const { error: hoursError } = await db.from('business_hours').upsert(
      snapshot.businessHours.map((h) => ({
        org_id: org,
        weekday: h.weekday,
        open_time: h.open,
        close_time: h.close,
        is_closed: h.isClosed,
      })),
    )
    if (hoursError) throw hoursError
  }

  /**
   * Not implemented on purpose. Against localStorage, reset wipes a browser;
   * against a real database it would wipe a business. Reseeding is an
   * operator task, run from supabase/seed.sql.
   */
  async reset() {
    throw new Error('reset is only available on the local demo backend')
  }
}
