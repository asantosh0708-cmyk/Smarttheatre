import type { ShowStatus, TicketStatus, ScanEventType } from '../lib/supabase'

export function ShowStatusBadge({ status }: { status: ShowStatus }) {
  const styles: Record<ShowStatus, string> = {
    scheduled: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    running: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
    ended: 'bg-ink-600 text-ink-400 border border-ink-500',
  }
  return (
    <span className={`status-badge ${styles[status]}`}>
      {status}
    </span>
  )
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    'checked-in': 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
    'checked-out': 'bg-ink-600 text-ink-400 border border-ink-500',
    'booked': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    'no-show': 'bg-ink-600 text-ink-400 border border-ink-500',
  }
  return (
    <span className={`status-badge ${styles[status]}`}>
      {status}
    </span>
  )
}

export function ScanEventBadge({ type }: { type: ScanEventType }) {
  const styles: Record<ScanEventType, string> = {
    checkin: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
    checkout: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    duplicate: 'bg-red-500/20 text-red-400 border border-red-500/30',
    invalid: 'bg-red-500/20 text-red-400 border border-red-500/30',
  }
  return (
    <span className={`status-badge ${styles[type]}`}>
      {type}
    </span>
  )
}

export function CapacityBar({
  current,
  capacity,
}: {
  current: number
  capacity: number
}) {
  const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-teal-500'
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-ink-400 mb-1">
        <span>{current} inside</span>
        <span>{capacity} capacity</span>
      </div>
      <div className="w-full h-2 bg-ink-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
