import {
  Coffee,
  Dumbbell,
  HeartPulse,
  Scissors,
  Sparkles,
  Stethoscope,
  Wrench,
} from 'lucide-vue-next'
import type { LucideIcon } from '@/types'

/**
 * Icon registry.
 *
 * A Service carries a Vue component for its icon, which cannot survive
 * JSON — so what gets stored is a key, and this resolves it back. The moment
 * services became editable and persisted, the icon had to stop being the
 * component itself.
 *
 * Also the seam the Supabase migration needs later: a `services.icon_key text`
 * column maps straight onto this.
 */
export const SERVICE_ICONS = {
  HeartPulse,
  Stethoscope,
  Scissors,
  Sparkles,
  Coffee,
  Dumbbell,
  Wrench,
} as const

export type ServiceIconKey = keyof typeof SERVICE_ICONS

export const SERVICE_ICON_KEYS = Object.keys(SERVICE_ICONS) as ServiceIconKey[]

const FALLBACK: ServiceIconKey = 'Sparkles'

export function iconFor(key: string | undefined): LucideIcon {
  return SERVICE_ICONS[(key as ServiceIconKey) ?? FALLBACK] ?? SERVICE_ICONS[FALLBACK]
}

/** Arabic labels for the picker — the keys themselves are never shown. */
export const SERVICE_ICON_LABELS: Record<ServiceIconKey, string> = {
  HeartPulse: 'رعاية صحية',
  Stethoscope: 'عيادة',
  Scissors: 'حلاقة وتجميل',
  Sparkles: 'عناية',
  Coffee: 'ضيافة',
  Dumbbell: 'لياقة',
  Wrench: 'صيانة',
}
