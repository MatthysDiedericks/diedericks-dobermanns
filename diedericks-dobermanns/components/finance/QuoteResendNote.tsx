import { TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

export function QuoteResendNote({
  changeNote,
  onChangeNote,
  busy,
  phoneDisabled,
  emailDisabled,
  onResendWhatsApp,
  onResendEmail,
  onCancel,
  blockedReason,
}: {
  changeNote: string;
  onChangeNote: (v: string) => void;
  busy: boolean;
  phoneDisabled: boolean;
  emailDisabled: boolean;
  onResendWhatsApp: () => void;
  onResendEmail: () => void;
  onCancel: () => void;
  blockedReason?: string | null;
}) {
  return (
    <Card>
      <Typography variant="label" className="mb-2">
        Change note for the client
      </Typography>
      <TextInput
        value={changeNote}
        onChangeText={onChangeNote}
        multiline
        placeholder="Revised to include delivery…"
        placeholderTextColor={Colors.silver}
        className="min-h-[80px] rounded-xl border border-gold/20 bg-surface px-3 py-2 font-body text-ink"
      />
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Button
          label="Resend WhatsApp"
          onPress={onResendWhatsApp}
          loading={busy}
          disabled={phoneDisabled}
        />
        <Button
          label="Resend Email"
          variant="outline"
          onPress={onResendEmail}
          loading={busy}
          disabled={emailDisabled}
        />
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
      </View>
      {blockedReason ? (
        <Typography variant="caption" className="mt-2 text-gold">
          {blockedReason}
        </Typography>
      ) : null}
    </Card>
  );
}
