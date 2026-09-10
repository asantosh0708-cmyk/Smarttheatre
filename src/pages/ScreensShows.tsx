import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase, type ShowWithScreen, type Screen } from '../lib/supabase'
import { useShowsWithStats } from '../lib/hooks'
import { ShowStatusBadge, CapacityBar } from '../components/Badges'
import { Film, Plus, AlertTriangle, CheckCircle2, X, Users } from 'lucide-react'

export default function ScreensShows() {
  const { shows, loading, refresh } = useShowsWithStats()
  const [screens, setScreens] = useState<Screen[]>([])
  const [showAddScreen, setShowAddScreen] = useState(false)
  const [showAddShow, setShowAddShow] = useState(false)
  const [endingShow, setEndingShow] = useState<string | null>(null)

  const loadScreens = useCallback(async () => {
    const { data } = await supabase.from('screens').select('*').order('name')
    setScreens((data ?? []) as Screen[])
  }, [])

  useEffect(() => {
    loadScreens()
  }, [loadScreens])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brass-50">Screens &amp; Shows</h2>
        <p className="text-ink-400 text-sm mt-1">
          Manage theatre screens, schedule shows, and end active shows
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowAddScreen(true)}
          className="btn-secondary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Screen
        </button>
        <button
          onClick={() => setShowAddShow(true)}
          className="btn-secondary flex items-center gap-2"
          disabled={screens.length === 0}
        >
          <Plus className="w-4 h-4" />
          Schedule Show
        </button>
      </div>

      {/* Shows list */}
      <div>
        <h3 className="text-lg font-semibold text-brass-100 mb-3">All Shows</h3>
        {loading ? (
          <p className="text-ink-400">Loading shows...</p>
        ) : shows.length === 0 ? (
          <p className="text-ink-400">No shows yet. Schedule one to get started.</p>
        ) : (
          <div className="space-y-3">
            {shows.map((s) => (
              <div key={s.show.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Film className="w-5 h-5 text-brass-400" />
                      <h4 className="font-display text-lg font-bold text-brass-50">
                        {s.show.movie_title}
                      </h4>
                      <ShowStatusBadge status={s.show.status} />
                    </div>
                    <p className="text-sm text-ink-400">
                      {s.show.screen.name} ·{' '}
                      {new Date(s.show.show_time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {s.show.booking_limit !== null && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-brass-300">
                        <Users className="w-3.5 h-3.5" />
                        Booking limit: {s.show.booking_limit} / {s.show.screen.capacity} seats
                      </div>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
                      <Stat label="Booked" value={s.booked} color="text-brass-200" />
                      <Stat label="Checked In" value={s.checked_in} color="text-teal-400" />
                      <Stat label="Inside" value={s.currently_inside} color="text-teal-400" />
                      <Stat label="Checked Out" value={s.checked_out} color="text-ink-400" />
                      <Stat label="No-Show" value={s.no_show} color="text-ink-400" />
                    </div>
                    <div className="mt-3 max-w-md">
                      <CapacityBar
                        current={s.currently_inside}
                        capacity={s.show.screen.capacity}
                      />
                    </div>
                  </div>
                  <div className="shrink-0">
                    {s.show.status !== 'ended' && (
                      <button
                        onClick={() => setEndingShow(s.show.id)}
                        className="btn-danger text-sm"
                      >
                        End Show
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddScreen && (
        <AddScreenModal
          onClose={() => setShowAddScreen(false)}
          onSaved={() => {
            loadScreens()
            setShowAddScreen(false)
          }}
        />
      )}
      {showAddShow && (
        <AddShowModal
          screens={screens}
          onClose={() => setShowAddShow(false)}
          onSaved={() => {
            refresh()
            setShowAddShow(false)
          }}
        />
      )}
      {endingShow && (
        <EndShowModal
          showId={endingShow}
          shows={shows}
          onClose={() => setEndingShow(null)}
          onEnded={() => {
            setEndingShow(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function Stat({
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
      <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-ink-800 border border-ink-600 rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-bold text-brass-50">{title}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-brass-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function AddScreenModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState(100)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Screen name is required.')
      return
    }
    if (capacity < 1) {
      setError('Capacity must be at least 1.')
      return
    }
    setSaving(true)
    setError('')
    const { error: insertError } = await supabase
      .from('screens')
      .insert({ name: name.trim(), capacity })
    if (insertError) {
      setError(insertError.message)
      setSaving(false)
    } else {
      onSaved()
    }
  }

  return (
    <Modal title="Add New Screen" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Screen Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Screen 3 — IMAX"
            className="input-field"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Capacity</label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
            min={1}
            className="input-field w-32"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Add Screen'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AddShowModal({
  screens,
  onClose,
  onSaved,
}: {
  screens: Screen[]
  onClose: () => void
  onSaved: () => void
}) {
  const [screenId, setScreenId] = useState('')
  const [movieTitle, setMovieTitle] = useState('')
  const [showTime, setShowTime] = useState('')
  const [bookingLimit, setBookingLimit] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedScreen = screens.find((s) => s.id === screenId)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!screenId) {
      setError('Please select a screen.')
      return
    }
    if (!movieTitle.trim()) {
      setError('Movie title is required.')
      return
    }
    if (!showTime) {
      setError('Show time is required.')
      return
    }

    let limit: number | null = null
    if (bookingLimit.trim() !== '') {
      limit = parseInt(bookingLimit)
      if (isNaN(limit) || limit <= 0) {
        setError('Booking limit must be a positive number.')
        return
      }
      if (selectedScreen && limit > selectedScreen.capacity) {
        setError(`Booking limit cannot exceed screen capacity (${selectedScreen.capacity}).`)
        return
      }
    }

    setSaving(true)
    setError('')
    const { error: insertError } = await supabase.from('shows').insert({
      screen_id: screenId,
      movie_title: movieTitle.trim(),
      show_time: new Date(showTime).toISOString(),
      status: 'scheduled',
      booking_limit: limit,
    })
    if (insertError) {
      setError(insertError.message)
      setSaving(false)
    } else {
      onSaved()
    }
  }

  return (
    <Modal title="Schedule New Show" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Screen</label>
          <select
            value={screenId}
            onChange={(e) => {
              setScreenId(e.target.value)
              setBookingLimit('')
            }}
            className="input-field"
          >
            <option value="">Select a screen...</option>
            {screens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (cap. {s.capacity})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Movie Title</label>
          <input
            type="text"
            value={movieTitle}
            onChange={(e) => setMovieTitle(e.target.value)}
            placeholder="e.g. Dune: Part Two"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Show Time</label>
          <input
            type="datetime-local"
            value={showTime}
            onChange={(e) => setShowTime(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">
            Booking Limit {selectedScreen && `(max ${selectedScreen.capacity})`}
          </label>
          <input
            type="number"
            value={bookingLimit}
            onChange={(e) => setBookingLimit(e.target.value)}
            placeholder={selectedScreen ? `Defaults to screen capacity (${selectedScreen.capacity})` : 'Enter limit...'}
            min={1}
            max={selectedScreen?.capacity}
            className="input-field w-32"
          />
          <p className="text-xs text-ink-400 mt-1">
            Maximum tickets that can be booked for this show. Leave blank to use full screen capacity.
          </p>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Scheduling...' : 'Schedule Show'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EndShowModal({
  showId,
  shows,
  onClose,
  onEnded,
}: {
  showId: string
  shows: ReturnType<typeof useShowsWithStats>['shows']
  onClose: () => void
  onEnded: () => void
}) {
  const show = shows.find((s) => s.show.id === showId)
  const [ending, setEnding] = useState(false)

  async function handleEnd() {
    setEnding(true)
    try {
      // 1. Convert remaining "booked" tickets to "no-show"
      await supabase
        .from('tickets')
        .update({ status: 'no-show' })
        .eq('show_id', showId)
        .eq('status', 'booked')

      // 2. Write show_history snapshot
      if (show) {
        await supabase.from('show_history').insert({
          screen_id: show.show.screen_id,
          movie_title: show.show.movie_title,
          capacity: show.show.screen.capacity,
          booked_count: show.booked,
          checked_in_count: show.checked_in,
        })
      }

      // 3. Set show status to "ended"
      await supabase.from('shows').update({ status: 'ended' }).eq('id', showId)

      onEnded()
    } catch {
      setEnding(false)
    }
  }

  if (!show) return null

  return (
    <Modal title="End Show" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-400 font-semibold">Warning</p>
            <p className="text-brass-50 mt-1">
              Ending this show will lock further scans. Any tickets still in
              "booked" status will be converted to "no-show".
            </p>
            {show.currently_inside > 0 && (
              <p className="text-amber-400 mt-2">
                {show.currently_inside} people are currently inside — the
                checked-in count ({show.checked_in}) will be preserved in history.
              </p>
            )}
          </div>
        </div>

        <div className="text-sm text-ink-400 space-y-1">
          <p>
            <span className="text-brass-50 font-semibold">{show.show.movie_title}</span>
          </p>
          <p>Booked: {show.booked} · Checked In: {show.checked_in} · Inside: {show.currently_inside}</p>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleEnd}
            disabled={ending}
            className="btn-danger flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {ending ? 'Ending...' : 'Confirm End Show'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
