import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase, type ScanLog, type ShowStats } from '../lib/supabase'
import { useShowsWithStats } from '../lib/hooks'
import { ShowStatusBadge, ScanEventBadge, CapacityBar } from '../components/Badges'
import { formatTime, isToday } from '../lib/utils'
import { TicketIcon, Users, DoorOpen, AlertTriangle, Activity, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { shows, loading, refresh } = useShowsWithStats()
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([])
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    async function loadLogs() {
      const { data } = await supabase
        .from('scan_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      setScanLogs((data ?? []) as ScanLog[])
    }
    loadLogs()

    const channel = supabase
      .channel('dashboard-scan-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_logs' },
        (payload) => {
          setScanLogs((prev) => [payload.new as ScanLog, ...prev].slice(0, 10))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const totalBooked = shows.reduce((s, x) => s + x.booked, 0)
  const totalInside = shows.reduce((s, x) => s + x.currently_inside, 0)
  const totalCapacity = shows.reduce((s, x) => s + x.show.screen.capacity, 0)
  const totalAvailable = shows.reduce((s, x) => s + x.available, 0)
  const totalDupInvalid = shows.reduce((s, x) => s + x.duplicate_invalid, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brass-50">Dashboard</h2>
          <p className="text-ink-400 text-sm mt-1">Live overview of all shows and occupancy</p>
        </div>
        <button
          onClick={() => setShowClearModal(true)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Clear Data
        </button>
      </div>

      {showClearModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-ink-800 border border-ink-600 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-brass-50">Clear All Data</h3>
              <button onClick={() => setShowClearModal(false)} className="text-ink-400 hover:text-brass-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-red-400 font-semibold">Warning</p>
                  <p className="text-brass-50 mt-1">
                    This will permanently delete all tickets, scan logs, and show history.
                    Screens and shows will be preserved. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowClearModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={clearing}
                  onClick={async () => {
                    setClearing(true)
                    await supabase.from('show_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
                    await supabase.from('scan_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
                    await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
                    await supabase.from('shows').update({ status: 'scheduled' }).neq('status', 'ended')
                    setClearing(false)
                    setShowClearModal(false)
                    refresh()
                  }}
                  className="btn-danger"
                >
                  {clearing ? 'Clearing...' : 'Clear All Data'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={TicketIcon}
          label="Total Tickets Booked"
          value={totalBooked}
          accent="brass"
        />
        <SummaryCard
          icon={Users}
          label="Currently Inside"
          value={totalInside}
          accent="teal"
        />
        <SummaryCard
          icon={DoorOpen}
          label="Available Capacity"
          value={totalAvailable}
          accent="amber"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Duplicate/Invalid Today"
          value={totalDupInvalid}
          accent="red"
        />
      </div>

      {/* Active show cards */}
      <div>
        <h3 className="text-lg font-semibold text-brass-100 mb-3">Active Shows</h3>
        {loading ? (
          <p className="text-ink-400">Loading shows...</p>
        ) : shows.length === 0 ? (
          <p className="text-ink-400">No shows scheduled. Add some in Screens &amp; Shows.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {shows.map((s) => (
              <ShowCard key={s.show.id} stats={s} />
            ))}
          </div>
        )}
      </div>

      {/* Live scan feed */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-brass-400" />
          <h3 className="text-lg font-semibold text-brass-100">Recent Scan Events</h3>
          <span className="flex items-center gap-1 text-xs text-teal-400 ml-2">
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-600 text-left text-ink-400">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Message</th>
              </tr>
            </thead>
            <tbody>
              {scanLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-ink-400">
                    No scan events yet
                  </td>
                </tr>
              ) : (
                scanLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-ink-700 last:border-0 hover:bg-ink-700/50"
                  >
                    <td className="px-4 py-3 text-ink-400 whitespace-nowrap">
                      {formatTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-brass-200">{log.ticket_code}</td>
                    <td className="px-4 py-3">
                      <ScanEventBadge type={log.event_type} />
                    </td>
                    <td className="px-4 py-3 text-ink-400 hidden sm:table-cell">
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  accent: 'brass' | 'teal' | 'amber' | 'red'
}) {
  const colors = {
    brass: 'text-brass-400 border-brass-500/30',
    teal: 'text-teal-400 border-teal-500/30',
    amber: 'text-amber-400 border-amber-500/30',
    red: 'text-red-400 border-red-500/30',
  }
  return (
    <div className={`card border-l-4 ${colors[accent]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-400 uppercase tracking-wide">{label}</span>
        <Icon className={`w-5 h-5 ${colors[accent].split(' ')[0]}`} />
      </div>
      <p className="text-3xl font-display font-bold text-brass-50 mt-2">{value}</p>
    </div>
  )
}

function ShowCard({ stats }: { stats: ShowStats }) {
  const s = stats
  return (
    <div className="card-accent">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-display text-lg font-bold text-brass-50">
            {s.show.movie_title}
          </h4>
          <p className="text-sm text-ink-400">
            {s.show.screen.name} · {new Date(s.show.show_time).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <ShowStatusBadge status={s.show.status} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <Metric label="Tickets Booked" value={s.booked} color="text-brass-200" />
        <Metric label="Checked In" value={s.checked_in} color="text-teal-400" />
        <Metric label="Not Checked In" value={s.booked - s.checked_in - s.checked_out - s.no_show} color="text-amber-400" />
        <Metric label="Currently Inside" value={s.currently_inside} color="text-teal-400" />
        <Metric label="Checked Out" value={s.checked_out} color="text-ink-400" />
        <Metric label="Available" value={s.available} color="text-brass-300" />
      </div>

      <div className="mb-3">
        <CapacityBar current={s.currently_inside} capacity={s.show.screen.capacity} />
      </div>

      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          Duplicate/Invalid Attempts Today:{' '}
          <span className="text-red-400 font-semibold">{s.duplicate_invalid}</span>
        </span>
        <Link
          to="/entry"
          className="text-brass-400 hover:text-brass-300 font-medium"
        >
          Scan Entry →
        </Link>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
    </div>
  )
}
