import { useEffect, useState } from 'react'
import { supabase, type Screen, type ShowHistory, type ShowWithScreen } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { BarChart3, TrendingUp, Info } from 'lucide-react'

type Prediction = {
  screen: Screen
  nextShow?: ShowWithScreen
  expectedInside: number | null
  avgAttendanceRate: number
  avgFillRate: number
  history: ShowHistory[]
}

export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [screensRes, historyRes, showsRes] = await Promise.all([
        supabase.from('screens').select('*').order('name'),
        supabase.from('show_history').select('*').order('ended_at', { ascending: false }),
        supabase
          .from('shows')
          .select('*, screen:screens(*)')
          .in('status', ['scheduled', 'running'])
          .order('show_time', { ascending: true }),
      ])

      const screens = (screensRes.data ?? []) as Screen[]
      const allHistory = (historyRes.data ?? []) as ShowHistory[]
      const allShows = (showsRes.data ?? []) as unknown as ShowWithScreen[]

      const preds: Prediction[] = screens.map((screen) => {
        const screenHistory = allHistory.filter((h) => h.screen_id === screen.id)
        const nextShow = allShows.find((s) => s.screen_id === screen.id)

        let expectedInside: number | null = null
        let avgAttendanceRate = 0
        let avgFillRate = 0

        if (screenHistory.length > 0) {
          // avg(checked_in / booked) — attendance rate
          const attendanceRates = screenHistory
            .filter((h) => h.booked_count > 0)
            .map((h) => h.checked_in_count / h.booked_count)
          avgAttendanceRate =
            attendanceRates.length > 0
              ? attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length
              : 0

          // avg(booked / capacity) — fill rate
          const fillRates = screenHistory
            .filter((h) => h.capacity > 0)
            .map((h) => h.booked_count / h.capacity)
          avgFillRate =
            fillRates.length > 0
              ? fillRates.reduce((a, b) => a + b, 0) / fillRates.length
              : 0

          // expected people inside = avg_fill_rate * avg_attendance_rate * capacity
          expectedInside = Math.round(avgFillRate * avgAttendanceRate * screen.capacity)
        }

        return {
          screen,
          nextShow,
          expectedInside,
          avgAttendanceRate,
          avgFillRate,
          history: screenHistory,
        }
      })

      setPredictions(preds)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-brass-50">Occupancy Predictions</h2>
        <p className="text-ink-400">Loading predictions...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brass-50">Occupancy Predictions</h2>
        <p className="text-ink-400 text-sm mt-1">
          Projected occupancy for upcoming shows based on historical data
        </p>
      </div>

      {/* Method explanation */}
      <div className="card-accent flex items-start gap-3">
        <Info className="w-5 h-5 text-brass-400 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-400">
          <span className="text-brass-50 font-semibold">How it works:</span>{' '}
          For each screen, we average the historical attendance rate (checked-in ÷
          booked) and fill rate (booked ÷ capacity) across all past shows, then
          project expected people inside = fill rate × attendance rate × capacity.
          This is plain historical averaging — not a black-box model.
        </p>
      </div>

      {/* Per-screen predictions */}
      <div className="space-y-4">
        {predictions.map((p) => (
          <div key={p.screen.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-brass-50">
                  {p.screen.name}
                </h3>
                <p className="text-sm text-ink-400">
                  Capacity: {p.screen.capacity}
                  {p.nextShow && (
                    <span>
                      {' '}
                      · Next show:{' '}
                      <span className="text-brass-200">{p.nextShow.movie_title}</span>{' '}
                      ({new Date(p.nextShow.show_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brass-400" />
                {p.expectedInside !== null ? (
                  <div>
                    <p className="text-xs text-ink-400">Expected Inside</p>
                    <p className="text-2xl font-display font-bold text-brass-300">
                      {p.expectedInside}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-ink-400 italic">Not enough data</p>
                )}
              </div>
            </div>

            {/* Rates */}
            {p.history.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-ink-700/50 rounded-lg px-3 py-2">
                  <p className="text-xs text-ink-400">Avg Attendance Rate</p>
                  <p className="text-lg font-display font-bold text-teal-400">
                    {(p.avgAttendanceRate * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-ink-700/50 rounded-lg px-3 py-2">
                  <p className="text-xs text-ink-400">Avg Fill Rate</p>
                  <p className="text-lg font-display font-bold text-brass-300">
                    {(p.avgFillRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            {/* History table */}
            {p.history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-600 text-left text-ink-400">
                      <th className="px-3 py-2 font-medium">Movie</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium text-right">Booked</th>
                      <th className="px-3 py-2 font-medium text-right">Checked In</th>
                      <th className="px-3 py-2 font-medium text-right">Occupancy %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.history.map((h) => (
                      <tr
                        key={h.id}
                        className="border-b border-ink-700 last:border-0"
                      >
                        <td className="px-3 py-2 text-brass-50">{h.movie_title}</td>
                        <td className="px-3 py-2 text-ink-400">{formatDate(h.ended_at)}</td>
                        <td className="px-3 py-2 text-right text-brass-200">{h.booked_count}</td>
                        <td className="px-3 py-2 text-right text-teal-400">{h.checked_in_count}</td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={
                              h.capacity > 0
                                ? (h.checked_in_count / h.capacity) * 100 >= 80
                                  ? 'text-teal-400 font-semibold'
                                  : (h.checked_in_count / h.capacity) * 100 >= 50
                                    ? 'text-amber-400'
                                    : 'text-ink-400'
                                : 'text-ink-400'
                            }
                          >
                            {h.capacity > 0
                              ? ((h.checked_in_count / h.capacity) * 100).toFixed(1) + '%'
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-ink-400 italic">
                No history yet — end a show to generate data for predictions.
              </p>
            )}
          </div>
        ))}
      </div>

      {predictions.length === 0 && (
        <div className="card flex items-center gap-3 text-ink-400">
          <BarChart3 className="w-6 h-6" />
          <p>No screens found. Add screens in Screens &amp; Shows to see predictions.</p>
        </div>
      )}
    </div>
  )
}
