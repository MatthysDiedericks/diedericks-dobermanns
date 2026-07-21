-- Links a waiting_list entry back to the quote that was sent for it, and forward
-- to the balance invoice generated at handover. Both are set by application code
-- (StageSelector "Quote Sent" / "Handover" flows), not by any trigger.
alter table waiting_list add column if not exists quote_id uuid references quotes(id) on delete set null;
alter table waiting_list add column if not exists balance_invoice_id uuid references invoices(id) on delete set null;
