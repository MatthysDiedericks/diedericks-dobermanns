import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { coiBadgeClasses } from '@/lib/breeding/coiDisplay';
import { severityFromCoi } from '@/lib/breeding/coi';
import type { TrialPairing } from '@/hooks/useTrialPairings';

function formatTargetDate(value: string | null): string {
  if (!value) return 'No target date';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
}

interface TrialPairingCardProps {
  trial: TrialPairing;
  onDelete: (id: string) => void;
  onPromote: (id: string) => void;
}

export function TrialPairingCard({ trial, onDelete, onPromote }: TrialPairingCardProps) {
  const sireName = trial.sire?.name ?? 'Unknown sire';
  const damName = trial.dam?.name ?? 'Unknown dam';
  const coiValue = trial.coi_result?.coi ?? trial.coi_estimate;
  const severity = trial.coi_result?.severity ?? (coiValue != null ? severityFromCoi(coiValue) : null);
  const badge = severity && coiValue != null ? coiBadgeClasses(severity) : null;
  const note = trial.trial_notes ?? trial.notes;

  const confirmDelete = () => {
    Alert.alert('Remove Trial?', 'This trial pairing will be discarded.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void onDelete(trial.id) },
    ]);
  };

  return (
    <Card className="mb-3 border border-gold/20 bg-black-rich">
      <View className="mb-3 flex-row items-start justify-between gap-2">
        <Typography variant="label" className="text-gold">
          GEN {trial.trial_generation} TRIAL
        </Typography>
        {badge && coiValue != null ? (
          <View className={`rounded-full border px-2 py-0.5 ${badge.container}`}>
            <Typography variant="caption" className={badge.text}>
              COI {coiValue}%
              {severity === 'caution' || severity === 'risk' || severity === 'high_risk' ? ' ⚠' : ''}
            </Typography>
          </View>
        ) : null}
      </View>

      <Typography variant="subtitle" className="mb-1">
        {sireName} × {damName}
      </Typography>
      <Typography variant="caption" className="mb-2 text-ink-muted">
        Line {trial.line} · Target: {formatTargetDate(trial.target_date)}
      </Typography>
      {note ? (
        <Typography variant="caption" className="mb-3 text-subtle">
          {note}
        </Typography>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        <Button label="Promote to Plan" size="sm" variant="outline" onPress={() => void onPromote(trial.id)} />
        <Button label="✕ Remove" size="sm" variant="ghost" onPress={confirmDelete} />
      </View>
    </Card>
  );
}
