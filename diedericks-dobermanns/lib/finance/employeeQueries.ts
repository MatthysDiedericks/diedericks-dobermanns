import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type {
  Employee,
  EmployeeWrite,
  EnpfSetting,
  EnpfWrite,
  Payslip,
  PayslipDeduction,
  PayslipWrite,
} from '@/types/employees';
import type { Expense } from '@/types/finance';
import { deductionsForSave, payslipNet } from '@/lib/finance/payslip';

function asEmployee(row: Record<string, unknown>): Employee {
  return {
    ...(row as unknown as Employee),
    monthly_salary: row.monthly_salary == null ? null : Number(row.monthly_salary),
  };
}

function asPayslip(row: Record<string, unknown>): Payslip {
  const raw = Array.isArray(row.deductions) ? row.deductions : [];
  const deductions = raw.map((item) => {
    const d = item as { label?: string; amount?: number };
    return { label: String(d.label ?? ''), amount: Number(d.amount) || 0 } satisfies PayslipDeduction;
  });
  return {
    ...(row as unknown as Payslip),
    gross: Number(row.gross) || 0,
    net: Number(row.net) || 0,
    employer_enpf: row.employer_enpf == null ? null : Number(row.employer_enpf),
    rate_of_pay: row.rate_of_pay == null ? null : Number(row.rate_of_pay),
    hours_worked: row.hours_worked == null ? null : Number(row.hours_worked),
    deductions,
  };
}

export async function fetchEmployees(activeOnly = false): Promise<Employee[]> {
  const supabase = requireSupabase();
  let q = supabase.from('employees' as never).select('*').order('full_name');
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => asEmployee(row as Record<string, unknown>));
}

export async function fetchEmployeeById(id: string): Promise<Employee | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('employees' as never)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asEmployee(data as Record<string, unknown>) : null;
}

export async function saveEmployee(input: EmployeeWrite, id?: string): Promise<string> {
  const supabase = requireSupabase();
  const row = {
    full_name: input.full_name.trim(),
    preferred_name: input.preferred_name?.trim() || null,
    job_title: input.job_title?.trim() || null,
    national_id: input.national_id?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    monthly_salary: input.monthly_salary ?? null,
    currency: input.currency?.trim() || 'SZL',
    enpf_member: input.enpf_member ?? true,
    payment_reference: input.payment_reference?.trim() || null,
    notes: input.notes?.trim() || null,
    is_active: input.is_active ?? true,
  };
  if (id) {
    const { error } = await supabase.from('employees' as never).update(row).eq('id', id);
    if (error) throw new Error(error.message);
    return id;
  }
  const { data, error } = await supabase.from('employees' as never).insert(row).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not save employee');
  return (data as { id: string }).id;
}

export async function fetchEmployeeExpenses(employeeId: string): Promise<Expense[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('employee_id', employeeId)
    .order('expense_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Expense[];
}

export async function fetchEmployeePayslips(employeeId: string): Promise<Payslip[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('payslips' as never)
    .select('*')
    .eq('employee_id', employeeId)
    .order('payment_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => asPayslip(row as Record<string, unknown>));
}

export async function linkExpenseEmployee(expenseId: string, employeeId: string | null) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('expenses')
    .update({ employee_id: employeeId } as never)
    .eq('id', expenseId);
  if (error) throw new Error(error.message);
}

export async function fetchEnpfSetting(year: number): Promise<EnpfSetting | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('enpf_settings' as never)
    .select('*')
    .eq('year', year)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    year: Number(row.year),
    wage_ceiling: Number(row.wage_ceiling),
    rate: Number(row.rate),
    updated_at: String(row.updated_at),
  };
}

export async function fetchEnpfSettings(): Promise<EnpfSetting[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('enpf_settings' as never)
    .select('*')
    .order('year', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      year: Number(r.year),
      wage_ceiling: Number(r.wage_ceiling),
      rate: Number(r.rate),
      updated_at: String(r.updated_at),
    };
  });
}

export async function saveEnpfSetting(input: EnpfWrite) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('enpf_settings' as never).upsert({
    year: input.year,
    wage_ceiling: input.wage_ceiling,
    rate: input.rate,
  });
  if (error) throw new Error(error.message);
}

export async function createPayslip(input: PayslipWrite): Promise<string> {
  const supabase = requireSupabase();
  const deductions = deductionsForSave(input.deductions);
  const net = payslipNet(input.gross, deductions);
  const { data, error } = await supabase
    .from('payslips' as never)
    .insert({
      employee_id: input.employee_id,
      period_start: input.period_start,
      period_end: input.period_end,
      payment_date: input.payment_date,
      currency: input.currency || 'SZL',
      gross: input.gross,
      deductions,
      net,
      employer_enpf: input.employer_enpf ?? null,
      expense_id: input.expense_id ?? null,
      rate_of_pay: input.rate_of_pay ?? null,
      hours_worked: input.hours_worked ?? null,
      notes: input.notes?.trim() || null,
      created_by: useAuthStore.getState().session?.user?.id ?? null,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create payslip');
  return (data as { id: string }).id;
}

export async function fetchPayslipById(id: string): Promise<Payslip | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('payslips' as never)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? asPayslip(data as Record<string, unknown>) : null;
}

export async function fetchCompanyLetterhead(): Promise<{ name: string; address: string | null }> {
  const supabase = requireSupabase();
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['company_name', 'contact_address']);
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    name: map.get('company_name')?.trim() || 'Diedericks Dobermanns',
    address: map.get('contact_address')?.trim() || null,
  };
}
