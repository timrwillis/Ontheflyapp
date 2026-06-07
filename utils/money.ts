// All money is stored as integer cents (e.g. 3550 = $35.50).
// Never use Number(input) directly — parse via parseMoneyInput.
// Never read shift.hourly_pay (decimal legacy) — read shift.hourly_pay_cents (integer).

/**
 * Convert integer cents to a display string.
 * 3550 → "$35.50"  |  3500 → "$35"  |  0 → "$0"
 * Pass showDecimals: true to always show two decimal places.
 */
export function formatMoney(cents: number, opts?: { showDecimals?: boolean }): string {
  if (!Number.isFinite(cents)) return '$—';
  const forceDecimals = opts?.showDecimals ?? false;
  const hasCents = cents % 100 !== 0;
  const dollars = cents / 100;
  if (forceDecimals || hasCents) {
    return `$${dollars.toFixed(2)}`;
  }
  return `$${Math.round(dollars)}`;
}

/**
 * Convert integer cents to a per-hour display string.
 * 3550 → "$35.50/hr"  |  2500 → "$25/hr"
 */
export function formatHourlyRate(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return '$—/hr';
  return `${formatMoney(cents)}/hr`;
}

/**
 * Parse a user-typed money string into integer cents.
 * Accepts "35", "35.50", "$35", "$ 35.50", "35,00" etc.
 * Returns 0 for empty/blank input.
 * Returns null if the string is unparseable (e.g. "abc").
 */
export function parseMoneyInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return 0;
  // Strip $, spaces, commas
  const cleaned = trimmed.replace(/[$\s,]/g, '');
  if (cleaned === '') return 0;
  const val = parseFloat(cleaned);
  if (isNaN(val) || !isFinite(val)) return null;
  return Math.round(val * 100);
}

/**
 * Return true if cents is in a reasonable range for hourly pay.
 * Valid range: $1.00 – $500.00 → 100 – 50000 cents.
 */
export function isValidHourlyRate(cents: number): boolean {
  return Number.isInteger(cents) && cents >= 100 && cents <= 50000;
}

if (__DEV__ && false) {
  console.log('[Money] formatMoney(3550):', formatMoney(3550));           // "$35.50"
  console.log('[Money] formatHourlyRate(2500):', formatHourlyRate(2500)); // "$25/hr"
  console.log('[Money] parseMoneyInput("$35.50"):', parseMoneyInput('$35.50')); // 3550
  console.log('[Money] parseMoneyInput(""):', parseMoneyInput(''));        // 0
  console.log('[Money] parseMoneyInput("abc"):', parseMoneyInput('abc')); // null
  console.log('[Money] isValidHourlyRate(100):', isValidHourlyRate(100)); // true
  console.log('[Money] isValidHourlyRate(50):', isValidHourlyRate(50));   // false (< $1)
}
