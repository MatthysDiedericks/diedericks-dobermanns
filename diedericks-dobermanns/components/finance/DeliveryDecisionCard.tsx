import { Pressable, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  DELIVERY_DECISIONS,
  type DeliveryDecision,
} from '@/lib/finance/catalogue';

export function DeliveryDecisionCard({
  decision,
  note,
  reason,
  exportPrompt,
  onDecisionChange,
  onNoteChange,
  onDismissExportPrompt,
}: {
  decision: DeliveryDecision | null;
  note: string;
  reason: string | null;
  exportPrompt: string | null;
  onDecisionChange: (d: DeliveryDecision | null) => void;
  onNoteChange: (n: string) => void;
  onDismissExportPrompt: () => void;
}) {
  return (
    <Card nativeID="quote-delivery-decision" className="gap-3 p-4">
      <Typography variant="subtitle" className="text-gold">
        Delivery decision
      </Typography>
      <Typography variant="caption" className="text-ink-muted">
        Required before send. Saving a draft undecided is fine.
      </Typography>
      {decision == null ? (
        <Typography variant="caption" className="text-gold">
          Undecided — required before send
        </Typography>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => onDecisionChange(null)}
          className={`rounded-lg border px-2.5 py-1.5 ${
            decision == null ? 'border-gold bg-gold/15' : 'border-gold/20'
          }`}
        >
          <Typography variant="caption" className={decision == null ? 'text-gold' : 'text-ink-muted'}>
            Undecided
          </Typography>
        </Pressable>
        {DELIVERY_DECISIONS.map((d) => {
          const active = decision === d.value;
          return (
            <Pressable
              key={d.value}
              onPress={() => onDecisionChange(d.value)}
              className={`rounded-lg border px-2.5 py-1.5 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/20'
              }`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {d.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      {reason ? (
        <Typography variant="caption" className="text-ink-muted">
          {reason}
        </Typography>
      ) : null}
      <TextInput
        value={note}
        onChangeText={onNoteChange}
        placeholder="Delivery note (prints under the line)"
        placeholderTextColor={Colors.silver}
        multiline
        className="min-h-[56px] rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
      />
      {exportPrompt ? (
        <View className="rounded-lg border border-gold/30 bg-background p-3">
          <Typography variant="bodyMuted">{exportPrompt}</Typography>
          <Pressable onPress={onDismissExportPrompt} className="mt-2">
            <Typography variant="caption" className="text-gold">
              Dismiss
            </Typography>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
