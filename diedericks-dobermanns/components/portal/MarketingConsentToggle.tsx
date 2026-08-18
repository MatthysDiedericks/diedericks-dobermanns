import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { MARKETING_CONSENT_LABEL } from '@/lib/marketing/sources';
import { requireSupabase } from '@/lib/supabase';

export function MarketingConsentToggle({
  initial,
}: {
  initial: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save(next: boolean) {
    setSaving(true);
    try {
      const { error } = await requireSupabase().rpc('set_my_marketing_opt_in' as never, {
        p_opt_in: next,
      } as never);
      if (error) throw new Error(error.message);
      setValue(next);
      showSaved('Saved ✓');
    } catch {
      showError('Could not save — try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="mb-6 rounded-2xl border border-gold/15 bg-black-rich p-4">
      <Typography variant="label" className="mb-2 text-gold">
        NEWS AND LITTERS
      </Typography>
      <Pressable
        onPress={() => void save(!value)}
        disabled={saving}
        className="flex-row items-start gap-3"
      >
        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
            value ? 'border-gold bg-gold' : 'border-gold/40'
          }`}
        >
          {value ? (
            <Typography variant="caption" className="font-bold text-black">
              ✓
            </Typography>
          ) : null}
        </View>
        <Typography variant="body" className="flex-1">
          {MARKETING_CONSENT_LABEL}
        </Typography>
      </Pressable>
      <Button
        label={saving ? 'Saving…' : 'Save preference'}
        variant="outline"
        className="mt-3"
        onPress={() => void save(value)}
        loading={saving}
        fullWidth
      />
    </View>
  );
}
