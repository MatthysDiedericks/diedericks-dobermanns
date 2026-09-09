import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';

import { PayslipForm } from '@/components/finance/PayslipForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { fetchEmployeeById, fetchEnpfSetting } from '@/lib/finance/employeeQueries';
import { fetchExpenseById } from '@/lib/finance/expenseMutations';
import { periodFromDate, suggestEnpfContribution, yearFromIso } from '@/lib/finance/payslip';
import type { Employee } from '@/types/employees';

export default function NewPayslipScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId?: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [gross, setGross] = useState(0);
  const [paymentDate, setPaymentDate] = useState('');
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [suggested, setSuggested] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!expenseId) {
        setError('Open this from a linked Staff expense.');
        setLoading(false);
        return;
      }
      try {
        const expense = await fetchExpenseById(expenseId);
        if (!expense?.employee_id) {
          setError('Link this expense to an employee first.');
          return;
        }
        const person = await fetchEmployeeById(expense.employee_id);
        if (!person) {
          setError('Employee not found.');
          return;
        }
        const bounds = periodFromDate(expense.expense_date);
        const year = yearFromIso(expense.expense_date);
        const enpf = await fetchEnpfSetting(year);
        const amount = Number(expense.amount) || 0;
        setEmployee(person);
        setGross(amount);
        setPaymentDate(expense.expense_date);
        setPeriod(bounds);
        setSuggested(
          person.enpf_member && enpf
            ? suggestEnpfContribution(amount, enpf.wage_ceiling, enpf.rate)
            : null,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load');
      } finally {
        setLoading(false);
      }
    })();
  }, [expenseId]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Create payslip" />
      {loading ? <ActivityIndicator color={Colors.gold} className="mt-8" /> : null}
      {error ? (
        <Typography variant="body" className="px-6 text-danger">
          {error}
        </Typography>
      ) : null}
      {employee && !loading ? (
        <ScrollView className="px-6 pb-12" keyboardShouldPersistTaps="handled">
          <PayslipForm
            employee={employee}
            periodStart={period.start}
            periodEnd={period.end}
            paymentDate={paymentDate}
            gross={gross}
            expenseId={expenseId}
            suggestedEnpf={suggested}
            suggestedEmployerEnpf={suggested}
          />
        </ScrollView>
      ) : null}
    </ScreenContainer>
  );
}
