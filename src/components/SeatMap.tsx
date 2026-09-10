import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const SEATS_PER_ROW = 20
const LEFT_SECTION = 5
const MIDDLE_SECTION = 10
const RIGHT_SECTION = 5
const MAX_SELECT = 20

export function seatLabel(seat: number): string {
  const rowIdx = Math.floor((seat - 1) / SEATS_PER_ROW)
  const posInRow = (seat - 1) % SEATS_PER_ROW
  return `${String.fromCharCode(65 + rowIdx)}${posInRow + 1}`
}

function rowLabel(rowIdx: number): string {
  return String.fromCharCode(65 + rowIdx)
}

export function SeatMap({
  showId,
  capacity,
  bookingLimit,
  onSelectionChange,
}: {
  showId: string
  capacity: number
  bookingLimit: number | null
  onSelectionChange: (seats: number[]) => void
}) {
  const [occupiedSeats, setOccupiedSeats] = useState<Set<number>>(new Set())
  const [selectedSeats, setSelectedSeats] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  const maxBookable = bookingLimit !== null ? Math.min(bookingLimit, capacity) : capacity

  useEffect(() => {
    setSelectedSeats(new Set())
    onSelectionChange([])
    setLoading(true)

    async function loadSeats() {
      const { data } = await supabase
        .from('tickets')
        .select('seat_number')
        .eq('show_id', showId)
        .not('seat_number', 'is', null)
      const occupied = new Set<number>((data ?? []).map((t) => t.seat_number as number))
      setOccupiedSeats(occupied)
      setLoading(false)
    }
    loadSeats()

    const channel = supabase
      .channel(`seats-${showId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `show_id=eq.${showId}` },
        () => loadSeats(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showId, onSelectionChange])

  const toggleSeat = (seat: number) => {
    if (occupiedSeats.has(seat)) return
    const next = new Set(selectedSeats)
    if (next.has(seat)) {
      next.delete(seat)
    } else {
      if (next.size >= MAX_SELECT) return
      next.add(seat)
    }
    setSelectedSeats(next)
    onSelectionChange(Array.from(next).sort((a, b) => a - b))
  }

  const availableCount = maxBookable - occupiedSeats.size

  // Build rows of 20 seats: [5 left] gap [10 middle] gap [5 right]
  const rows: number[][] = []
  for (let i = 1; i <= capacity; i += SEATS_PER_ROW) {
    const row: number[] = []
    for (let j = i; j < Math.min(i + SEATS_PER_ROW, capacity + 1); j++) {
      row.push(j)
    }
    rows.push(row)
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <p className="text-ink-400 text-sm">Loading seat map...</p>
      </div>
    )
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-brass-100 uppercase tracking-wide">
          Select Seats
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-ink-400">
            <span className="w-3.5 h-3.5 rounded bg-ink-700 border border-ink-600" />
            Available
          </span>
          <span className="flex items-center gap-1.5 text-brass-300">
            <span className="w-3.5 h-3.5 rounded bg-brass-500/40 border border-brass-500" />
            Selected
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-3.5 h-3.5 rounded bg-red-500/30 border border-red-500/50" />
            Taken
          </span>
        </div>
      </div>

      {/* Screen indicator */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-full max-w-lg h-3 bg-gradient-to-b from-brass-400/50 via-brass-500/20 to-transparent rounded-t-[3rem] shadow-lg shadow-brass-500/10" />
        <p className="text-xs text-ink-500 uppercase tracking-[0.3em] font-medium">Screen</p>
      </div>

      {/* Seat grid */}
      <div className="space-y-2.5 overflow-x-auto pb-2 px-1">
        {rows.map((row, rowIdx) => {
          const left = row.slice(0, LEFT_SECTION)
          const middle = row.slice(LEFT_SECTION, LEFT_SECTION + MIDDLE_SECTION)
          const right = row.slice(LEFT_SECTION + MIDDLE_SECTION, LEFT_SECTION + MIDDLE_SECTION + RIGHT_SECTION)
          return (
            <div key={rowIdx} className="flex items-center justify-center gap-1">
              {/* Row label */}
              <span className="w-6 text-center text-xs font-bold text-ink-500 shrink-0">
                {rowLabel(rowIdx)}
              </span>

              {/* Left section */}
              <div className="flex gap-1">
                {left.map((seat) => (
                  <SeatButton
                    key={seat}
                    seat={seat}
                    label={seatLabel(seat)}
                    isOccupied={occupiedSeats.has(seat)}
                    isSelected={selectedSeats.has(seat)}
                    onClick={toggleSeat}
                  />
                ))}
              </div>

              {/* Aisle gap */}
              <div className="w-4 sm:w-6 shrink-0" />

              {/* Middle section */}
              <div className="flex gap-1">
                {middle.map((seat) => (
                  <SeatButton
                    key={seat}
                    seat={seat}
                    label={seatLabel(seat)}
                    isOccupied={occupiedSeats.has(seat)}
                    isSelected={selectedSeats.has(seat)}
                    onClick={toggleSeat}
                  />
                ))}
              </div>

              {/* Aisle gap */}
              <div className="w-4 sm:w-6 shrink-0" />

              {/* Right section */}
              <div className="flex gap-1">
                {right.map((seat) => (
                  <SeatButton
                    key={seat}
                    seat={seat}
                    label={seatLabel(seat)}
                    isOccupied={occupiedSeats.has(seat)}
                    isSelected={selectedSeats.has(seat)}
                    onClick={toggleSeat}
                  />
                ))}
              </div>

              {/* Row label */}
              <span className="w-6 text-center text-xs font-bold text-ink-500 shrink-0">
                {rowLabel(rowIdx)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between pt-3 border-t border-ink-600">
        <span className="text-sm text-ink-400">
          {availableCount} seat{availableCount !== 1 ? 's' : ''} available
          {selectedSeats.size > 0 && (
            <span className="text-brass-300 ml-2">
              · {selectedSeats.size} selected
            </span>
          )}
        </span>
        {selectedSeats.size > 0 && (
          <span className="text-xs font-mono text-brass-200">
            {Array.from(selectedSeats).sort((a, b) => a - b).map((s) => seatLabel(s)).join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}

function SeatButton({
  seat,
  label,
  isOccupied,
  isSelected,
  onClick,
}: {
  seat: number
  label: string
  isOccupied: boolean
  isSelected: boolean
  onClick: (seat: number) => void
}) {
  return (
    <button
      type="button"
      disabled={isOccupied}
      onClick={() => onClick(seat)}
      className={`
        w-7 h-7 sm:w-8 sm:h-8 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-150
        ${isOccupied
          ? 'bg-red-500/20 border border-red-500/40 text-red-400/60 cursor-not-allowed'
          : isSelected
            ? 'bg-brass-500/40 border border-brass-500 text-brass-50 scale-110 shadow-md shadow-brass-500/30'
            : 'bg-ink-700 border border-ink-600 text-ink-300 hover:border-brass-500/50 hover:bg-ink-600 hover:text-brass-200'
        }
      `}
      title={isOccupied ? `${label} — taken` : label}
    >
      {label}
    </button>
  )
}
