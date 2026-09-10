/*
# Add seat_number to tickets

## Overview
Adds a `seat_number` column to the `tickets` table so each ticket can be
associated with a specific seat in the theatre screen. This enables a
visual seat map for booking — users pick seats from a grid instead of
entering a quantity, and each ticket displays its allocated seat number.

## Changes
- `tickets.seat_number` (int, nullable) — the seat number assigned to this
  ticket. Nullable so existing tickets (if any) are not affected. New tickets
  will always have a seat number. A unique partial index ensures no two
  tickets for the same show can claim the same seat.

## Security
- No changes to RLS policies — the existing anon+authenticated CRUD policies
  on `tickets` already cover the new column.

## Important Notes
1. The unique partial index `idx_tickets_show_seat` prevents double-booking
   the same seat for the same show.
2. Seat numbers are 1-based and correspond to positions in the screen layout.
3. Existing tickets with NULL seat_number are unaffected by the unique index
   (partial index — only applies when seat_number IS NOT NULL).
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'seat_number'
  ) THEN
    ALTER TABLE tickets ADD COLUMN seat_number int;
  END IF;
END $$;

-- Unique partial index: one seat per show (only for non-null seat numbers)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_show_seat
  ON tickets(show_id, seat_number)
  WHERE seat_number IS NOT NULL;
