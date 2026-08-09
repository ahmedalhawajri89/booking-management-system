import { Coffee, HeartPulse, Scissors } from 'lucide-vue-next'
import type { BusinessHours, Resource, Service } from '@/types'

export const resources: Resource[] = [
  { id: 'r1', name: 'غرفة ١', isActive: true },
  { id: 'r2', name: 'غرفة ٢', isActive: true },
]

export const services: Service[] = [
  {
    id: 's1',
    name: 'استشارة طبية متخصصة',
    description: 'جلسة استشارية شاملة مع طبيب مختص لمناقشة حالتك.',
    durationMin: 30,
    bufferMin: 10,
    priceMinor: 15000,
    resourceIds: ['r1', 'r2'],
    icon: HeartPulse,
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
    icon: Scissors,
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
    icon: Coffee,
    isActive: true,
  },
]

/** 0 = Sunday … 6 = Saturday. Hours vary by day, as they do in practice. */
export const businessHours: BusinessHours[] = [
  { weekday: 0, open: '09:00', close: '18:00', isClosed: false },
  { weekday: 1, open: '09:00', close: '18:00', isClosed: false },
  { weekday: 2, open: '09:00', close: '18:00', isClosed: false },
  { weekday: 3, open: '09:00', close: '18:00', isClosed: false },
  { weekday: 4, open: '09:00', close: '16:00', isClosed: false },
  { weekday: 5, open: '14:00', close: '20:00', isClosed: false },
  { weekday: 6, open: '10:00', close: '18:00', isClosed: false },
]

export function serviceById(id: string): Service | null {
  return services.find((s) => s.id === id) ?? null
}

export function resourceById(id: string): Resource | null {
  return resources.find((r) => r.id === id) ?? null
}
