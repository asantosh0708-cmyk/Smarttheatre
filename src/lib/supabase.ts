import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

export type Screen = {
  id: string
  name: string
  capacity: number
  created_at: string
}

export type ShowStatus = 'scheduled' | 'running' | 'ended'
export type TicketStatus = 'booked' | 'checked-in' | 'checked-out' | 'no-show'
export type ScanEventType = 'checkin' | 'checkout' | 'duplicate' | 'invalid'

export type Show = {
  id: string
  screen_id: string
  movie_title: string
  show_time: string
  status: ShowStatus
  booking_limit: number | null
  created_at: string
}

export type ShowWithScreen = Show & {
  screen: Screen
}

export type Ticket = {
  id: string
  code: string
  show_id: string
  customer_name: string
  status: TicketStatus
  seat_number: number | null
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
}

export type ScanLog = {
  id: string
  ticket_code: string
  show_id: string | null
  event_type: ScanEventType
  message: string
  created_at: string
}

export type ShowHistory = {
  id: string
  screen_id: string
  movie_title: string
  capacity: number
  booked_count: number
  checked_in_count: number
  ended_at: string
}

export type ShowStats = {
  show: ShowWithScreen
  booked: number
  checked_in: number
  checked_out: number
  no_show: number
  currently_inside: number
  available: number
  duplicate_invalid: number
}
