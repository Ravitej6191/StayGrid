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

/** Local (not UTC) YYYY-MM key for a date — used to bucket payments/expenses
 * into calendar months consistently with the date picker's local dates. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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
