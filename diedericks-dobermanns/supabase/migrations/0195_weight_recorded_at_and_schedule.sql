-- Weighing more often than twice a day.
--
-- session stays the AM / PM / daily label. recorded_at is the identity of a
-- reading. Hourly, 2-hourly, 4-hourly and 6-hourly rounds are different
-- moments on the same calendar day, so they cannot share a unique key of
-- (dog_id, recorded_date, session) — that key allows one AM and one PM only.
-- Stuffing the interval into session would overload a label that still means
-- "morning" or "evening". The timestamp already exists and is the right key.

-- Backfill a missing timestamp from the date plus a kennel-local hour.
-- AM 08:00, PM 18:00, daily 12:00, Africa/Johannesburg (UTC+2, no DST).
-- A second row that lands on the same instant is nudged so the new unique
-- index can be built.
WITH filled AS (
  SELECT
    id,
    (
      (recorded_date::timestamp
        + CASE COALESCE(session, 'daily')
            WHEN 'AM' THEN interval '8 hours'
            WHEN 'PM' THEN interval '18 hours'
            ELSE interval '12 hours'
          END)
      AT TIME ZONE 'Africa/Johannesburg'
    ) AS base_at,
    row_number() OVER (
      PARTITION BY
        dog_id,
        (
          (recorded_date::timestamp
            + CASE COALESCE(session, 'daily')
                WHEN 'AM' THEN interval '8 hours'
                WHEN 'PM' THEN interval '18 hours'
                ELSE interval '12 hours'
              END)
          AT TIME ZONE 'Africa/Johannesburg'
        )
      ORDER BY created_at, id
    ) AS n
  FROM public.weight_logs
  WHERE recorded_at IS NULL
)
UPDATE public.weight_logs AS w
SET recorded_at = f.base_at + ((f.n - 1) * interval '1 second')
FROM filled AS f
WHERE w.id = f.id;

WITH dups AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY dog_id, recorded_at
      ORDER BY created_at, id
    ) AS n
  FROM public.weight_logs
  WHERE recorded_at IS NOT NULL
)
UPDATE public.weight_logs AS w
SET recorded_at = w.recorded_at + ((d.n - 1) * interval '1 millisecond')
FROM dups AS d
WHERE w.id = d.id
  AND d.n > 1;

ALTER TABLE public.weight_logs
  ALTER COLUMN recorded_at SET DEFAULT now();

ALTER TABLE public.weight_logs
  ALTER COLUMN recorded_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_logs_dog_recorded_at
  ON public.weight_logs (dog_id, recorded_at);

-- (dog_id, recorded_date, session) stays. A second PM the same day updates
-- that row. Dropping it is what made a rejected re-weigh look like a lost puppy.

ALTER TABLE public.litters
  ADD COLUMN IF NOT EXISTS weighing_schedule text NOT NULL DEFAULT 'am_pm';

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
      'daily'
    )
  );

NOTIFY pgrst, 'reload schema';
