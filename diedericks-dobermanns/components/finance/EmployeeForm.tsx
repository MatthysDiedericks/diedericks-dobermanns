import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { saveEmployee } from '@/lib/finance/employeeQueries';
import type { Employee } from '@/types/employees';

export function EmployeeForm({ existing }: { existing?: Employee }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(existing?.full_name ?? '');
  const [preferredName, setPreferredName] = useState(existing?.preferred_name ?? '');
  const [jobTitle, setJobTitle] = useState(existing?.job_title ?? '');
  const [nationalId, setNationalId] = useState(existing?.national_id ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [startDate, setStartDate] = useState(existing?.start_date ?? '');
  const [endDate, setEndDate] = useState(existing?.end_date ?? '');
  const [salary, setSalary] = useState(
    existing?.monthly_salary != null ? String(existing.monthly_salary) : '',
  );
  const [currency, setCurrency] = useState(existing?.currency ?? 'SZL');
  const [enpfMember, setEnpfMember] = useState(existing?.enpf_member ?? true);
  const [paymentRef, setPaymentRef] = useState(existing?.payment_reference ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await saveEmployee(
        {
          full_name: fullName,
          preferred_name: preferredName,
          job_title: jobTitle,
          national_id: nationalId,
          email,
          phone,
          start_date: startDate,
          end_date: endDate,
          monthly_salary: salary ? Number(salary) : null,
          currency,
          enpf_member: enpfMember,
          payment_reference: paymentRef,
          notes,
          is_active: isActive,
        },
        existing?.id,
      );
      router.replace(`/(admin)/finance/employees/${id}` as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Input label="Full name" value={fullName} onChangeText={setFullName} />
      <Input label="Preferred name" value={preferredName} onChangeText={setPreferredName} />
      <Input label="Job title" value={jobTitle} onChangeText={setJobTitle} />
      <Input label="National ID" value={nationalId} onChangeText={setNationalId} />
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <Input label="Phone" value={phone} onChangeText={setPhone} />
      <DateField label="Start date" value={startDate} onChange={setStartDate} optional />
      <DateField label="End date" value={endDate} onChange={setEndDate} optional />
      <Input label="Monthly salary" value={salary} onChangeText={setSalary} keyboardType="decimal-pad" />
      <Input label="Currency" value={currency} onChangeText={setCurrency} />
      <Input label="Payment reference" value={paymentRef} onChangeText={setPaymentRef} />
      <Input label="Notes" value={notes} onChangeText={setNotes} />
      <View className="mb-3 flex-row items-center justify-between">
        <Typography variant="body">ENPF member</Typography>
        <Switch value={enpfMember} onValueChange={setEnpfMember} />
      </View>
      <View className="mb-4 flex-row items-center justify-between">
        <Typography variant="body">Active</Typography>
        <Switch value={isActive} onValueChange={setIsActive} />
      </View>
      {error ? (
        <Typography variant="caption" className="mb-3 text-danger">
          {error}
        </Typography>
      ) : null}
      <Button label={busy ? 'Saving…' : existing ? 'Save' : 'Add employee'} onPress={() => void submit()} loading={busy} fullWidth />
    </View>
  );
}
