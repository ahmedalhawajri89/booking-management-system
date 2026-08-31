import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The demo backend's conflict rule.
 *
 * It exists so the two backends agree about what is legal — a rule the API
 * enforces and the demo does not is a bug that only appears in production.
 * These tests are here because getting it slightly wrong is silent: the store
 * mutates in memory either way, so a save that never lands looks exactly like
 * a save that did until someone reloads the page.
 */

const store = new Map()

vi.stubGlobal('localStorage', {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
})

const KEY = 'bookingpro:bookings:v1'

function booking(over = {}) {
  return {
    id: 'b1',
    reference: 'BK-2030-0001',
    customerId: 'c1',
    serviceId: 's1',
    resourceId: 'r1',
    startAt: '2030-03-03T10:00:00.000Z',
    endAt: '2030-03-03T10:40:00.000Z',
    status: 'confirmed',
    paymentStatus: 'unpaid',
    priceMinor: 15000,
    channel: 'online',
    createdAt: '2030-03-01T10:00:00.000Z',
    updatedAt: '2030-03-01T10:00:00.000Z',
    history: [],
    ...over,
  }
}

/** Two bookings that genuinely overlap on the same resource. */
const CLASHING = [
  booking({ id: 'a' }),
  booking({
    id: 'b',
    startAt: '2030-03-03T10:20:00.000Z',
    endAt: '2030-03-03T11:00:00.000Z',
  }),
]

let repository
let isConflict

beforeEach(async () => {
  store.clear()
  vi.resetModules()
  const repoModule = await import('../repository')
  const errorsModule = await import('../errors')
  repository = repoModule.repository
  isConflict = errorsModule.isConflict
})

describe('the local repository refuses to introduce an overlap', () => {
  it('rejects a write that creates a conflict', async () => {
    store.set(KEY, JSON.stringify([booking({ id: 'a' })]))

    await expect(repository.saveBookings(CLASHING)).rejects.toSatisfy(isConflict)
  })

  it('leaves what was already stored untouched when it rejects', async () => {
    const original = [booking({ id: 'a' })]
    store.set(KEY, JSON.stringify(original))

    await repository.saveBookings(CLASHING).catch(() => {})

    expect(JSON.parse(store.get(KEY))).toEqual(original)
  })

  it('accepts a conflict that was already there', async () => {
    // The seed ships one deliberately, so the Today screen has something to
    // put in its needs-attention queue. Rejecting the whole list because of it
    // meant every save failed and nothing an operator did ever persisted.
    store.set(KEY, JSON.stringify(CLASHING))

    await expect(
      repository.saveBookings([...CLASHING, booking({ id: 'c', resourceId: 'r2' })]),
    ).resolves.toBeUndefined()

    expect(JSON.parse(store.get(KEY))).toHaveLength(3)
  })

  it('still rejects a second, new conflict added alongside an existing one', async () => {
    store.set(KEY, JSON.stringify(CLASHING))

    const withAnother = [
      ...CLASHING,
      booking({ id: 'c', resourceId: 'r2' }),
      booking({ id: 'd', resourceId: 'r2', startAt: '2030-03-03T10:10:00.000Z' }),
    ]

    await expect(repository.saveBookings(withAnother)).rejects.toSatisfy(isConflict)
  })

  it('lets a cancelled booking release its slot', async () => {
    store.set(KEY, JSON.stringify([booking({ id: 'a' })]))

    const released = [
      booking({ id: 'a', status: 'cancelled' }),
      booking({ id: 'b', startAt: '2030-03-03T10:20:00.000Z' }),
    ]

    await expect(repository.saveBookings(released)).resolves.toBeUndefined()
  })

  it('treats touching edges as free, matching overlaps()', async () => {
    store.set(KEY, JSON.stringify([booking({ id: 'a' })]))

    const touching = [
      booking({ id: 'a' }),
      booking({
        id: 'b',
        startAt: '2030-03-03T10:40:00.000Z',
        endAt: '2030-03-03T11:20:00.000Z',
      }),
    ]

    await expect(repository.saveBookings(touching)).resolves.toBeUndefined()
  })
})
