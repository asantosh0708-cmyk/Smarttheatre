import { useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, type ShowWithScreen, type Ticket } from '../lib/supabase'
import { generateTicketCode, effectiveBookingLimit } from '../lib/utils'
import { SeatMap, seatLabel } from '../components/SeatMap'
import { TicketIcon, AlertCircle, CheckCircle2, Users, Armchair } from 'lucide-react'

export default function BookTickets() {
  const [shows, setShows] = useState<ShowWithScreen[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShow, setSelectedShow] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<Ticket[]>([])

  useEffect(() => {
    async function loadShows() {
      const { data } = await supabase
        .from('shows')
        .select('*, screen:screens(*)')
        .in('status', ['scheduled', 'running'])
        .order('show_time', { ascending: true })
      setShows((data ?? []) as unknown as ShowWithScreen[])
      setLoading(false)
    }
    loadShows()
  }, [])

  const handleSelectionChange = useCallback((seats: number[]) => {
    setSelectedSeats(seats)
  }, [])

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess([])

    if (!selectedShow) {
      setError('Please select a show.')
      return
    }
    if (!customerName.trim()) {
      setError('Please enter a customer name.')
      return
    }
    if (selectedSeats.length === 0) {
      setError('Please select at least one seat.')
      return
    }

    const show = shows.find((s) => s.id === selectedShow)
    if (!show) {
      setError('Invalid show selected.')
      return
    }

    setBooking(true)

    try {
      // Re-check seats are still available (race condition guard)
      const { data: existing } = await supabase
        .from('tickets')
        .select('seat_number')
        .eq('show_id', selectedShow)
        .in('seat_number', selectedSeats)
        .not('seat_number', 'is', null)

      if (existing && existing.length > 0) {
        const taken = existing.map((t) => t.seat_number).join(', ')
        setError(`Seat(s) ${taken} were just booked by someone else. Please choose different seats.`)
        setBooking(false)
        return
      }

      const ticketsToInsert: Omit<Ticket, 'id' | 'created_at'>[] = selectedSeats.map((seat) => ({
        code: generateTicketCode(),
        show_id: selectedShow,
        customer_name: customerName.trim(),
        status: 'booked',
        seat_number: seat,
        check_in_time: null,
        check_out_time: null,
      }))

      const { data: inserted, error: insertError } = await supabase
        .from('tickets')
        .insert(ticketsToInsert)
        .select('*')

      if (insertError) {
        if (insertError.code === '23505') {
          setError('One or more seats were just booked by someone else. Please refresh and try again.')
        } else {
          throw insertError
        }
        setBooking(false)
        return
      }

      setSuccess((inserted ?? []) as Ticket[])
      setCustomerName('')
      setSelectedSeats([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book tickets.')
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-brass-50">Book Tickets</h2>
        <p className="text-ink-400 text-sm mt-1">
          Pick seats from the theatre layout and generate tickets with unique QR codes
        </p>
      </div>

      {/* Show selector */}
      <div className="card space-y-4">
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Show</label>
          {loading ? (
            <p className="text-ink-400 text-sm">Loading shows...</p>
          ) : shows.length === 0 ? (
            <p className="text-amber-400 text-sm">
              No active shows available. Schedule one in Screens &amp; Shows first.
            </p>
          ) : (
            <select
              value={selectedShow}
              onChange={(e) => {
                setSelectedShow(e.target.value)
                setSelectedSeats([])
                setSuccess([])
                setError('')
              }}
              className="input-field"
            >
              <option value="">Select a show...</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.movie_title} — {s.screen.name} (
                  {new Date(s.show_time).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedShow && (() => {
          const show = shows.find((s) => s.id === selectedShow)
          if (!show) return null
          const maxBookable = effectiveBookingLimit(show.screen.capacity, show.booking_limit)
          return (
            <div className="flex items-center gap-2 text-sm text-brass-300 bg-brass-500/10 border border-brass-500/30 rounded-lg px-4 py-2.5">
              <Users className="w-4 h-4" />
              {show.booking_limit !== null
                ? `Booking limit: ${maxBookable} seats (screen capacity: ${show.screen.capacity})`
                : `Screen capacity: ${maxBookable} seats`}
            </div>
          )
        })()}
      </div>

      {/* Seat map + booking form */}
      {selectedShow && (() => {
        const show = shows.find((s) => s.id === selectedShow)
        if (!show) return null
        return (
          <form onSubmit={handleBooking} className="space-y-4">
            <SeatMap
              showId={selectedShow}
              capacity={show.screen.capacity}
              bookingLimit={show.booking_limit}
              onSelectionChange={handleSelectionChange}
            />

            <div className="card space-y-4">
              <div>
                <label className="block text-sm text-ink-400 mb-1.5">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="input-field"
                  maxLength={100}
                />
              </div>

              {selectedSeats.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-brass-300 bg-brass-500/10 border border-brass-500/30 rounded-lg px-4 py-2.5">
                  <Armchair className="w-4 h-4" />
                  <span>
                    {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} selected:{' '}
                    <span className="font-mono font-semibold">{selectedSeats.map((s) => seatLabel(s)).join(', ')}</span>
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={booking || selectedSeats.length === 0 || !customerName.trim()}
                className="btn-primary flex items-center gap-2"
              >
                <TicketIcon className="w-4 h-4" />
                {booking ? 'Booking...' : `Book ${selectedSeats.length || ''} Ticket${selectedSeats.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        )
      })()}

      {/* Success — individual ticket cards with QR codes and seat numbers */}
      {success.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-teal-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Booking Successful</h3>
            <span className="text-sm text-ink-400 ml-2">
              {success.length} ticket{success.length > 1 ? 's' : ''} · {success.length} member{success.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {success.map((ticket, idx) => {
              const show = shows.find((s) => s.id === ticket.show_id)
              return (
                <div
                  key={ticket.id}
                  className="card flex flex-col items-center text-center"
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-xs text-ink-400 uppercase tracking-wide">
                      Ticket {idx + 1} of {success.length}
                    </span>
                    <span className="text-xs text-teal-400 font-semibold">Booked</span>
                  </div>
                  {ticket.seat_number !== null && (
                    <div className="mb-3 inline-flex items-center gap-1.5 bg-brass-500/15 border border-brass-500/30 rounded-full px-3 py-1">
                      <Armchair className="w-3.5 h-3.5 text-brass-400" />
                      <span className="text-sm font-bold text-brass-300">
                        Seat {seatLabel(ticket.seat_number)}
                      </span>
                    </div>
                  )}
                  <div className="bg-white p-3 rounded-lg mb-3">
                    <QRCodeSVG value={ticket.code} size={140} level="M" />
                  </div>
                  <p className="font-mono text-lg font-bold text-brass-300 tracking-wider">
                    {ticket.code}
                  </p>
                  <p className="text-sm text-brass-50 mt-1">{ticket.customer_name}</p>
                  {show && (
                    <>
                      <p className="text-sm text-brass-200 mt-1 font-medium">{show.movie_title}</p>
                      <p className="text-xs text-ink-400 mt-0.5">{show.screen.name}</p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {new Date(show.show_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })} ·{' '}
                        {new Date(show.show_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
