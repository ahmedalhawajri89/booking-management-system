/** Short, collision-safe-enough ids for a client-side store. */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8)
  const stamp = Date.now().toString(36).slice(-4)
  return `${prefix}${stamp}${rand}`
}

/** BK-2026-0431 — human-quotable over the phone. */
export function bookingReference(year: number, sequence: number): string {
  return `BK-${year}-${String(sequence).padStart(4, '0')}`
}
