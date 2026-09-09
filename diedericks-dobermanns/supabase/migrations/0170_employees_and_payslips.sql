-- Employees, salary expenses linked to a person, and Eswatini payslips.
-- Admin-only: national IDs and salaries must never be readable by clients.

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  preferred_name text,
  job_title text,
  national_id text,
  email text,
  phone text,
  start_date date,
  end_date date,
  monthly_salary numeric(12,2),
  currency text not null default 'SZL',
  enpf_member boolean not null default true,
  payment_reference text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

alter table public.expenses
  add column if not exists employee_id uuid references public.employees(id) on delete set null;

create index if not exists expenses_employee_id_idx
  on public.expenses (employee_id)
  where employee_id is not null;

create table public.enpf_settings (
  year integer primary key,
  wage_ceiling numeric(12,2) not null,
  rate numeric(6,4) not null,
  updated_at timestamptz not null default now()
);

create trigger enpf_settings_set_updated_at
  before update on public.enpf_settings
  for each row execute function public.set_updated_at();

insert into public.enpf_settings (year, wage_ceiling, rate)
values (2026, 4300, 0.05)
on conflict (year) do nothing;

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  payment_date date not null,
  currency text not null default 'SZL',
  gross numeric(12,2) not null,
  deductions jsonb not null default '[]'::jsonb,
  net numeric(12,2) not null,
  employer_enpf numeric(12,2),
  expense_id uuid references public.expenses(id) on delete set null,
  rate_of_pay numeric(12,2),
  hours_worked numeric(8,2),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index payslips_employee_id_idx on public.payslips (employee_id);
create index payslips_expense_id_idx on public.payslips (expense_id)
  where expense_id is not null;

alter table public.employees enable row level security;
alter table public.payslips enable row level security;
alter table public.enpf_settings enable row level security;

revoke all on public.employees from anon, public;
revoke all on public.payslips from anon, public;
revoke all on public.enpf_settings from anon, public;

grant select, insert, update, delete on public.employees to authenticated, service_role;
grant select, insert, update, delete on public.payslips to authenticated, service_role;
grant select, insert, update, delete on public.enpf_settings to authenticated, service_role;

create policy employees_admin on public.employees
  for all using (public.is_admin()) with check (public.is_admin());

create policy payslips_admin on public.payslips
  for all using (public.is_admin()) with check (public.is_admin());

create policy enpf_settings_admin on public.enpf_settings
  for all using (public.is_admin()) with check (public.is_admin());
