import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { PedigreeAncestor } from '@/hooks/useDogPedigree';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface PedigreeNodeProps {
  label: string;
  titlesHealth?: string | null;
  dateOfBirth?: string | null;
  wrightsCoi?: number | null;
  sireSide?: boolean;
  emphasis?: boolean;
  onPress?: () => void;
}

export function PedigreeNode({
  label,
  titlesHealth,
  dateOfBirth,
  wrightsCoi,
  sireSide,
  emphasis,
  onPress,
}: PedigreeNodeProps) {
  const border = sireSide === undefined ? 'border-gold/15' : sireSide ? 'border-cyan-500/35' : 'border-rose-400/25';
  const content = (
    <View
      className={`flex-1 justify-center rounded-lg border bg-black-rich px-2 py-2 ${border} ${
        onPress ? 'border-gold/40' : ''
      }`}
    >
      <Typography variant={emphasis ? 'subtitle' : 'caption'} numberOfLines={3}>
        {label.trim() || 'Unknown'}
      </Typography>
      {titlesHealth?.trim() ? (
        <Typography variant="caption" className="mt-0.5 text-gold" numberOfLines={2}>
          {titlesHealth.trim()}
        </Typography>
      ) : null}
      {dateOfBirth ? (
        <Typography variant="caption" className="mt-0.5 text-muted">
          {formatKennelDate(dateOfBirth)}
        </Typography>
      ) : null}
      {wrightsCoi != null && Number.isFinite(wrightsCoi) ? (
        <Typography variant="caption" className="mt-0.5 text-muted">
          COI {wrightsCoi.toFixed(2)}%
        </Typography>
      ) : null}
      {onPress ? (
        <Typography variant="caption" className="mt-1 text-gold">
          View profile →
        </Typography>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function ancestorNodeLabel(a: PedigreeAncestor): string {
  return a.registeredName?.trim() || 'Unknown';
}

export function subjectNodeLabel(registeredName: string | null, fallbackName: string): string {
  return registeredName?.trim() || fallbackName;
}

/** Sire-side = position is all S path from root (starts with S). */
export function ancestorIsSireSide(position: string): boolean {
  return position.startsWith('S');
}

export const PEDIGREE_NODE_MIN_HEIGHT = 56;
export const PEDIGREE_COLUMN_WIDTH = 132;
