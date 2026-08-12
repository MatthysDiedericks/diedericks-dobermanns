-- 0069_pipeline_and_matching.sql
-- Unify colour vocabulary, add puppy tail fields, back-fill waitlist preferences.
--
-- Canonical dog colours: black_tan | brown_tan
-- Canonical preference colours: black_tan | brown_tan | no_preference
-- FCI breed standard calls the marking "rust"; black_rust / red_rust were the
-- previous internal terms for the same two colours — do not "correct" back.

-- ---------------------------------------------------------------------------
-- 1. Colour vocabulary
-- ---------------------------------------------------------------------------

-- Dogs: drop old check before rewriting values (prior constraint allowed black_rust/red_rust).
ALTER TABLE public.dogs DROP CONSTRAINT IF EXISTS dogs_colour_check;

-- Dogs: accept prior internal + slash forms used in older app code.
UPDATE public.dogs SET colour = 'black_tan'
WHERE colour IN ('black_rust', 'black/rust', 'black');
UPDATE public.dogs SET colour = 'brown_tan'
WHERE colour IN ('red_rust', 'red/rust', 'brown', 'brown_tan', 'red', 'brown/rust');

DO $$
DECLARE
  unexpected text;
BEGIN
  SELECT string_agg(DISTINCT colour, ', ' ORDER BY colour)
    INTO unexpected
  FROM public.dogs
  WHERE colour IS NOT NULL
    AND colour NOT IN ('black_tan', 'brown_tan');

  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION
      '0069 abort: unexpected dogs.colour values remain: %. Fix or map them before adding the check constraint.',
      unexpected;
  END IF;
END $$;

DO $$
DECLARE
  black_n int;
  brown_n int;
BEGIN
  SELECT count(*) INTO black_n FROM public.dogs WHERE colour = 'black_tan';
  SELECT count(*) INTO brown_n FROM public.dogs WHERE colour = 'brown_tan';
  RAISE NOTICE '0069 dogs colour: black_tan=%, brown_tan=%', black_n, brown_n;
END $$;

ALTER TABLE public.dogs
  ADD CONSTRAINT dogs_colour_check
  CHECK (colour IS NULL OR colour IN ('black_tan', 'brown_tan'));

COMMENT ON COLUMN public.dogs.colour IS
  'Canonical: black_tan | brown_tan. FCI breed standard calls this marking "rust"; black_rust / red_rust were previous internal terms for the same two colours.';

-- Waiting list preferences
UPDATE public.waiting_list SET preferred_colour = 'black_tan'
WHERE preferred_colour IN ('black', 'black_rust', 'black/rust', 'Black', 'Black & Tan', 'black_tan');
UPDATE public.waiting_list SET preferred_colour = 'brown_tan'
WHERE preferred_colour IN ('brown', 'red', 'red_rust', 'red/rust', 'Brown', 'Brown & Tan', 'brown_tan');
UPDATE public.waiting_list SET preferred_colour = 'no_preference'
WHERE preferred_colour IS NULL
   OR btrim(preferred_colour) = ''
   OR lower(preferred_colour) IN ('any', 'no_preference', 'no preference', 'either');

DO $$
DECLARE
  unexpected text;
BEGIN
  SELECT string_agg(DISTINCT preferred_colour, ', ' ORDER BY preferred_colour)
    INTO unexpected
  FROM public.waiting_list
  WHERE preferred_colour IS NOT NULL
    AND preferred_colour NOT IN ('black_tan', 'brown_tan', 'no_preference');

  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION
      '0069 abort: unexpected waiting_list.preferred_colour values remain: %. Map them before adding the check constraint.',
      unexpected;
  END IF;
END $$;

DO $$
DECLARE
  black_n int;
  brown_n int;
  any_n int;
BEGIN
  SELECT count(*) INTO black_n FROM public.waiting_list WHERE preferred_colour = 'black_tan';
  SELECT count(*) INTO brown_n FROM public.waiting_list WHERE preferred_colour = 'brown_tan';
  SELECT count(*) INTO any_n FROM public.waiting_list WHERE preferred_colour = 'no_preference';
  RAISE NOTICE '0069 waiting_list preferred_colour: black_tan=%, brown_tan=%, no_preference=%',
    black_n, brown_n, any_n;
END $$;

ALTER TABLE public.waiting_list DROP CONSTRAINT IF EXISTS waiting_list_preferred_colour_check;
ALTER TABLE public.waiting_list
  ADD CONSTRAINT waiting_list_preferred_colour_check
  CHECK (
    preferred_colour IS NULL
    OR preferred_colour IN ('black_tan', 'brown_tan', 'no_preference')
  );

COMMENT ON COLUMN public.waiting_list.preferred_colour IS
  'Canonical: black_tan | brown_tan | no_preference. Same vocabulary as applications.preferred_colour.';

-- ---------------------------------------------------------------------------
-- 2. Tail on the puppy — null means not yet decided. Never default.
-- ---------------------------------------------------------------------------
ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS tail_type text
    CHECK (tail_type IS NULL OR tail_type IN ('docked', 'natural')),
  ADD COLUMN IF NOT EXISTS tail_docked_date date;

COMMENT ON COLUMN public.dogs.tail_type IS
  'docked | natural | null. Null = not yet decided or unknown. Do not default.';

-- ---------------------------------------------------------------------------
-- 3. Preference fields on waiting list + back-fill from applications
-- ---------------------------------------------------------------------------
ALTER TABLE public.waiting_list
  ADD COLUMN IF NOT EXISTS budget_range text,
  ADD COLUMN IF NOT EXISTS preferred_timeline text;

-- Copy from linked application only where the waitlist field is empty / default.
-- Do not overwrite hand-entered values.
UPDATE public.waiting_list wl
SET preferred_sex = a.preferred_sex
FROM public.applications a
WHERE wl.application_id = a.id
  AND a.preferred_sex IS NOT NULL
  AND (wl.preferred_sex IS NULL OR wl.preferred_sex = '' OR wl.preferred_sex = 'any');

UPDATE public.waiting_list wl
SET preferred_colour = a.preferred_colour
FROM public.applications a
WHERE wl.application_id = a.id
  AND a.preferred_colour IS NOT NULL
  AND a.preferred_colour <> 'no_preference'
  AND (
    wl.preferred_colour IS NULL
    OR wl.preferred_colour = ''
    OR wl.preferred_colour = 'no_preference'
  );

UPDATE public.waiting_list wl
SET tail_preference = a.tail_preference
FROM public.applications a
WHERE wl.application_id = a.id
  AND a.tail_preference IS NOT NULL
  AND a.tail_preference <> 'no_preference'
  AND (
    wl.tail_preference IS NULL
    OR wl.tail_preference = ''
    OR wl.tail_preference = 'no_preference'
  );

UPDATE public.waiting_list wl
SET budget_range = a.budget_range
FROM public.applications a
WHERE wl.application_id = a.id
  AND a.budget_range IS NOT NULL
  AND (wl.budget_range IS NULL OR wl.budget_range = '');

UPDATE public.waiting_list wl
SET preferred_timeline = a.preferred_timeline
FROM public.applications a
WHERE wl.application_id = a.id
  AND a.preferred_timeline IS NOT NULL
  AND (wl.preferred_timeline IS NULL OR wl.preferred_timeline = '');

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM public.waiting_list wl
  JOIN public.applications a ON a.id = wl.application_id;
  RAISE NOTICE '0069 preference back-fill considered % linked waitlist rows', n;
END $$;
