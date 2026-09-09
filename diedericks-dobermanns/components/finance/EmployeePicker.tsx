import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  employeeDisplayName,
  isStaffCategory,
  salaryDescription,
} from '@/lib/finance/staffCategory';
import type { Employee } from '@/types/employees';

export function EmployeePicker({
  categoryId,
  employeeId,
  employees,
  onSelect,
}: {
  categoryId: string;
  employeeId: string;
  employees: Employee[];
  onSelect: (next: { employeeId: string; description?: string; amount?: string }) => void;
}) {
  if (!isStaffCategory(categoryId)) return null;

  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2">
        Employee
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => onSelect({ employeeId: '' })}
          className={`rounded-full border px-3 py-2 ${
            !employeeId ? 'border-gold bg-gold/15' : 'border-gold/30'
          }`}
        >
          <Typography variant="caption">None — not a salary</Typography>
        </Pressable>
        {employees.map((person) => (
          <Pressable
            key={person.id}
            onPress={() =>
              onSelect({
                employeeId: person.id,
                description: salaryDescription(employeeDisplayName(person)),
                amount:
                  person.monthly_salary != null ? String(person.monthly_salary) : undefined,
              })
            }
            className={`rounded-full border px-3 py-2 ${
              employeeId === person.id ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{employeeDisplayName(person)}</Typography>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
