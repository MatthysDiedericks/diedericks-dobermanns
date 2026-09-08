-- 0158_financial_gate_views_and_price_tables.sql
-- Applied live 6 Sep 2026. This file records that change so the repos match the database.
--
-- WHY
-- 1) Four views ran as their OWNER, not the caller, so RLS was never consulted.
--    contacts_active, v_cash_receipts and v_cash_expected_in were granted to `anon`,
--    exposing 245 contacts (103 emails / 177 phones / 101 addresses) and R2 594 381
--    of turnover with buyer names, to anyone with the public anon key.
-- 2) reservations and waiting_list carry purchase prices but were gated on
--    my_client_ids(), which ignores portal_members.can_view_financials. A portal guest
--    invited WITHOUT financial access could still read the price.
--
-- TRAP: do NOT "harden" this by revoking EXECUTE on my_financial_client_ids() or
-- is_admin(). RLS policies call them; revoking EXECUTE makes the policy error and the
-- table return nothing for that role. That caused a 6.7 hour outage on this project.

-- 1. Views must honour the caller's RLS, not the owner's rights.
alter view public.contacts_active    set (security_invoker = on);
alter view public.v_cash_receipts    set (security_invoker = on);
alter view public.v_cash_expected_in set (security_invoker = on);
alter view public.page_view_daily    set (security_invoker = on);

-- 2. Defence in depth: anon has no business reading contacts or cash at all.
--    NOT revoked from `authenticated` — admins hold that role and need these views.
revoke select on public.contacts_active    from anon;
revoke select on public.v_cash_receipts    from anon;
revoke select on public.v_cash_expected_in from anon;

-- 3. Price-bearing tables move to the financial gate.
--    my_financial_client_ids() = auth.uid() + account holders where can_view_financials.
--    Account holders are unaffected; only non-financial guests lose the row.
alter policy "Clients can view own reservations" on public.reservations
  using (client_id in (select public.my_financial_client_ids()));

alter policy "Client can view own waiting list entry" on public.waiting_list
  using (client_id in (select public.my_financial_client_ids()));

comment on policy "Clients can view own reservations" on public.reservations is
 'Financial-gated 6 Sep 2026: carries total_price/deposit_amount.';
comment on policy "Client can view own waiting list entry" on public.waiting_list is
 'Financial-gated 6 Sep 2026: carries quoted_price/deposit_amount.';

-- ROLLBACK (only if this breaks an admin screen):
--   alter policy "Clients can view own reservations" on public.reservations
--     using (client_id in (select public.my_client_ids()));
--   alter policy "Client can view own waiting list entry" on public.waiting_list
--     using (client_id in (select public.my_client_ids()));
--   grant select on public.contacts_active, public.v_cash_receipts,
--                   public.v_cash_expected_in to anon;
