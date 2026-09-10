import { useEffect, useState, useCallback } from 'react'
import { supabase, type ShowWithScreen, type ShowStats } from './supabase'
import { effectiveBookingLimit } from './utils'

export async function fetchShowStats(showId: string): Promise<{
  booked: number
  checked_in: number
  checked_out: number
  no_show: number
  currently_inside: number
  available: number
  duplicate_invalid: number
}> {
  const [{ data: tickets }, { data: dupLogs }] = await Promise.all([
    supabase.from('tickets').select('status').eq('show_id', showId),
    supabase
      .from('scan_logs')
      .select('event_type, created_at')
      .eq('show_id', showId)
      .in('event_type', ['duplicate', 'invalid']),
  ])

  const t = tickets ?? []
  const booked = t.filter((x) => x.status === 'booked').length
  const checked_in = t.filter((x) => x.status === 'checked-in').length
  const checked_out = t.filter((x) => x.status === 'checked-out').length
  const no_show = t.filter((x) => x.status === 'no-show').length
  const currently_inside = checked_in
  const total_booked = booked + checked_in + checked_out + no_show

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dupToday = (dupLogs ?? []).filter((l) => new Date(l.created_at) >= today).length

  return {
    booked: total_booked,
    checked_in,
    checked_out,
    no_show,
    currently_inside,
    available: 0,
    duplicate_invalid: dupToday,
  }
}

export function useShowsWithStats(): {
  shows: ShowStats[]
  loading: boolean
  refresh: () => void
} {
  const [shows, setShows] = useState<ShowStats[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data: rawShows } = await supabase
        .from('shows')
        .select('*, screen:screens(*)')
        .order('show_time', { ascending: true })

      if (cancelled) return

      const activeShows = (rawShows ?? []) as unknown as ShowWithScreen[]
      const stats = await Promise.all(
        activeShows.map(async (show) => {
          const s = await fetchShowStats(show.id)
          return {
            show,
            booked: s.booked,
            checked_in: s.checked_in,
            checked_out: s.checked_out,
            no_show: s.no_show,
            currently_inside: s.currently_inside,
            available: effectiveBookingLimit(show.screen.capacity, show.booking_limit) - s.booked,
            duplicate_invalid: s.duplicate_invalid,
          }
        }),
      )

      if (!cancelled) {
        setShows(stats)
        setLoading(false)
      }
    }

    load()

    // Realtime subscription for tickets changes
    const channel = supabase
      .channel('shows-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        setTick((t) => t + 1)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shows' }, () => {
        setTick((t) => t + 1)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scan_logs' }, () => {
        setTick((t) => t + 1)
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [tick])

  return { shows, loading, refresh }
}
