// Helpers for combining the backend's separate date + HH:MM time string fields.
// Backend stores: shifts.date = "2026-06-04", shifts.start_time = "18:30"
// Do not call new Date(start_time) directly — "HH:MM" is not a valid Date string.

function buildDate(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  try {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Combine shift.date + shift.start_time into a Date. Returns null if missing or unparseable. */
export function getShiftStart(shift: { date?: string; start_time?: string }): Date | null {
  return buildDate(shift.date ?? '', shift.start_time ?? '');
}

/**
 * Combine shift.date + shift.end_time into a Date.
 * If end_time < start_time (HH:MM string compare), the shift is overnight and end is next day.
 * Returns null if any required field is missing or unparseable.
 */
export function getShiftEnd(
  shift: { date?: string; start_time?: string; end_time?: string },
): Date | null {
  const dateStr = shift.date ?? '';
  const startTime = shift.start_time ?? '';
  const endTime = shift.end_time ?? '';
  const end = buildDate(dateStr, endTime);
  if (!end) return null;
  if (endTime < startTime) {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

/**
 * Format a Date relative to now.
 * "in 2h 15m" | "in 45m" | "starting now" (±60s) | "started 10m ago"
 */
export function formatRelativeTime(date: Date): string {
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);

  if (Math.abs(diffSec) <= 60) {
    return 'starting now';
  }

  if (diffSec > 0) {
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) {
      return `in ${diffMin}m`;
    }
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  }

  const diffMin = Math.round(-diffSec / 60);
  if (diffMin < 60) {
    return `started ${diffMin}m ago`;
  }
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `started ${h}h ${m}m ago` : `started ${h}h ago`;
}

/** Format a Date as local 12-hour time: "6:30 PM", "12:00 AM" */
export function formatAbsoluteTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
