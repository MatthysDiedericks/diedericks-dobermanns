export interface Employee {
  id: string;
  full_name: string;
  preferred_name: string | null;
  job_title: string | null;
  national_id: string | null;
  email: string | null;
  phone: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_salary: number | null;
  currency: string;
  enpf_member: boolean;
  payment_reference: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EmployeeWrite = {
  full_name: string;
  preferred_name?: string | null;
  job_title?: string | null;
  national_id?: string | null;
  email?: string | null;
  phone?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  monthly_salary?: number | null;
  currency?: string;
  enpf_member?: boolean;
  payment_reference?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export type PayslipDeduction = {
  label: string;
  amount: number;
};

export interface Payslip {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  payment_date: string;
  currency: string;
  gross: number;
  deductions: PayslipDeduction[];
  net: number;
  employer_enpf: number | null;
  expense_id: string | null;
  rate_of_pay: number | null;
  hours_worked: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type PayslipWrite = {
  employee_id: string;
  period_start: string;
  period_end: string;
  payment_date: string;
  currency: string;
  gross: number;
  deductions: PayslipDeduction[];
  net: number;
  employer_enpf?: number | null;
  expense_id?: string | null;
  rate_of_pay?: number | null;
  hours_worked?: number | null;
  notes?: string | null;
};

export interface EnpfSetting {
  year: number;
  wage_ceiling: number;
  rate: number;
  updated_at: string;
}

export type EnpfWrite = {
  year: number;
  wage_ceiling: number;
  rate: number;
};
