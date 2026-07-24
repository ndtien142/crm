/** Pure date helpers shared by the re-service engine and tests. */

/** Add `months` to an ISO date/timestamp and return an ISO date (yyyy-mm-dd). */
export function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` until `to` (negative if `to` is in the past). */
export function daysUntil(to: string, from: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.floor(ms / 86_400_000);
}
