-- 0192 - Remove the unused `payments` table.
--
-- NUMBERING NOTE: this was applied to the live database on 22 Sep 2026 as
-- "0191_drop_unused_payments_table", before 0191_alert_dismissals.sql was
-- written. It is filed as 0192 because 0191 was already taken by the time the
-- file was created. Applied order and file order differ by one step here; the
-- two migrations touch nothing in common, so nothing depends on the sequence.
--
-- WHY
-- Receipts live in `invoice_payments` (145 rows, written by payment-actions.ts
-- and read by every report). `payments` never held a row, no application code
-- referenced it, and nothing pointed a foreign key at it. It survived only as a
-- UNION branch in v_cash_receipts, contributing nothing while standing ready to
-- be built against by mistake.
--
-- That mistake nearly happened: a check of "are Xana's deposits recorded"
-- queried `payments`, found it empty, and came within one sentence of reporting
-- that R3.7m of receipts had vanished. The right table had them all along.

create or replace view public.v_cash_receipts
with (security_invoker = on) as
 SELECT ip.id,
    'invoice_payment'::text AS source,
    ip.payment_date AS received_on,
    ip.amount::numeric AS amount,
    ip.payment_method AS method,
    ip.invoice_id,
    i.invoice_number,
    i.client_id,
    COALESCE(u.full_name, i.historical_client_name, ct.full_name, qct.full_name) AS buyer_name,
    i.dog_id,
    i.litter_id
   FROM invoice_payments ip
     JOIN invoices i ON i.id = ip.invoice_id
     LEFT JOIN users u ON u.id = i.client_id
     LEFT JOIN contacts ct ON ct.user_id = i.client_id
     LEFT JOIN quotes q ON q.id = i.quote_id
     LEFT JOIN contacts qct ON qct.id = q.contact_id
  WHERE i.status <> ALL (ARRAY['void'::text, 'cancelled'::text, 'draft'::text])
UNION ALL
 SELECT h.id,
    'historical'::text AS source,
    h.income_date AS received_on,
    h.total_amount AS amount,
    COALESCE(h.source, h.category) AS method,
    NULL::uuid AS invoice_id,
    h.invoice_number,
    NULL::uuid AS client_id,
    h.contact_name AS buyer_name,
    h.dog_id,
    NULL::uuid AS litter_id
   FROM historical_income h
  WHERE NOT (EXISTS ( SELECT 1 FROM invoices i WHERE i.historical_income_id = h.id));

comment on view public.v_cash_receipts is
  'Money actually received: invoice_payments plus pre-system historical income. There is exactly one receipts table on this project and it is invoice_payments.';

drop table if exists public.payments;

comment on table public.invoice_payments is
  'The one and only receipts table. A payment here syncs invoices.amount_paid via trigger_sync_invoice_amount_paid. Do not create a second payments table.';

notify pgrst, 'reload schema';
