-- 0180_application_agreed_tier.sql
-- An applicant's stated budget and the tier finally agreed are two different
-- facts. budget_range stays exactly as they submitted it. agreed_tier records
-- what Matt and the client settled on, with a reason and an audit trail.

alter table public.applications
  add column if not exists agreed_tier        text
    references public.pricing_tiers(tier_key),
  add column if not exists agreed_tier_at     timestamptz,
  add column if not exists agreed_tier_by     uuid references auth.users(id),
  add column if not exists agreed_tier_reason text;

create index if not exists applications_agreed_tier_idx
  on public.applications (agreed_tier)
  where agreed_tier is not null;

notify pgrst, 'reload schema';
