import { buildSeedBookings, customers as seedCustomers } from './seed'
import { DEFAULT_HOURS, DEFAULT_RESOURCES, DEFAULT_SERVICES } from './catalog'
import { ConflictError } from './errors'

/**
 * The seam between the UI and persistence.
 *
 * Everything above this file talks to `repository`; nothing above it knows
 * where the data lives. Which implementation that is comes from the
 * environment — see the factory at the bottom of this file.
 */
/**
 * @typedef {object} Repository
 * @property {() => Promise<import('@/types').Booking[]>} loadBookings
 * @property {(bookings: import('@/types').Booking[]) => Promise<void>} saveBookings
 * @property {() => Promise<import('@/types').Customer[]>} loadCustomers
 * @property {(customers: import('@/types').Customer[]) => Promise<void>} saveCustomers
 * @property {() => Promise<import('./catalog').CatalogSnapshot>} loadCatalog Services, resources and opening hours — everything Settings can edit.
 * @property {(snapshot: import('./catalog').CatalogSnapshot) => Promise<void>} saveCatalog
 * @property {() => Promise<void>} reset
 */

const KEY_BOOKINGS = 'bookingpro:bookings:v1'
const KEY_CUSTOMERS = 'bookingpro:customers:v1'
const KEY_CATALOG = 'bookingpro:catalog:v1'
const KEY_SEEDED_ON = 'bookingpro:seededOn:v1'

/** Simulated latency, so loading states are real rather than theoretical. */
const LATENCY_MS = 220

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or private mode — the app still works for this session */
  }
}

/** @implements {Repository} */
class LocalRepository {
  /**
   * Seed data is anchored to the day it was generated. If the stored seed is
   * from a previous day, regenerate it so "today" always has a live schedule
   * instead of decaying into an empty screen.
   */
  #ensureFresh() {
    const today = new Date().toDateString()
    if (read(KEY_SEEDED_ON) !== today || !read(KEY_BOOKINGS)) {
      write(KEY_BOOKINGS, buildSeedBookings())
      if (!read(KEY_CUSTOMERS)) write(KEY_CUSTOMERS, seedCustomers)
      write(KEY_SEEDED_ON, today)
    }
  }

  async loadBookings() {
    this.#ensureFresh()
    return delay(read(KEY_BOOKINGS) ?? [])
  }

  /**
   * Refuses to persist an overlap, so the demo backend enforces the same rule
   * bookings_no_double_booking does in Postgres. Without this the two
   * backends disagree about what is legal, and a bug would only ever show up
   * in production.
   */
  async saveBookings(bookings) {
    const blocking = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed')
    for (let i = 0; i < blocking.length; i++) {
      for (let j = i + 1; j < blocking.length; j++) {
        const a = blocking[i]
        const b = blocking[j]
        if (a.resourceId !== b.resourceId) continue
        // Half-open, matching overlaps() and the tstzrange '[)' in the schema.
        if (a.startAt < b.endAt && b.startAt < a.endAt) throw new ConflictError()
      }
    }
    write(KEY_BOOKINGS, bookings)
  }

  async loadCustomers() {
    this.#ensureFresh()
    return delay(read(KEY_CUSTOMERS) ?? seedCustomers)
  }

  async saveCustomers(customers) {
    write(KEY_CUSTOMERS, customers)
  }

  async loadCatalog() {
    const stored = read(KEY_CATALOG)
    return delay(
      stored ?? {
        services: structuredClone(DEFAULT_SERVICES),
        resources: structuredClone(DEFAULT_RESOURCES),
        businessHours: structuredClone(DEFAULT_HOURS),
      },
    )
  }

  async saveCatalog(snapshot) {
    write(KEY_CATALOG, snapshot)
  }

  async reset() {
    ;[KEY_BOOKINGS, KEY_CUSTOMERS, KEY_CATALOG, KEY_SEEDED_ON].forEach((k) =>
      localStorage.removeItem(k),
    )
  }
}

/**
 * One environment variable decides the backend.
 *
 * With VITE_SUPABASE_URL set the app talks to Postgres; without it, to
 * localStorage. That keeps the demo working with no setup, lets development
 * carry on offline, and — the reason it is a flag rather than a rewrite —
 * makes rolling back a deployment a config change instead of a revert.
 */
export const isDemoBackend = !import.meta.env.VITE_SUPABASE_URL

let active = new LocalRepository()

/**
 * Loads the Supabase implementation, and only then.
 *
 * Importing it at the top of this file cost every visitor on the demo backend
 * the whole supabase-js client — it took the bookings chunk from 49KB to
 * 275KB for code that would never run. The dynamic import keeps it in its own
 * chunk that is fetched only when the app is actually configured for it.
 *
 * Called once from main.ts before mount, so no store ever sees a half-swapped
 * backend.
 */
export async function initRepository() {
  if (isDemoBackend) return
  const { SupabaseRepository } = await import('./supabase/repository')
  active = new SupabaseRepository()
}

/**
 * Delegates rather than being reassigned: consumers import this binding once
 * at module load, so swapping the object underneath is the only way the
 * switch can happen after their import has already resolved.
 */
/** @type {Repository} */
export const repository = {
  loadBookings: () => active.loadBookings(),
  saveBookings: (b) => active.saveBookings(b),
  loadCustomers: () => active.loadCustomers(),
  saveCustomers: (c) => active.saveCustomers(c),
  loadCatalog: () => active.loadCatalog(),
  saveCatalog: (s) => active.saveCatalog(s),
  reset: () => active.reset(),
}
