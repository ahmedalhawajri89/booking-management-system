import { reactive } from 'vue'
import { iconFor } from '@/lib/icons'

/**
 * The business's own configuration: what it sells, on what, and when.
 *
 * These are reactive arrays rather than plain constants because Settings can
 * now edit them. Roughly ten modules import `services` / `resources` /
 * `businessHours` directly; keeping the same exported references and mutating
 * in place means every one of those consumers picks up an edit without being
 * rewritten to read from a store.
 *
 * The values below are only defaults for a fresh install. The settings store
 * hydrates them from the repository at startup, and persists edits back.
 */

/**
 * The shape that survives JSON — see src/lib/icons.ts for why iconKey.
 * @typedef {Omit<import('@/types').Service, 'icon'> & { iconKey: string }} ServiceRow
 */

/**
 * @typedef {object} CatalogSnapshot
 * @property {ServiceRow[]} services
 * @property {import('@/types').Resource[]} resources
 * @property {import('@/types').BusinessHours[]} businessHours
 */

export const DEFAULT_RESOURCES = [
  { id: 'r1', name: 'غرفة ١', isActive: true },
  { id: 'r2', name: 'غرفة ٢', isActive: true },
]

export const DEFAULT_SERVICES = [
  {
    id: 's1',
    name: 'استشارة طبية متخصصة',
    description: 'جلسة استشارية شاملة مع طبيب مختص لمناقشة حالتك.',
    durationMin: 30,
    bufferMin: 10,
    priceMinor: 15000,
    resourceIds: ['r1', 'r2'],
    iconKey: 'HeartPulse',
    isActive: true,
  },
  {
    id: 's2',
    name: 'قص شعر وتصفيف VIP',
    description: 'تصفيف وقص شعر بأحدث القصات مع عناية خاصة بالفروة.',
    durationMin: 45,
    bufferMin: 15,
    priceMinor: 8000,
    resourceIds: ['r1'],
    iconKey: 'Scissors',
    isActive: true,
  },
  {
    id: 's3',
    name: 'حجز طاولة عشاء',
    description: 'حجز طاولة في القسم الهادئ مع إطلالة بانورامية وتجهيزات خاصة.',
    durationMin: 120,
    bufferMin: 30,
    priceMinor: 20000,
    resourceIds: ['r2'],
    iconKey: 'Coffee',
    isActive: true,
  },
]

/** 0 = Sunday … 6 = Saturday. Hours vary by day, as they do in practice. */
export const DEFAULT_HOURS = [
  { weekday: 0, open: '09:00', close: '18:00', isClosed: false },
  { weekday: 1, open: '09:00', close: '18:00', isClosed: false },
  { weekday: 2, open: '09:00', close: '18:00', isClosed: false },
  { weekday: 3, open: '09:00', close: '18:00', isClosed: false },
  { weekday: 4, open: '09:00', close: '16:00', isClosed: false },
  { weekday: 5, open: '14:00', close: '20:00', isClosed: false },
  { weekday: 6, open: '10:00', close: '18:00', isClosed: false },
]

/** @param {ServiceRow} row @returns {import('@/types').Service} */
export const toService = (row) => {
  const { iconKey, ...rest } = row
  return { ...rest, icon: iconFor(iconKey) }
}

/* --------------------------------------------------------------- live state */

export const services = reactive(DEFAULT_SERVICES.map(toService))
export const resources = reactive(structuredClone(DEFAULT_RESOURCES))
export const businessHours = reactive(structuredClone(DEFAULT_HOURS))

/** Replaces contents in place, so importers keep their reference.
 * @param {CatalogSnapshot} snapshot */
export function applyCatalog(snapshot) {
  services.splice(0, services.length, ...snapshot.services.map(toService))
  resources.splice(0, resources.length, ...snapshot.resources)
  businessHours.splice(0, businessHours.length, ...snapshot.businessHours)
}

export function serviceById(id) {
  return services.find((s) => s.id === id) ?? null
}

export function resourceById(id) {
  return resources.find((r) => r.id === id) ?? null
}
