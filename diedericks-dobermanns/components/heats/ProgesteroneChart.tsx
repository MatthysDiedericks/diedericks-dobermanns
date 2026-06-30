import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { progesteroneColor } from '@/lib/heats/calculations';
import type { ProgesteroneTest } from '@/lib/heats/constants';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface ProgesteroneChartProps {
  tests: ProgesteroneTest[];
}

export function ProgesteroneChart({ tests }: ProgesteroneChartProps) {
  if (tests.length === 0) {
    return (
      <Typography variant="caption" className="text-muted">
        No progesterone tests recorded.
      </Typography>
    );
  }

  const sorted = [...tests].sort((a, b) => a.date.localeCompare(b.date));
  const width = 300;
  const height = 120;
  const pad = 24;
  const maxVal = Math.max(...sorted.map((t) => t.value_ng_ml), 20);

  const points = sorted.map((t, i) => {
    const x = pad + (i / Math.max(sorted.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - (t.value_ng_ml / maxVal) * (height - pad * 2);
    return `${x},${y}`;
  });

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#8C847433" />
        {points.length >= 2 ? (
          <Polyline points={points.join(' ')} fill="none" stroke="#C4A35A" strokeWidth={2} />
        ) : null}
        {sorted.map((t, i) => {
          const x = pad + (i / Math.max(sorted.length - 1, 1)) * (width - pad * 2);
          const y = height - pad - (t.value_ng_ml / maxVal) * (height - pad * 2);
          return (
            <Circle key={t.date} cx={x} cy={y} r={5} fill={progesteroneColor(t.value_ng_ml)} />
          );
        })}
      </Svg>
      {sorted.map((t) => (
        <View key={t.date} className="flex-row justify-between border-b border-gold/10 py-2">
          <Typography variant="caption">{formatKennelDate(t.date)}</Typography>
          <Typography variant="body" style={{ color: progesteroneColor(t.value_ng_ml) }}>
            {t.value_ng_ml} ng/mL
          </Typography>
        </View>
      ))}
    </View>
  );
}
