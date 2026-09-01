-- 0149 — Manual hold on the automatic quote-lapse ladder.
--
-- Applied live on 1 Sep 2026, ahead of the lapse feature itself (0150), because
-- a real buyer needed protecting immediately: Timothy Hastie, quote DD-1141
-- (R55 000, sent 20 Aug 2026), is waiting on funds to clear before paying his
-- deposit. Matt has agreed to hold his place. Without this he would have been
-- chased by the automation and then had his puppy released.
--
-- The hold is deliberately a DATE and not a boolean. A boolean hold is set once
-- and never cleared — six months later nobody remembers why a quote is exempt,
-- and it quietly becomes permanent. A date expires by itself and forces the
-- question to be asked again.
--
-- The lapse job MUST check this before doing anything: no reminder, no expiry,
-- no dog release while the hold is live. It is not enough to skip the lapse and
-- still send the reminders — the buyer has already been told we are waiting.

alter table public.quotes
  add column if not exists lapse_hold_until  date,
  add column if not exists lapse_hold_reason text,
  add column if not exists lapse_hold_set_by uuid references public.users(id);

comment on column public.quotes.lapse_hold_until is
  'While this date is in the future the automatic reminder/lapse ladder must skip '
  'this quote entirely — no reminder, no expiry, no dog release. For buyers Matt '
  'has agreed to wait for. Null means no hold.';

comment on column public.quotes.lapse_hold_reason is
  'Why the hold was granted. Required whenever lapse_hold_until is set, so the '
  'reason survives the person who set it.';

create index if not exists idx_quotes_lapse_hold
  on public.quotes (lapse_hold_until)
  where lapse_hold_until is not null;
