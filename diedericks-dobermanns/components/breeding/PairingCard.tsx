import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { LINE_COLORS, PRIORITY_STYLES } from '@/lib/breeding/constants';
import { healthGatePassed, healthGatePending } from '@/lib/breeding/rules';
import type { PairingRecord } from '@/types/breeding';

function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Active;
  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: style.bg }}>
      <Typography variant="caption" style={{ color: style.text, fontSize: 9 }}>
        {style.label}
      </Typography>
    </View>
  );
}

function LineBadge({ line }: { line: string }) {
  const color = LINE_COLORS[line as keyof typeof LINE_COLORS] ?? LINE_COLORS.Unknown;
  return (
    <View className="rounded-full border px-2 py-0.5" style={{ borderColor: color }}>
      <Typography variant="caption" style={{ color }}>
        Line {line}
      </Typography>
    </View>
  );
}

function HealthStatus({ pairing }: { pairing: PairingRecord }) {
  const sire = pairing.sire;
  const dam = pairing.dam;
  if (!sire || !dam) {
    return (
      <Typography variant="caption" className="text-subtle">
        Health data loading…
      </Typography>
    );
  }
  const bothClear = healthGatePassed(sire) && healthGatePassed(dam);
  const pending = healthGatePending(sire) || healthGatePending(dam);
  if (bothClear) {
    return (
      <Typography variant="caption" className="text-success">
        ✓ Both cleared
      </Typography>
    );
  }
  if (pending) {
    return (
      <Typography variant="caption" className="text-gold">
        ⚠ Pending tests
      </Typography>
    );
  }
  return (
    <Typography variant="caption" className="text-danger">
      ✗ Health gate not passed
    </Typography>
  );
}

interface PairingCardProps {
  pairing: PairingRecord;
  onAction?: () => void;
  actionLabel?: string;
}

export function PairingCard({ pairing, onAction, actionLabel }: PairingCardProps) {
  const sireName = pairing.sire?.name ?? 'Unknown sire';
  const damName = pairing.dam?.name ?? 'Unknown dam';
  const isProhibited = pairing.status === 'Prohibited' || pairing.priority === 'Prohibited';

  return (
    <Card className="mb-3">
      <View className="mb-2 flex-row flex-wrap items-center gap-2">
        <PriorityBadge priority={isProhibited ? 'Prohibited' : pairing.priority} />
        <LineBadge line={pairing.line} />
        {isProhibited ? (
          <Typography variant="caption" className="text-danger">
            ✗
          </Typography>
        ) : null}
      </View>

      <Typography variant="subtitle" className="mb-1">
        {sireName} × {damName}
      </Typography>

      {pairing.notes ? (
        <Typography variant="caption" className="mb-2 text-subtle">
          {pairing.notes}
        </Typography>
      ) : null}

      {!isProhibited ? <HealthStatus pairing={pairing} /> : null}

      {isProhibited ? (
        <Typography variant="caption" className="mt-1 text-danger">
          {pairing.notes}
        </Typography>
      ) : null}

      {onAction && actionLabel ? (
        <Button label={actionLabel} variant="outline" size="sm" onPress={onAction} className="mt-3" />
      ) : null}
    </Card>
  );
}
