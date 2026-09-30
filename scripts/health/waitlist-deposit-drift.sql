-- Daily health check (dobermann-daily-health-check).
-- Must return 0 rows. Any row means a waiting-list deposit has drifted from
-- the payment rows on its invoice. Do not silence it.
--
-- The same rows are public.health_waitlist_deposit_drift (migration 0201).

select w.enquirer_name, w.pipeline_stage, w.deposit_amount, i.invoice_number, i.amount_paid
from public.waiting_list w
join public.invoices i on i.id = w.deposit_invoice_id
where w.status = 'active'
  and i.amount_paid > 0
  and (w.deposit_amount is distinct from i.amount_paid
       or w.pipeline_stage in ('quote_sent','approved','enquiry','applied'));
