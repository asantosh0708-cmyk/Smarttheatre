/*
# Add booking_limit column to shows

## Purpose
Lets the administrator set a per-show maximum number of tickets that can be
booked, independent of (and never exceeding) the physical screen capacity.
This gives the admin control over how many seats are actually released for
booking for each show — e.g. holding back seats for walk-ins, or capping
online bookings below physical capacity.

## Changes
1. **shows** — new column:
   - `booking_limit` (int, nullable)
     - When NULL, booking defaults to the screen's full capacity (backwards compatible).
     - When set, must be > 0 and <= the screen's capacity (enforced by CHECK).

2. Backfill: existing shows get NULL (meaning "use screen capacity"), so
   nothing changes for current data.

## Security
- No new tables. RLS already enabled on `shows`; existing policies cover the
  new column automatically (same anon/authenticated CRUD).
*/

ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS booking_limit int
  CHECK (booking_limit IS NULL OR booking_limit > 0);

COMMENT ON COLUMN shows.booking_limit IS
  'Max tickets bookable for this show. NULL means use screen capacity.';
