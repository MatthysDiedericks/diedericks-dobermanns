-- 0148 — Two fixes applied live on 1 Sep 2026 while capturing buyer payments.
--
-- Both were found the hard way: recording a real client's deposit failed, and
-- the cashflow forecast was naming real buyers "Unknown". Written up here so a
-- rebuilt database carries them, since both were applied directly to the live
-- database first.

-- ---------------------------------------------------------------------------
-- 1. category_from_dog_interest() emitted values the waiting_list check
--    constraint rejects.
--
-- The function returned 'elite' / 'protection'; waiting_list_preferred_category_check
-- only permits 'standard', 'elite_developed', 'protection_dog', 'any'. Every
-- buyer whose application was 'puppy' or blank passed through unharmed, so the
-- fault stayed hidden until Ronel Emmenes — the first 'elite_developed'
-- applicant to have a payment recorded — hit it. Recording her deposit failed
-- with a bare constraint error on the Record Payment screen, with nothing to
-- indicate the waiting list was even involved.
--
-- The trigger chain is: invoice_payments insert
--   -> trg_promote_waitlist_invoice_payment
--   -> promote_waitlist_on_payment()
--   -> category_from_dog_interest()  <- returned the illegal value here
--
-- Keep this function's output identical to the check constraint. If the
-- constraint ever gains a value, change both together.
create or replace function public.category_from_dog_interest(p_interest text)
 returns text
 language sql
 immutable
as $function$
  select case p_interest
    when 'elite_developed' then 'elite_developed'
    when 'protection_dog' then 'protection_dog'
    when 'puppy' then 'standard'
    else 'any'
  end;
$function$;

comment on function public.category_from_dog_interest(text) is
  'Maps applications.dog_interest onto waiting_list.preferred_category. Output '
  'MUST stay within waiting_list_preferred_category_check or payment capture '
  'fails at the trigger. Fixed 1 Sep 2026.';

-- ---------------------------------------------------------------------------
-- 2. v_cash_expected_in: three faults, one rebuild.
--
-- (a) Buyers with no portal account rendered as "Unknown". The view resolved
--     the name only through users.full_name via invoices.client_id, so a buyer
--     who has not yet opened an account fell straight through the COALESCE —
--     even though the linked quote holds a contact row with their name on it.
--     On 1 Sep 2026 that was three of eight forecast lines.
--
-- (b) Elite Developed puppies were dated from the litter's standard go-home
--     date. They are not delivered then: an elite pup stays in the kennel to
--     six months while a standard pup goes home at eight weeks, so the balance
--     lands roughly FOUR MONTHS later. Every elite line was forecasting money
--     a third of a year before it can arrive, which is the difference between
--     a real cash trough and an imaginary one.
--
-- (c) The line gave no way to see that a deposit had been deducted. The amount
--     has always been amount_outstanding — deposits and instalments were netting
--     off correctly — but the label said nothing about it, so the figure could
--     not be checked without opening the invoice. basis_label now states the
--     arithmetic, and invoice_total / amount_received are exposed as columns.
--
-- The tier is resolved best-source-first: the allocated dog, then the dog on
-- the quote, then the waiting-list category, then what the buyer applied for.
-- Anything with no allocated dog still gets the right treatment from the
-- application, which matters because elite buyers usually pay long before a
-- specific puppy exists.
--
-- The four-month offset applies ONLY on a go-home basis. Where the view falls
-- back to the invoice due date there is no delivery date to shift, and the due
-- date is a payment term rather than a handover, so shifting it would be wrong.
drop view if exists public.v_cash_expected_in;

