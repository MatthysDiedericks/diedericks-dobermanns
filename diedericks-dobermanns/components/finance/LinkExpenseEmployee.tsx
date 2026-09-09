import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { linkExpenseEmployee } from '@/lib/finance/employeeQueries';
import { employeeDisplayName } from '@/lib/finance/staffCategory';
import type { Employee } from '@/types/employees';

export function LinkExpenseEmployee({
  expenseId,
  employees,
  onLinked,
}: {
  expenseId: string;
  employees: Employee[];
  onLinked?: (employeeId: string) => void;
}) {
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await linkExpenseEmployee(expenseId, picked);
      onLinked?.(picked);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not link');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="mt-2">
      <Typography variant="caption" className="mb-2 text-subtle">
        Link to employee
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {employees.map((person) => (
          <Pressable
            key={person.id}
            onPress={() => setPicked(person.id)}
            className={`rounded-full border px-3 py-1.5 ${
              picked === person.id ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{employeeDisplayName(person)}</Typography>
          </Pressable>
        ))}
        <Pressable
          onPress={() => void save()}
          disabled={busy || !picked}
          className="rounded-full border border-gold px-3 py-1.5"
        >
          <Typography variant="caption" className="text-gold">
            {busy ? 'Linking…' : 'Link'}
          </Typography>
        </Pressable>
      </View>
      {error ? (
        <Typography variant="caption" className="mt-1 text-danger">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
