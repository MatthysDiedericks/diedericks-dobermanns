import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { STEP_STATUS_LABELS, type StepStatus } from '@/lib/breeding/planTypes';

const PILL: Record<StepStatus, { bg: string; text: string }> = {
  planned: { bg: '#2E2B1E', text: '#9E9880' },
  ready: { bg: '#C4A35A33', text: '#C4A35A' },
  in_progress: { bg: '#C4A35A33', text: '#D4B472' },
  done: { bg: '#14532D', text: '#86EFAC' },
  blocked: { bg: '#7F1D1D', text: '#FCA5A5' },
  skipped: { bg: '#1C1A0E', text: '#5C5746' },
};

export function PlanStatusPill({ status }: { status: StepStatus }) {
  const style = PILL[status];
  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: style.bg }}>
      <Typography variant="caption" style={{ color: style.text, fontSize: 10 }}>
        {STEP_STATUS_LABELS[status]}
      </Typography>
    </View>
  );
}
