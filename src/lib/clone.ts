/** Deep clone for plain, JSON-serialisable domain objects.
 *  `structuredClone` cannot clone Vue's reactive Proxy, so it is not used here. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
