import { useState, useCallback, useRef } from 'react'
import { supabase, type Ticket } from '../lib/supabase'
import { ScannerPanel } from '../components/ScannerPanel'
import { seatLabel } from '../components/SeatMap'
import { CheckCircle2, XCircle, Film, Calendar, Clock, Monitor, Armchair } from 'lucide-react'

type ScanState =
  | { type: 'idle' }
  | { type: 'success'; ticket: Ticket; showTitle: string; screenName: string; showTime: string }
  | { type: 'error'; message: string }

export default function ExitScanner() {
  const [scanState, setScanState] = useState<ScanState>({ type: 'idle' })
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerScanResult = useCallback((state: ScanState) => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    setScanState(state)
    clearTimerRef.current = setTimeout(() => {
      setScanState({ type: 'idle' })
      clearTimerRef.current = null
    }, 4000)
  }, [])

  const handleScan = useCallback(
    async (code: string) => {
      const cleanCode = code.trim().toUpperCase()

      try {
        const { data: ticket } = await supabase
          .from('tickets')
          .select('*, show:shows(*, screen:screens(*))')
          .eq('code', cleanCode)
          .maybeSingle()

        if (!ticket) {
          await supabase.from('scan_logs').insert({
            ticket_code: cleanCode,
            show_id: null,
            event_type: 'invalid',
            message: 'Unknown ticket code at exit',
          })
          triggerScanResult({ type: 'error', message: 'Unknown ticket code — not found in system.' })
          return
        }

        const t = ticket as Ticket & { show: { id: string; movie_title: string; show_time: string; status: string; screen: { id: string; name: string; capacity: number } } }

        if (t.show.status === 'ended') {
          await supabase.from('scan_logs').insert({
            ticket_code: cleanCode,
            show_id: t.show.id,
            event_type: 'invalid',
            message: 'Exit scan: show has ended',
          })
          triggerScanResult({ type: 'error', message: 'This show has already ended.' })
          return
        }

        if (t.status !== 'checked-in') {
          const reason =
            t.status === 'booked'
              ? 'Ticket was never checked in'
              : t.status === 'checked-out'
                ? 'Ticket already checked out'
                : 'Ticket marked as no-show'
          await supabase.from('scan_logs').insert({
            ticket_code: cleanCode,
            show_id: t.show.id,
            event_type: 'invalid',
            message: `Exit scan: ${reason}`,
          })
          triggerScanResult({ type: 'error', message: `${reason}. Cannot check out.` })
          return
        }

        const now = new Date().toISOString()
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ status: 'checked-out', check_out_time: now })
          .eq('id', t.id)

        if (updateError) throw updateError

        await supabase.from('scan_logs').insert({
          ticket_code: cleanCode,
          show_id: t.show.id,
          event_type: 'checkout',
          message: `Checked out: ${t.customer_name}`,
        })

        triggerScanResult({
          type: 'success',
          ticket: t,
          showTitle: t.show.movie_title,
          screenName: t.show.screen.name,
          showTime: t.show.show_time,
        })
      } catch (err) {
        triggerScanResult({
          type: 'error',
          message: err instanceof Error ? err.message : 'Scan failed.',
        })
      }
    },
    [triggerScanResult],
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-brass-50">Exit Scanner</h2>
        <p className="text-ink-400 text-sm mt-1">
          Scan any ticket QR code — the show is detected automatically
        </p>
      </div>

      <ScannerPanel onScan={handleScan} title="Exit Scanner" accentColor="blue" />

      {scanState.type !== 'idle' && <ScanResultBanner state={scanState} />}
    </div>
  )
}

function ScanResultBanner({ state }: { state: ScanState }) {
  if (state.type === 'success') {
    return (
      <div className="scan-result scan-success fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-2xl">
        <div className="bg-teal-500/15 border-2 border-teal-500 rounded-2xl px-6 py-5 shadow-2xl shadow-teal-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-9 h-9 text-teal-400" />
            </div>
            <div>
              <p className="text-xl font-display font-bold text-teal-400">Checked Out</p>
              <p className="text-brass-50 text-sm mt-0.5">{state.ticket.customer_name}</p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-ink-400 font-mono">{state.ticket.code}</p>
                {state.ticket.seat_number !== null && (
                  <span className="inline-flex items-center gap-1 text-xs text-brass-300 font-semibold">
                    <Armchair className="w-3 h-3" />
                    Seat {seatLabel(state.ticket.seat_number)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-teal-500/20">
            <div className="flex items-center gap-1.5 text-brass-200">
              <Film className="w-3.5 h-3.5 text-teal-400" />
              {state.showTitle}
            </div>
            <div className="flex items-center gap-1.5 text-brass-200">
              <Monitor className="w-3.5 h-3.5 text-teal-400" />
              {state.screenName}
            </div>
            <div className="flex items-center gap-1.5 text-ink-400">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(state.showTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-1.5 text-ink-400">
              <Clock className="w-3.5 h-3.5" />
              {new Date(state.showTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state.type === 'error') {
    return (
      <div className="scan-result scan-error fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-2xl">
        <div className="bg-red-500/15 border-2 border-red-500 rounded-2xl px-6 py-5 flex items-center gap-4 shadow-2xl shadow-red-500/20 backdrop-blur-sm">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <XCircle className="w-9 h-9 text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-display font-bold text-red-400">Denied</p>
            <p className="text-brass-50 text-sm mt-0.5">{state.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
