import type { BreedingLine } from '@/types/breeding';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';

const LINE_BADGE_COLORS: Record<string, string> = {
  A: '#C4A35A',
  B: '#22d3ee',
  Cross: '#f97316',
};

interface LineBadgeProps {
  line: string | null;
  compact?: boolean;
}

export function LineBadge({ line, compact }: LineBadgeProps) {
  if (!line || line === 'Unknown') return null;
  const color = LINE_BADGE_COLORS[line] ?? '#6b7280';
  const label = line === 'Cross' ? 'LINE CROSS' : `LINE ${line.toUpperCase()}`;

  return (
    <View
      style={{
        backgroundColor: `${color}22`,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: compact ? 4 : 6,
        paddingVertical: 2,
        marginLeft: compact ? 4 : 6,
      }}
    >
      <Typography variant="caption" style={{ color, fontSize: compact ? 9 : 10 }}>
        {label}
      </Typography>
    </View>
  );
}

export function lineChipBorder(line: BreedingLine | null | undefined): string {
  if (line === 'A') return '#C4A35A';
  if (line === 'B') return '#22d3ee';
  if (line === 'Cross') return '#f97316';
  return '#6b7280';
}

export function lineShortLabel(line: BreedingLine | null | undefined): string | null {
  if (!line || line === 'Unknown') return null;
  return line;
}

export function suggestPairingLine(
  sireLine: BreedingLine | null,
  damLine: BreedingLine | null,
): 'A' | 'B' | 'Cross' {
  if (
    sireLine === damLine &&
    sireLine !== null &&
    sireLine !== 'Unknown'
  ) {
    if (sireLine === 'A' || sireLine === 'B') return sireLine;
    return 'Cross';
  }
  return 'Cross';
}

export function pairingLineSuggestionNote(
  sireLine: BreedingLine | null,
  damLine: BreedingLine | null,
): string {
  const suggested = suggestPairingLine(sireLine, damLine);
  if (
    sireLine === damLine &&
    sireLine !== null &&
    sireLine !== 'Unknown' &&
    (sireLine === 'A' || sireLine === 'B')
  ) {
    return `💡 Suggested: Line ${suggested} (same-line pairing)`;
  }
  return `💡 Suggested: Line ${suggested} (different lines selected)`;
}
