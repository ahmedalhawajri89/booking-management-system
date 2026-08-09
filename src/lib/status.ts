import {
  BadgeCheck,
  CircleCheckBig,
  CircleDashed,
  CircleDotDashed,
  Clock,
  CheckCircle2,
  TriangleAlert,
  Undo2,
  UserX,
  XCircle,
} from 'lucide-vue-next'
import type { AttentionReason, BookingStatus, LucideIcon, PaymentStatus } from '@/types'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'muted'

export interface StatusMeta {
  label: string
  icon: LucideIcon
  tone: Tone
}

/* Status is never colour-alone: every consumer renders label + icon + tone. */

export const BOOKING_STATUS: Record<BookingStatus, StatusMeta> = {
  pending: { label: 'بانتظار التأكيد', icon: Clock, tone: 'warning' },
  confirmed: { label: 'مؤكد', icon: CheckCircle2, tone: 'info' },
  completed: { label: 'مكتمل', icon: CircleCheckBig, tone: 'success' },
  cancelled: { label: 'ملغي', icon: XCircle, tone: 'muted' },
  no_show: { label: 'لم يحضر', icon: UserX, tone: 'danger' },
}

export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  unpaid: { label: 'غير مدفوع', icon: CircleDashed, tone: 'neutral' },
  deposit_paid: { label: 'عربون مدفوع', icon: CircleDotDashed, tone: 'warning' },
  paid: { label: 'مدفوع', icon: BadgeCheck, tone: 'success' },
  refunded: { label: 'مسترجع', icon: Undo2, tone: 'muted' },
}

export const ATTENTION: Record<AttentionReason, { label: string; icon: LucideIcon; tone: Tone }> = {
  conflict: { label: 'تعارض في المواعيد', icon: TriangleAlert, tone: 'danger' },
  overdue_completion: { label: 'انتهى وقته ولم يُغلق', icon: Clock, tone: 'warning' },
  pending_soon: { label: 'بانتظار التأكيد وموعده قريب', icon: Clock, tone: 'warning' },
  unpaid_imminent: { label: 'غير مدفوع وموعده خلال ساعتين', icon: CircleDashed, tone: 'warning' },
}

/** Which actions make sense right now, given the booking's state. */
export function nextActions(status: BookingStatus, hasStarted: boolean): BookingStatus[] {
  switch (status) {
    case 'pending':
      return ['confirmed', 'cancelled']
    case 'confirmed':
      return hasStarted ? ['completed', 'no_show', 'cancelled'] : ['completed', 'cancelled']
    default:
      return []
  }
}
