/**
 * Errors the repository raises that the UI is expected to handle, as opposed
 * to network or programming failures which it only reports.
 */

/**
 * The slot was taken. Raised when the API refuses a write with 409 from
 * inside the booking transaction, or when the local backend's own conflict
 * check refuses one.
 *
 * A typed error rather than a status code or a message match: no screen
 * should be reading HTTP semantics to decide what to tell an operator.
 */
export class ConflictError extends Error {
  constructor(message = 'هذا الوقت لم يعد متاحاً — اختر وقتاً آخر') {
    super(message)
    this.name = 'ConflictError'
  }
}

export function isConflict(e) {
  return e instanceof ConflictError
}
