import { useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { View } from 'react-native';

import { AgreementBox } from '@/components/forms/ApplicationForm/AgreementBox';
import { Typography } from '@/components/ui/Typography';
import type { ApplicationFormValues } from '@/components/forms/ApplicationForm/schema';

const AGE_BRACKETS = [
  { key: 'under_5', label: 'Under 5 years old' },
  { key: 'five_plus', label: '5 years old or older' },
] as const;

const QUANTITIES = [
  { key: '1', label: '1' },
  { key: '2', label: '2' },
  { key: '3', label: '3' },
  { key: '4', label: '4' },
  { key: '5_plus', label: '5 or more' },
] as const;

function composeSummary(brackets: Set<string>, quantity: string | null): string {
  if (brackets.size === 0 && !quantity) return '';
  const ageLabels = AGE_BRACKETS.filter((b) => brackets.has(b.key)).map((b) => b.label);
  const qtyLabel = quantity ? QUANTITIES.find((q) => q.key === quantity)?.label : null;
  const parts: string[] = [];
  if (qtyLabel) parts.push(`${qtyLabel} ${qtyLabel === '1' ? 'child' : 'children'}`);
  if (ageLabels.length) parts.push(`ages: ${ageLabels.join(' & ')}`);
  return parts.join(', ');
}

interface Props {
  control: Control<ApplicationFormValues>;
  name: 'children_ages';
}

/**
 * Tick-box picker for children in the household — age bracket(s, multi-select)
 * and headcount (single-select). Composes into the plain `children_ages` text
 * column so nothing downstream (admin review, Step6Review) needs to change.
 */
export function ChildrenField({ control, name }: Props) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange } }) => {
        return <ChildrenFieldBody onChange={onChange} />;
      }}
    />
  );
}

function ChildrenFieldBody({ onChange }: { onChange: (v: string) => void }) {
  const [brackets, setBrackets] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState<string | null>(null);

  function toggleBracket(key: string) {
    setBrackets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onChange(composeSummary(next, quantity));
      return next;
    });
  }

  function pickQuantity(key: string) {
    setQuantity((prev) => {
      const next = prev === key ? null : key;
      onChange(composeSummary(brackets, next));
      return next;
    });
  }

  return (
    <View className="mb-4">
      <Typography variant="body" className="mb-2 font-semibold">
        Children in the household
      </Typography>
      <Typography variant="caption" className="mb-3 text-silver">
        Optional — tick all that apply. This helps us match you with the right dog.
      </Typography>

      {AGE_BRACKETS.map((b) => (
        <AgreementBox
          key={b.key}
          title={b.label}
          description=""
          checked={brackets.has(b.key)}
          onPress={() => toggleBracket(b.key)}
        />
      ))}

      {brackets.size > 0 ? (
        <>
          <Typography variant="caption" className="mb-2 mt-2 text-silver">
            How many children?
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            {QUANTITIES.map((q) => {
              const active = quantity === q.key;
              return (
                <AgreementBox
                  key={q.key}
                  title={q.label}
                  description=""
                  checked={active}
                  onPress={() => pickQuantity(q.key)}
                />
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}
