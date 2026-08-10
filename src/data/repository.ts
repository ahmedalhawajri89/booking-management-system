import type { Booking, Customer } from '@/types'
import { buildSeedBookings, customers as seedCustomers } from './seed'
import {
  DEFAULT_HOURS,
  DEFAULT_RESOURCES,
  DEFAULT_SERVICES,
  type CatalogSnapshot,
} from './catalog'

/**
 * The seam between the UI and persistence.
 *
 * Everything above this file talks to `repository`; nothing above it knows
 * where the data lives. Swapping `LocalRepository` for an HTTP implementation
 * (Laravel, Supabase, anything) requires no change in any component or store.
 */
export interface Repository {
  loadBookings(): Promise<Booking[]>
  saveBookings(bookings: Booking[]): Promise<void>
  loadCustomers(): Promise<Customer[]>
  saveCustomers(customers: Customer[]): Promise<void>
  /** Services, resources and opening hours — everything Settings can edit. */
  loadCatalog(): Promise<CatalogSnapshot>
  saveCatalog(snapshot: CatalogSnapshot): Promise<void>
  reset(): Promise<void>
}

const KEY_BOOKINGS = 'bookingpro:bookings:v1'
const KEY_CUSTOMERS = 'bookingpro:customers:v1'
const KEY_CATALOG = 'bookingpro:catalog:v1'
const KEY_SEEDED_ON = 'bookingpro:seededOn:v1'

/** Simulated latency, so loading states are real rather than theoretical. */
const LATENCY_MS = 220

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or private mode — the app still works for this session */
  }
}

class LocalRepository implements Repository {
  /**
   * Seed data is anchored to the day it was generated. If the stored seed is
   * from a previous day, regenerate it so "today" always has a live schedule
   * instead of decaying into an empty screen.
   */
  private ensureFresh(): void {
    const today = new Date().toDateString()
    if (read<string>(KEY_SEEDED_ON) !== today || !read<Booking[]>(KEY_BOOKINGS)) {
      write(KEY_BOOKINGS, buildSeedBookings())
      if (!read<Customer[]>(KEY_CUSTOMERS)) write(KEY_CUSTOMERS, seedCustomers)
      write(KEY_SEEDED_ON, today)
    }
  }

  async loadBookings(): Promise<Booking[]> {
    this.ensureFresh()
    return delay(read<Booking[]>(KEY_BOOKINGS) ?? [])
  }

  async saveBookings(bookings: Booking[]): Promise<void> {
    write(KEY_BOOKINGS, bookings)
  }

  async loadCustomers(): Promise<Customer[]> {
    this.ensureFresh()
    return delay(read<Customer[]>(KEY_CUSTOMERS) ?? seedCustomers)
  }

  async saveCustomers(customers: Customer[]): Promise<void> {
    write(KEY_CUSTOMERS, customers)
  }

  async loadCatalog(): Promise<CatalogSnapshot> {
    const stored = read<CatalogSnapshot>(KEY_CATALOG)
    return delay(
      stored ?? {
        services: structuredClone(DEFAULT_SERVICES),
        resources: structuredClone(DEFAULT_RESOURCES),
        businessHours: structuredClone(DEFAULT_HOURS),
      },
    )
  }

  async saveCatalog(snapshot: CatalogSnapshot): Promise<void> {
    write(KEY_CATALOG, snapshot)
  }

  async reset(): Promise<void> {
    ;[KEY_BOOKINGS, KEY_CUSTOMERS, KEY_CATALOG, KEY_SEEDED_ON].forEach((k) =>
      localStorage.removeItem(k),
    )
  }
}

export const repository: Repository = new LocalRepository()
