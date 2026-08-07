/**
 * Single source of truth for status → color/label mapping across the app.
 * House cards, badges, and legends all read from here instead of
 * hardcoding Tailwind classes per component.
 */

export type OccupancyStatus = 'vacant' | 'partial' | 'occupied'
export type RentBadgeStatus = 'paid' | 'partial' | 'pending' | 'advance'

interface StatusToken {
  label: string
  dot: string
  badge: string
  border: string
}

export const occupancyStatusTokens: Record<OccupancyStatus, StatusToken> = {
  occupied: {
    label: 'Occupied',
    dot: 'bg-success',
    badge: 'bg-success/15 text-success border-success/30',
    border: 'border-l-success',
  },
  partial: {
    label: 'Partially Occupied',
    dot: 'bg-warning',
    badge: 'bg-warning/15 text-warning border-warning/30',
    border: 'border-l-warning',
  },
  vacant: {
    label: 'Vacant',
    dot: 'bg-neutral',
    badge: 'bg-neutral/15 text-neutral-foreground border-neutral/30',
    border: 'border-l-neutral',
  },
}

export const rentStatusTokens: Record<RentBadgeStatus, StatusToken> = {
  paid: {
    label: 'Rent Paid',
    dot: 'bg-success',
    badge: 'bg-success/15 text-success border-success/30',
    border: 'border-l-success',
  },
  partial: {
    label: 'Partially Paid',
    dot: 'bg-warning',
    badge: 'bg-warning/15 text-warning border-warning/30',
    border: 'border-l-warning',
  },
  pending: {
    label: 'Rent Pending',
    dot: 'bg-danger',
    badge: 'bg-danger/15 text-danger border-danger/30',
    border: 'border-l-danger',
  },
  advance: {
    label: 'Advance Paid',
    dot: 'bg-info',
    badge: 'bg-info/15 text-info border-info/30',
    border: 'border-l-info',
  },
}
