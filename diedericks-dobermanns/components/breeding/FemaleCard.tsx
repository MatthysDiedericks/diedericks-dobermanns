import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { FEMALE_CARD_SIZE } from '@/lib/breeding/constants';
import { plannerLineColour } from '@/lib/breeding/coi';
import type { CardLayout, PairingWithCoi, PlannerDog } from '@/types/breeding';

interface FemaleCardProps {
  female: PlannerDog;
  pairing?: PairingWithCoi;
  locked?: boolean;
  onPress?: () => void;
  onLayout?: (layout: CardLayout) => void;
}

function statusLabel(pairing?: PairingWithCoi, locked?: boolean): string {
  if (locked) return 'Awaiting Gen 2 Line B Sire';
  if (!pairing) return 'Unassigned';
  if (pairing.status === 'Prohibited') return 'Prohibited';
  if (pairing.priority === 'Future') return '📅 Future';
  if (pairing.priority === 'Urgent' || pairing.priority === 'Critical') return '⚠ Urgent';
  if (pairing.status === 'Completed') return 'Completed';
  return '✓ Active';
}

export function FemaleCard({ female, pairing, locked, onPress, onLayout }: FemaleCardProps) {
  const coi = pairing?.coi.coi;
  const coiColor = coi != null ? plannerLineColour(coi) : '#6B7280';

  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout)}
      className="mb-3 flex-row items-center rounded-xl border border-gold/15 bg-[#111008] p-2"
    >
      <View
        className="mr-2 overflow-hidden rounded-full border border-gold/30"
        style={{ width: FEMALE_CARD_SIZE, height: FEMALE_CARD_SIZE }}
      >
        {female.photo_url ? (
          <Image source={{ uri: female.photo_url }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View className="h-full w-full items-center justify-center bg-surface">
            <Typography variant="caption">{female.name.slice(0, 1)}</Typography>
          </View>
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1">
          <Typography variant="body">{female.name}</Typography>
          {female.urgency_flag ? <Typography variant="caption">🔥</Typography> : null}
          {locked ? <Typography variant="caption">🔒</Typography> : null}
        </View>
        <Typography variant="caption" className="text-subtle">
          {statusLabel(pairing, locked)}
        </Typography>
        {coi != null && !locked ? (
          <View
            className="mt-1 self-start rounded-full px-2 py-0.5"
            style={{ backgroundColor: `${coiColor}33` }}
          >
            <Typography variant="caption" style={{ color: coiColor }}>
              COI {coi}%
            </Typography>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