create view public.v_cash_expected_in as
 SELECT DISTINCT ON (i.id) i.id AS invoice_id,
    i.invoice_number,
    i.client_id,
    COALESCE(u.full_name, ct.full_name, i.historical_client_name, 'Unknown'::text) AS buyer_name,
    i.amount_outstanding::numeric AS amount,
    i.due_date,
    i.dog_id,
    i.litter_id,
    i.quote_id,
    d.name AS dog_name,
    CASE
      WHEN COALESCE(ld.go_home_date, lw.go_home_date) IS NOT NULL
           AND tier.programme_tier = 'elite_developed'
        THEN (COALESCE(ld.go_home_date, lw.go_home_date) + interval '4 months')::date
      ELSE COALESCE(ld.go_home_date, lw.go_home_date, i.due_date)
    END AS expected_date,
        CASE
            WHEN COALESCE(ld.go_home_date, lw.go_home_date) IS NOT NULL
                 AND tier.programme_tier = 'elite_developed' THEN 'go_home_elite_plus_4m'::text
            WHEN ld.go_home_date IS NOT NULL THEN 'go_home_dog_litter'::text
            WHEN lw.go_home_date IS NOT NULL THEN 'go_home_waiting_litter'::text
            WHEN i.due_date IS NOT NULL THEN 'due_date'::text
            ELSE 'unknown'::text
        END AS date_basis,
    (
      CASE
        WHEN COALESCE(ld.go_home_date, lw.go_home_date) IS NOT NULL
             AND tier.programme_tier = 'elite_developed'
          THEN 'dated four months after the ' || COALESCE(ld.pairing, lw.pairing)
               || ' go-home date — elite developed pups stay to six months'
        WHEN ld.go_home_date IS NOT NULL THEN 'dated from the ' || ld.pairing || ' go-home date'
        WHEN lw.go_home_date IS NOT NULL THEN 'dated from the ' || lw.pairing || ' go-home date'
        WHEN i.due_date IS NOT NULL THEN 'dated from the invoice due date'
        ELSE 'no expected date on file'
      END
      ||
      CASE
        WHEN COALESCE(i.amount_paid, 0) > 0
          THEN '. Balance only — R' || trim(to_char(i.amount_paid, 'FM999G999G990D00'))
               || ' of R' || trim(to_char(i.total_amount, 'FM999G999G990D00')) || ' already received'
        ELSE ''
      END
    ) AS basis_label,
    COALESCE(ld.pairing, lw.pairing) AS litter_label,
    i.total_amount::numeric AS invoice_total,
    i.amount_paid::numeric AS amount_received,
    tier.programme_tier,
    COALESCE(ld.go_home_date, lw.go_home_date) AS litter_go_home_date
   FROM invoices i
     LEFT JOIN users u ON u.id = i.client_id
     LEFT JOIN quotes qc ON qc.id = i.quote_id
     LEFT JOIN contacts ct ON ct.id = qc.contact_id
     LEFT JOIN dogs d ON d.id = i.dog_id
     LEFT JOIN v_litter_go_home ld ON ld.litter_id = d.litter_id
     LEFT JOIN LATERAL ( SELECT COALESCE(wl.assigned_litter_id, qlit.litter_id, i.litter_id) AS litter_id
           FROM ( SELECT 1 AS "?column?") z
             LEFT JOIN LATERAL ( SELECT wl_1.assigned_litter_id
                   FROM waiting_list wl_1
                  WHERE wl_1.deposit_invoice_id = i.id OR wl_1.balance_invoice_id = i.id OR i.quote_id IS NOT NULL AND wl_1.quote_id = i.quote_id
                  ORDER BY wl_1.updated_at DESC NULLS LAST
                 LIMIT 1) wl ON true
             LEFT JOIN LATERAL ( SELECT qi.litter_id
                   FROM quote_items qi
                  WHERE i.quote_id IS NOT NULL AND qi.quote_id = i.quote_id AND qi.litter_id IS NOT NULL
                 LIMIT 1) qlit ON true) wait ON true
     LEFT JOIN v_litter_go_home lw ON lw.litter_id = wait.litter_id
     LEFT JOIN LATERAL (
       SELECT COALESCE(
         d.programme_tier,
         (SELECT dd.programme_tier FROM quote_items qi JOIN dogs dd ON dd.id = qi.dog_id
           WHERE qi.quote_id = i.quote_id AND qi.dog_id IS NOT NULL LIMIT 1),
         (SELECT wl2.preferred_category FROM waiting_list wl2
           WHERE wl2.deposit_invoice_id = i.id OR wl2.balance_invoice_id = i.id
              OR (i.quote_id IS NOT NULL AND wl2.quote_id = i.quote_id) LIMIT 1),
         (SELECT a.dog_interest FROM applications a WHERE a.id = qc.application_id)
       ) AS programme_tier
     ) tier ON true
  WHERE COALESCE(i.amount_outstanding, 0::numeric) > 0::numeric AND (i.status <> ALL (ARRAY['void'::text, 'cancelled'::text, 'draft'::text]))
  ORDER BY i.id;

grant select on public.v_cash_expected_in to authenticated, service_role;
