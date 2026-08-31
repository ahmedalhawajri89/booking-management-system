/**
 * Errors the repository raises that the UI is expected to handle, as opposed
 * to network or programming failures which it only reports.
 */

/**
 * The slot was taken. Raised when Postgres rejects a write with 23P01
 * (bookings_no_double_booking), or when the local backend's own conflict
 * check refuses one.
 *
 * A typed error rather than a string match: the message is a Postgres
 * constraint name, and no screen should ever be parsing that.
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
