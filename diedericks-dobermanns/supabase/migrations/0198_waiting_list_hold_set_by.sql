-- Who set a waiting-list hold, and when.
-- hold_reason and hold_until already exist on waiting_list. This is not the
-- quote lapse hold (quotes.lapse_hold_*). Clearing a hold nulls all four.

ALTER TABLE public.waiting_list
  ADD COLUMN IF NOT EXISTS hold_set_by uuid REFERENCES auth.users (id),
  ADD COLUMN IF NOT EXISTS hold_set_at timestamptz;

COMMENT ON COLUMN public.waiting_list.hold_reason IS
  'Why this buyer is skipped for the current litter. The pipeline stage stays put.';

COMMENT ON COLUMN public.waiting_list.hold_until IS
  'Inclusive last day of the hold. A date in the past is not a hold.';

COMMENT ON COLUMN public.waiting_list.hold_set_by IS
  'auth.users id of the person who set the current hold. Nulled together with the hold.';

COMMENT ON COLUMN public.waiting_list.hold_set_at IS
  'When the current hold was set. Nulled together with the hold.';

NOTIFY pgrst, 'reload schema';
