/**
 * Small, pure formatting helpers. No dependencies, easy to test.
 */

/** "Thursday 27 August 2026" - the clinician's day header. */
export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Human interval between a past `YYYY-MM-DD` date and `now`, e.g. "today",
 * "3 days ago", "2 weeks ago", "5 months ago", "1 year ago". Coarse on purpose:
 * on the board the clinician wants the shape of the gap, not a precise count.
 */
export function formatTimeSince(dateISO: string, now: Date): string {
  const then = new Date(`${dateISO}T00:00:00`);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((startOfToday.getTime() - then.getTime()) / 86_400_000);

  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;

  const months = Math.round(days / 30);
  if (months < 24) return `${months} months ago`;
  return `${Math.round(months / 12)} years ago`;
}

/** "14:32" - clock time from an ISO timestamp, for the activity log. */
export function formatClockTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
