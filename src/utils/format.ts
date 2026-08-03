const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value)
}

/** Strips non-digit characters and truncates to maxLength — used by phone/
 * pincode/OTP-style inputs that must stay numeric as the user types. */
export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

/** Formats a 12-digit Aadhaar number as `XXXX-XXXX-XXXX`, the standard
 * grouping — works on both a raw 12-digit string (DB storage/display) and
 * partial input as the user types. */
export function formatAadhaar(value: string): string {
  const digits = digitsOnly(value, 12)
  return digits.replace(/(\d{4})(?=\d)/g, '$1-')
}

/** Local (not UTC) YYYY-MM key for a date — used to bucket payments/expenses
 * into calendar months consistently with the date picker's local dates. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Same YYYY-MM bucketing as `monthKey`, but for an ISO date *string*
 * (e.g. a payment/expense date already in `YYYY-MM-DD` form) — avoids a
 * redundant Date parse/reformat round trip. */
export function monthKeyOfDateString(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const datePart = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const hours24 = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const period = hours24 < 12 ? 'am' : 'pm'
  const hours12 = hours24 % 12 || 12
  return `${datePart}, ${hours12}:${minutes} ${period}`
}

/** Formats a calendar date with no time component — use this for `date`
 * columns (joining/vacating/expense/payment dates) instead of
 * `formatDateTime`. A plain `YYYY-MM-DD` string has no real time of day, but
 * `new Date('YYYY-MM-DD')` parses it as UTC midnight — in IST that becomes
 * 5:30am, so `formatDateTime` would render a bogus "5:30 am" on every one of
 * these. Parsing the parts directly as a local date sidesteps that. */
export function formatDate(value: string | Date): string {
  let date: Date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    date = new Date(year!, month! - 1, day!)
  } else {
    date = typeof value === 'string' ? new Date(value) : value
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
