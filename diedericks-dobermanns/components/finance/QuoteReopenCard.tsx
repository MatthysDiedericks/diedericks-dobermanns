import { TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

export function QuoteReopenCard({
  reason,
  onChangeReason,
  busy,
  onConfirm,
  onCancel,
}: {
  reason: string;
  onChangeReason: (v: string) => void;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <Typography variant="label" className="mb-2">
        Reason for reopening
      </Typography>
      <TextInput
        value={reason}
        onChangeText={onChangeReason}
        multiline
        placeholder="Client asked to add delivery…"
        placeholderTextColor={Colors.silver}
        className="min-h-[64px] rounded-xl border border-gold/20 bg-surface px-3 py-2 font-body text-ink"
      />
      <View className="mt-3 flex-row gap-2">
        <Button label="Reopen to sent" onPress={onConfirm} loading={busy} />
        <Button label="Cancel" variant="outline" onPress={onCancel} />
      </View>
    </Card>
  );
}
