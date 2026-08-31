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
   * Every pair of blocking bookings that share a resource and overlap, as
   * `id|id` keys. Half-open, matching overlaps() in src/lib/availability.js
   * and the `start_at < ? and end_at > ?` test the API runs under its lock.
   */
  static #conflictPairs(bookings) {
    const blocking = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed')
    const pairs = new Set()
    for (let i = 0; i < blocking.length; i++) {
      for (let j = i + 1; j < blocking.length; j++) {
        const a = blocking[i]
        const b = blocking[j]
        if (a.resourceId !== b.resourceId) continue
        if (a.startAt < b.endAt && b.startAt < a.endAt) {
          pairs.add([a.id, b.id].sort().join('|'))
        }
      }
    }
    return pairs
  }

  /**
   * Refuses to persist an overlap this write would *introduce*, so the demo
   * backend enforces the same rule the API enforces inside its booking
   * transaction. Without that the two backends disagree about what is legal,
   * and a bug would only ever show up in production.
   *
   * "Introduce" is load-bearing, and used not to be. Rejecting any list that
   * contained an overlap sounded stricter and was in fact useless: the seed
   * ships a deliberate conflict so the Today screen has something to put in
   * its needs-attention queue, so every save failed, and nothing an operator
   * did on the demo survived a reload. The API has never behaved that way —
   * it refuses the booking being written, not the state of the table around
   * it — and this now matches.
   */
  async saveBookings(bookings) {
    const before = LocalRepository.#conflictPairs(read(KEY_BOOKINGS) ?? [])
    for (const pair of LocalRepository.#conflictPairs(bookings)) {
      if (!before.has(pair)) throw new ConflictError()
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
 * With VITE_API_URL set the app talks to the Laravel API and MySQL; without
 * it, to localStorage. That keeps the demo working with no setup, lets
 * development carry on offline, and — the reason it is a flag rather than a
 * rewrite — makes rolling back a deployment a config change instead of a
 * revert.
 *
 * It is also what keeps the public demo alive: Vercel serves this bundle as
 * static files and cannot host PHP or MySQL, so the deployed site runs the
 * localStorage path and stays a complete, working product.
 */
export const isDemoBackend = !import.meta.env.VITE_API_URL

let active = new LocalRepository()

/**
 * Loads the API implementation, and only then.
 *
 * Kept as a dynamic import for the same reason it was one before: code that
 * will never run on the demo backend should not be in the chunk that every
 * visitor downloads.
 *
 * Called once from main.js before mount, so no store ever sees a half-swapped
 * backend.
 */
export async function initRepository() {
  if (isDemoBackend) return
  const { ApiRepository } = await import('./api/repository')
  active = new ApiRepository()
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
