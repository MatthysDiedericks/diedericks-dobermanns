import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useEmployee } from '@/hooks/useEmployees';
import {
  fetchEmployeeExpenses,
  fetchEmployeePayslips,
} from '@/lib/finance/employeeQueries';
import { expenseGross } from '@/lib/finance/expenseGross';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { sharePayslipPdf } from '@/lib/finance/generatePayslipPdf';
import { formatPayslipAmount } from '@/lib/finance/payslip';
import { employeeDisplayName } from '@/lib/finance/staffCategory';
import type { Payslip } from '@/types/employees';
import type { Expense } from '@/types/finance';

export default function EmployeeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const employeeId = id ?? '';
  const { employee, loading, refresh } = useEmployee(employeeId);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  const loadRelated = useCallback(async () => {
    if (!employeeId) return;
    const [pay, slips] = await Promise.all([
      fetchEmployeeExpenses(employeeId),
      fetchEmployeePayslips(employeeId),
    ]);
    setExpenses(pay);
    setPayslips(slips);
  }, [employeeId]);

  useEffect(() => {
    void loadRelated();
  }, [loadRelated]);

  const year = new Date().getFullYear();
  const yearTotal = expenses
    .filter((e) => e.expense_date.startsWith(String(year)))
    .reduce((sum, e) => sum + expenseGross(e), 0);

  return (
    <ScreenContainer>
      <PageHeader
        eyebrow="Finance"
        title={employee ? employeeDisplayName(employee) : 'Employee'}
      />
      <ScrollView
        className="px-6 pb-12"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              void refresh();
              void loadRelated();
            }}
          />
        }
      >
        {employee ? (
          <Card className="mb-4">
            <Typography variant="caption" className="text-subtle">
              {employee.job_title || 'No title'} · {employee.is_active ? 'Active' : 'Ended'}
            </Typography>
            <Typography variant="body" className="mt-2">
              Monthly{' '}
              {employee.monthly_salary != null
                ? formatPayslipAmount(employee.monthly_salary, employee.currency)
                : '—'}
            </Typography>
            <Typography variant="body">
              {year} total (linked expenses): {formatAmount(yearTotal)}
            </Typography>
            <View className="mt-3">
              <Button
                label="Edit"
                variant="outline"
                onPress={() =>
                  router.push(`/(admin)/finance/employees/${employeeId}/edit` as never)
                }
              />
            </View>
          </Card>
        ) : null}

        <Typography variant="label" className="mb-2 text-gold">
          Pay history
        </Typography>
        {expenses.map((e) => (
          <Pressable
            key={e.id}
            onPress={() =>
              router.push({
                pathname: '/(admin)/finance/expenses/new',
                params: { expenseId: e.id },
              } as never)
            }
            className="mb-2"
          >
            <Card className="flex-row justify-between">
              <Typography variant="caption">
                {e.description} · {formatDate(e.expense_date)}
              </Typography>
              <Typography variant="caption" className="text-gold">
                {formatAmount(expenseGross(e))}
              </Typography>
            </Card>
          </Pressable>
        ))}
        {expenses.length === 0 ? (
          <Typography variant="caption" className="mb-4 text-subtle">
            No linked salary expenses yet.
          </Typography>
        ) : null}

        <Typography variant="label" className="mb-2 mt-4 text-gold">
          Payslips
        </Typography>
        {payslips.map((p) => (
          <Pressable key={p.id} onPress={() => void sharePayslipPdf(p.id)} className="mb-2">
            <Card className="flex-row justify-between">
              <Typography variant="caption">
                {formatDate(p.period_start)} – {formatDate(p.period_end)}
              </Typography>
              <Typography variant="caption" className="text-gold">
                {formatPayslipAmount(p.net, p.currency)}
              </Typography>
            </Card>
          </Pressable>
        ))}
        {payslips.length === 0 ? (
          <Typography variant="caption" className="text-subtle">
            No payslips yet. Create one from a linked Staff expense.
          </Typography>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
