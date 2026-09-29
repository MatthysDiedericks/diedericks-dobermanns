-- 0195 added the schedules but left the cap that makes them impossible.
--
-- idx_weight_logs_dog_date_session was UNIQUE on (dog_id, recorded_date,
-- session). session only ever holds 'AM', 'PM' or 'daily', so that index caps
-- a puppy at three readings a day. Interval schedules record session = 'daily'
-- many times a day, so the second reading of the day did not fail loudly — the
-- upsert matched the first row and OVERWROTE it. Six hourly weights became one.
-- That is the same shape as the reported "PM round loses rows".
--
-- The cap is still wanted for AM and PM, where re-weighing a session must
-- correct that session rather than add a second row. So the index becomes
-- partial: it governs AM and PM only. Interval readings are kept distinct by
-- idx_weight_logs_dog_recorded_at (0195), which is the right key for them —
-- a reading is identified by when it was taken.

DROP INDEX IF EXISTS public.idx_weight_logs_dog_date_session;

CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_logs_dog_date_session
  ON public.weight_logs (dog_id, recorded_date, session)
  WHERE session IN ('AM', 'PM');

COMMENT ON INDEX public.idx_weight_logs_dog_date_session IS
  'One AM and one PM per dog per day, so a re-weigh corrects the session. Deliberately does NOT cover session = daily: interval schedules write many daily rows a day and are kept unique by (dog_id, recorded_at).';

-- Every 12 hours. Twice daily on the clock, which is not the same as AM/PM —
-- AM/PM is whenever the two rounds happen to get done.
ALTER TABLE public.litters
  DROP CONSTRAINT IF EXISTS litters_weighing_schedule_check;

ALTER TABLE public.litters
  ADD CONSTRAINT litters_weighing_schedule_check
  CHECK (
    weighing_schedule IN (
      'am_pm',
      'every_1h',
      'every_2h',
      'every_4h',
      'every_6h',
      'every_12h',
      'daily'
    )
  );

NOTIFY pgrst, 'reload schema';
