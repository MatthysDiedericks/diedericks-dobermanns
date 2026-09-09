import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { createPayslip } from '@/lib/finance/employeeQueries';
import { sharePayslipPdf } from '@/lib/finance/generatePayslipPdf';
import {
  emptyPayeLine,
  formatPayslipAmount,
  payslipNet,
  suggestedEnpfLine,
} from '@/lib/finance/payslip';
import { employeeDisplayName } from '@/lib/finance/staffCategory';
import type { Employee, PayslipDeduction } from '@/types/employees';

export function PayslipForm({
  employee,
  periodStart,
  periodEnd,
  paymentDate,
  gross: initialGross,
  expenseId,
  suggestedEnpf,
  suggestedEmployerEnpf,
}: {
  employee: Employee;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  gross: number;
  expenseId?: string | null;
  suggestedEnpf: number | null;
  suggestedEmployerEnpf: number | null;
}) {
  const router = useRouter();
  const [start, setStart] = useState(periodStart);
  const [end, setEnd] = useState(periodEnd);
  const [paidOn, setPaidOn] = useState(paymentDate);
  const [gross, setGross] = useState(String(initialGross || ''));
  const [rate, setRate] = useState('');
  const [hours, setHours] = useState('');
  const [employerEnpf, setEmployerEnpf] = useState(
    suggestedEmployerEnpf != null ? String(suggestedEmployerEnpf) : '',
  );
  const [deductions, setDeductions] = useState<PayslipDeduction[]>(() => {
    const rows: PayslipDeduction[] = [emptyPayeLine()];
    if (suggestedEnpf != null) rows.push(suggestedEnpfLine(suggestedEnpf));
    return rows;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const grossNum = Number(gross) || 0;
  const net = useMemo(() => payslipNet(grossNum, deductions), [grossNum, deductions]);
  const currency = employee.currency || 'SZL';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await createPayslip({
        employee_id: employee.id,
        period_start: start,
        period_end: end,
        payment_date: paidOn,
        currency,
        gross: grossNum,
        deductions,
        net,
        employer_enpf: employerEnpf ? Number(employerEnpf) : null,
        expense_id: expenseId ?? null,
        rate_of_pay: rate ? Number(rate) : null,
        hours_worked: hours ? Number(hours) : null,
      });
      await sharePayslipPdf(id);
      router.replace(`/(admin)/finance/employees/${employee.id}` as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create payslip');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Typography variant="body" className="mb-2">
        {employeeDisplayName(employee)}
        {employee.job_title ? ` · ${employee.job_title}` : ''}
      </Typography>
      <Typography variant="caption" className="mb-2 text-subtle">
        You enter PAYE yourself — confirm the figure with your accountant or the Eswatini Revenue Service.
      </Typography>
      <Typography variant="caption" className="mb-4 text-subtle">
        Have your accountant confirm this against the Employment Act before you rely on it.
      </Typography>
      <DateField label="Period start" value={start} onChange={setStart} />
      <DateField label="Period end" value={end} onChange={setEnd} />
      <DateField label="Payment date" value={paidOn} onChange={setPaidOn} />
      <Input label="Gross" value={gross} onChangeText={setGross} keyboardType="decimal-pad" />
      <Input label="Rate of pay (optional)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
      <Input label="Hours worked (optional)" value={hours} onChangeText={setHours} keyboardType="decimal-pad" />
      <Typography variant="label" className="mb-2">
        Deductions
      </Typography>
      {suggestedEnpf != null ? (
        <Typography variant="caption" className="mb-2 text-subtle">
          ENPF is a suggestion from this year&apos;s ceiling — change or remove it.
        </Typography>
      ) : null}
      {deductions.map((row, i) => (
        <View key={`${row.label}-${i}`} className="mb-2 flex-row gap-2">
          <Input
            value={row.label}
            onChangeText={(v) =>
              setDeductions((rows) => rows.map((r, idx) => (idx === i ? { ...r, label: v } : r)))
            }
            containerClassName="flex-1 mb-0"
          />
          <Input
            value={row.amount ? String(row.amount) : ''}
            onChangeText={(v) =>
              setDeductions((rows) =>
                rows.map((r, idx) => (idx === i ? { ...r, amount: Number(v) || 0 } : r)),
              )
            }
            keyboardType="decimal-pad"
            containerClassName="w-28 mb-0"
          />
          <Pressable
            onPress={() => setDeductions((rows) => rows.filter((_, idx) => idx !== i))}
            className="justify-center"
          >
            <Typography variant="caption" className="text-gold">
              Remove
            </Typography>
          </Pressable>
        </View>
      ))}
      <Input
        label="Employer ENPF (not deducted from net)"
        value={employerEnpf}
        onChangeText={setEmployerEnpf}
        keyboardType="decimal-pad"
      />
      <Typography variant="label" className="mb-4 text-gold">
        Net {formatPayslipAmount(net, currency)}
      </Typography>
      {error ? (
        <Typography variant="caption" className="mb-3 text-danger">
          {error}
        </Typography>
      ) : null}
      <Button label={busy ? 'Saving…' : 'Create payslip'} onPress={() => void submit()} loading={busy} fullWidth />
    </View>
  );
}
