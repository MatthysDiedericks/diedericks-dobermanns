-- ============================================================================
-- Diedericks Dobermanns — Sales pipeline
-- Quotes -> Invoices, plus puppy waiting-list feedback/delivery dates and a
-- marketing opt-in flag on clients. Mirrors the manual workflow:
--   approved application -> quote (line items) -> payment -> invoice ->
--   client added to puppy waiting list with a delivery date.
-- ============================================================================

-- users: marketing opt-in for the contact database ---------------------------
alter table public.users
  add column if not exists marketing_opt_in boolean not null default true;

-- waiting_list: feedback + delivery date -------------------------------------
alter table public.waiting_list
  add column if not exists feedback text;
alter table public.waiting_list
  add column if not exists expected_delivery_date date;

-- quotes ---------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text unique,
  client_id uuid references public.users (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined', 'paid', 'cancelled')),
  currency text not null default 'ZAR',
  subtotal decimal(12, 2) not null default 0,
  discount decimal(12, 2) not null default 0,
  total decimal(12, 2) not null default 0,
  notes text,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- quote_items ----------------------------------------------------------------
create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  item_type text not null default 'other'
    check (item_type in ('dog', 'delivery', 'board_train', 'training', 'transport', 'accessory', 'other')),
  dog_id uuid references public.dogs (id) on delete set null,
  description text not null,
  quantity int not null default 1,
  unit_price decimal(12, 2) not null default 0,
  line_total decimal(12, 2) not null default 0,
  sort_order int not null default 0
);

-- invoices -------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  quote_id uuid references public.quotes (id) on delete set null,
  client_id uuid references public.users (id) on delete set null,
  status text not null default 'unpaid'
    check (status in ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
  currency text not null default 'ZAR',
  subtotal decimal(12, 2) not null default 0,
  discount decimal(12, 2) not null default 0,
  total decimal(12, 2) not null default 0,
  amount_paid decimal(12, 2) not null default 0,
  issued_at date not null default current_date,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- invoice_items --------------------------------------------------------------
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  item_type text not null default 'other'
    check (item_type in ('dog', 'delivery', 'board_train', 'training', 'transport', 'accessory', 'other')),
  dog_id uuid references public.dogs (id) on delete set null,
  description text not null,
  quantity int not null default 1,
  unit_price decimal(12, 2) not null default 0,
  line_total decimal(12, 2) not null default 0,
  sort_order int not null default 0
);

-- updated_at triggers --------------------------------------------------------
create trigger trg_quotes_updated before update on public.quotes
  for each row execute function public.set_updated_at();
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();

-- indexes --------------------------------------------------------------------
create index if not exists idx_quotes_client on public.quotes (client_id);
create index if not exists idx_quotes_status on public.quotes (status);
create index if not exists idx_quote_items_quote on public.quote_items (quote_id);
create index if not exists idx_invoices_client on public.invoices (client_id);
create index if not exists idx_invoices_status on public.invoices (status);
create index if not exists idx_invoice_items_invoice on public.invoice_items (invoice_id);

-- Row Level Security ---------------------------------------------------------
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

-- quotes: clients read their own; admins manage everything.
create policy "quotes read own" on public.quotes
  for select using (client_id = auth.uid() or public.is_admin());
create policy "quotes admin write" on public.quotes
  for all using (public.is_admin()) with check (public.is_admin());

create policy "quote_items read own" on public.quote_items
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id and q.client_id = auth.uid()
    )
  );
create policy "quote_items admin write" on public.quote_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "invoices read own" on public.invoices
  for select using (client_id = auth.uid() or public.is_admin());
create policy "invoices admin write" on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());

create policy "invoice_items read own" on public.invoice_items
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id and i.client_id = auth.uid()
    )
  );
create policy "invoice_items admin write" on public.invoice_items
  for all using (public.is_admin()) with check (public.is_admin());
