import { format, formatDistanceToNowStrict, isSameDay, isToday, isTomorrow } from 'date-fns'
import { ar } from 'date-fns/locale'

/* Single source of truth for every user-visible number, date and time.
 * Nothing in the app hand-builds a display string. */

const currency = new Intl.NumberFormat('ar-SA', {
  style: 'currency',
  currency: 'SAR',
  maximumFractionDigits: 0,
})

/** 15000 → "١٥٠ ر.س" (minor units in, formatted currency out). */
export function money(minor) {
  return currency.format(minor / 100)
}

/** @param {string | Date} iso */
export function toDate(iso) {
  return iso instanceof Date ? iso : new Date(iso)
}

/** "١٠:٠٠ ص" */
export function time(iso) {
  return format(toDate(iso), 'h:mm a', { locale: ar })
}

/** "١٠:٠٠ ص – ١٠:٣٠ ص" */
export function timeRange(startIso, endIso) {
  return `${time(startIso)} – ${time(endIso)}`
}

/** "الأحد ٩ أغسطس" */
export function dayLabel(iso) {
  return format(toDate(iso), 'EEEE d MMMM', { locale: ar })
}

/** "الأحد ٩ أغسطس ٢٠٢٦" */
export function fullDate(iso) {
  return format(toDate(iso), 'EEEE d MMMM yyyy', { locale: ar })
}

/** "اليوم" / "غداً" / "الأحد ٩ أغسطس" — for lists mixing several days. */
export function relativeDay(iso) {
  const d = toDate(iso)
  if (isToday(d)) return 'اليوم'
  if (isTomorrow(d)) return 'غداً'
  return dayLabel(d)
}

/** "اليوم، ١٠:٠٠ ص" */
export function relativeDayTime(iso) {
  return `${relativeDay(iso)}، ${time(iso)}`
}

/** "قبل ٣ ساعات" / "خلال ٢٠ دقيقة" */
export function fromNow(iso) {
  const d = toDate(iso)
  const distance = formatDistanceToNowStrict(d, { locale: ar })
  return d.getTime() < Date.now() ? `قبل ${distance}` : `خلال ${distance}`
}

/** "٣٠ دقيقة" / "ساعة" / "ساعة و٣٠ دقيقة" */
export function duration(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  const hPart = h === 0 ? '' : h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : `${h} ساعات`
  const mPart = m === 0 ? '' : `${m} دقيقة`
  if (hPart && mPart) return `${hPart} و${mPart}`
  return hPart || mPart || '—'
}

export { isSameDay }
