/*
# ReelCount — Theatre Occupancy & Ticket Management Schema

## Overview
Creates the full data model for ReelCount, an AI-based smart theatre occupancy
and ticket management system. This is a single-tenant app with no sign-in screen,
so all policies allow anon + authenticated access.

## New Tables

1. **screens** — Physical theatre screens/auditoriums
   - `id` (uuid, PK)
   - `name` (text) — e.g. "Screen 1"
   - `capacity` (int) — max seats in the auditorium
   - `created_at` (timestamptz)

2. **shows** — Movie showings scheduled on a screen
   - `id` (uuid, PK)
   - `screen_id` (uuid, FK → screens)
   - `movie_title` (text)
   - `show_time` (timestamptz) — when the show starts
   - `status` (text) — 'scheduled' | 'running' | 'ended'
   - `created_at` (timestamptz)

3. **tickets** — Individual bookable tickets with QR codes
   - `id` (uuid, PK)
   - `code` (text, unique) — short alphanumeric string used as QR payload
   - `show_id` (uuid, FK → shows)
   - `customer_name` (text)
   - `status` (text) — 'booked' | 'checked-in' | 'checked-out' | 'no-show'
   - `check_in_time` (timestamptz, nullable)
   - `check_out_time` (timestamptz, nullable)
   - `created_at` (timestamptz)

4. **scan_logs** — Audit trail of every scan event
   - `id` (uuid, PK)
   - `ticket_code` (text)
   - `show_id` (uuid, nullable, FK → shows)
   - `event_type` (text) — 'checkin' | 'checkout' | 'duplicate' | 'invalid'
   - `message` (text)
   - `created_at` (timestamptz)

5. **show_history** — Snapshot of show stats when a show ends (for occupancy prediction)
   - `id` (uuid, PK)
   - `screen_id` (uuid, FK → screens)
   - `movie_title` (text)
   - `capacity` (int)
   - `booked_count` (int)
   - `checked_in_count` (int)
   - `ended_at` (timestamptz)

## Security
- RLS enabled on ALL tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant app with no sign-in — all data is intentionally
  shared/public across the theatre staff using the app.

## Important Notes
1. Ticket codes are unique short alphanumeric strings used as QR payloads.
2. show_history rows are written automatically when a show is ended (by the app).
3. scan_logs captures every scan attempt including duplicates and invalid codes.
*/

-- screens
CREATE TABLE IF NOT EXISTS screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity int NOT NULL CHECK (capacity > 0),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_screens" ON screens;
CREATE POLICY "anon_select_screens" ON screens FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_screens" ON screens;
CREATE POLICY "anon_insert_screens" ON screens FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_screens" ON screens;
CREATE POLICY "anon_update_screens" ON screens FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_screens" ON screens;
CREATE POLICY "anon_delete_screens" ON screens FOR DELETE
  TO anon, authenticated USING (true);

-- shows
CREATE TABLE IF NOT EXISTS shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  movie_title text NOT NULL,
  show_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','running','ended')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_shows" ON shows;
CREATE POLICY "anon_select_shows" ON shows FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_shows" ON shows;
CREATE POLICY "anon_insert_shows" ON shows FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_shows" ON shows;
CREATE POLICY "anon_update_shows" ON shows FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_shows" ON shows;
CREATE POLICY "anon_delete_shows" ON shows FOR DELETE
  TO anon, authenticated USING (true);

-- tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  show_id uuid NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','checked-in','checked-out','no-show')),
  check_in_time timestamptz,
  check_out_time timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tickets" ON tickets;
CREATE POLICY "anon_select_tickets" ON tickets FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tickets" ON tickets;
CREATE POLICY "anon_insert_tickets" ON tickets FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tickets" ON tickets;
CREATE POLICY "anon_update_tickets" ON tickets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tickets" ON tickets;
CREATE POLICY "anon_delete_tickets" ON tickets FOR DELETE
  TO anon, authenticated USING (true);

-- scan_logs
CREATE TABLE IF NOT EXISTS scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text NOT NULL,
  show_id uuid REFERENCES shows(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('checkin','checkout','duplicate','invalid')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scan_logs" ON scan_logs;
CREATE POLICY "anon_select_scan_logs" ON scan_logs FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_scan_logs" ON scan_logs;
CREATE POLICY "anon_insert_scan_logs" ON scan_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_scan_logs" ON scan_logs;
CREATE POLICY "anon_update_scan_logs" ON scan_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_scan_logs" ON scan_logs;
CREATE POLICY "anon_delete_scan_logs" ON scan_logs FOR DELETE
  TO anon, authenticated USING (true);

-- show_history
CREATE TABLE IF NOT EXISTS show_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  movie_title text NOT NULL,
  capacity int NOT NULL,
  booked_count int NOT NULL DEFAULT 0,
  checked_in_count int NOT NULL DEFAULT 0,
  ended_at timestamptz DEFAULT now()
);
ALTER TABLE show_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_show_history" ON show_history;
CREATE POLICY "anon_select_show_history" ON show_history FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_show_history" ON show_history;
CREATE POLICY "anon_insert_show_history" ON show_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_show_history" ON show_history;
CREATE POLICY "anon_update_show_history" ON show_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_show_history" ON show_history;
CREATE POLICY "anon_delete_show_history" ON show_history FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shows_screen_id ON shows(screen_id);
CREATE INDEX IF NOT EXISTS idx_shows_status ON shows(status);
CREATE INDEX IF NOT EXISTS idx_tickets_show_id ON tickets(show_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_scan_logs_show_id ON scan_logs(show_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_created_at ON scan_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_show_history_screen_id ON show_history(screen_id);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE screens;
ALTER PUBLICATION supabase_realtime ADD TABLE shows;
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE scan_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE show_history;
