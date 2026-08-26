import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { optionsFor } from '@/components/forms/ApplicationForm/labels';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { saveMyApplicationAmendment } from '@/lib/applications/amendments';
import {
  FREE_FIELDS,
  REAPPROVAL_FIELDS,
  REAPPROVAL_NOTE,
  fieldLabel,
} from '@/lib/applications/fieldTiers';

const TEXT_AREA = new Set(['address', 'special_requests', 'security_requirements']);
const SELECTS = new Set([
  'dog_interest',
  'preferred_sex',
  'preferred_colour',
  'tail_preference',
  'preferred_timeline',
  'budget_range',
  'purpose',
]);

type Values = Record<string, string | boolean | null>;

export function UpdateDetailsForm({
  applicationId,
  initial,
  onSaved,
}: {
  applicationId: string;
  initial: Values;
  onSaved?: (message?: string) => void;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const patch: Record<string, unknown> = {};
    for (const field of [...FREE_FIELDS, ...REAPPROVAL_FIELDS]) {
      if (String(values[field] ?? '') !== String(initial[field] ?? '')) {
        patch[field] = values[field] ?? null;
      }
    }
    if (Object.keys(patch).length === 0) {
      setBusy(false);
      setNotice('Nothing changed.');
      return;
    }
    const res = await saveMyApplicationAmendment(applicationId, patch);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setNotice(res.message ?? 'Saved.');
    onSaved?.(res.message);
  }

  return (
    <View>
      <Typography variant="label" className="mb-3">
        Contact
      </Typography>
      {FREE_FIELDS.map((field) => (
        <Input
          key={field}
          label={fieldLabel(field)}
          value={String(values[field] ?? '')}
          onChangeText={(t) => setValues((p) => ({ ...p, [field]: t }))}
          multiline={TEXT_AREA.has(field)}
          keyboardType={
            field === 'email' ? 'email-address' : field.includes('phone') ? 'phone-pad' : 'default'
          }
          autoCapitalize={field === 'email' ? 'none' : 'sentences'}
        />
      ))}

      <Typography variant="label" className="mb-1 mt-4">
        Preferences
      </Typography>
      <Typography variant="caption" className="mb-3">
        {REAPPROVAL_NOTE}
      </Typography>
      {REAPPROVAL_FIELDS.map((field) => {
        if (field === 'training_planned') {
          const on = Boolean(values[field]);
          return (
            <Pressable
              key={field}
              onPress={() => setValues((p) => ({ ...p, [field]: !on }))}
              className="mb-4 flex-row items-center justify-between rounded-xl border border-gold/20 bg-surface px-4 py-3"
            >
              <Typography variant="body">{fieldLabel(field)}</Typography>
              <View className={`h-6 w-11 rounded-full p-0.5 ${on ? 'bg-gold' : 'bg-black-rich'}`}>
                <View className={`h-5 w-5 rounded-full bg-ink ${on ? 'ml-auto' : ''}`} />
              </View>
            </Pressable>
          );
        }
        if (SELECTS.has(field)) {
          return (
            <ChipSelect
              key={field}
              label={fieldLabel(field)}
              value={String(values[field] ?? '')}
              options={optionsFor(field as never)}
              onChange={(v) => setValues((p) => ({ ...p, [field]: v }))}
            />
          );
        }
        return (
          <Input
            key={field}
            label={fieldLabel(field)}
            value={String(values[field] ?? '')}
            onChangeText={(t) => setValues((p) => ({ ...p, [field]: t }))}
            multiline={TEXT_AREA.has(field)}
          />
        );
      })}

      {error ? <Typography variant="body" className="mb-2 text-danger">{error}</Typography> : null}
      {notice ? <Typography variant="body" className="mb-2 text-gold">{notice}</Typography> : null}
      <Button label={busy ? 'Saving…' : 'Save'} onPress={() => void save()} loading={busy} fullWidth />
    </View>
  );
}

function ChipSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-4">
      <Typography variant="caption" className="mb-2">
        {label}
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              className={`rounded-xl border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {o.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
