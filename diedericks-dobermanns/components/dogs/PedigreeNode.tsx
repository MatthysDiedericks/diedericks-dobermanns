import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { PedigreeAncestor } from '@/hooks/useDogPedigree';
import { ancestorFieldMask, borderClassFor, cellShowsPhoto } from '@/lib/pedigree/density';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface PedigreeNodeProps {
  label: string;
  titlesHealth?: string | null;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
  generation?: number;
  empty?: boolean;
  emphasis?: boolean;
  onPress?: () => void;
}

export function PedigreeNode({
  label,
  titlesHealth,
  dateOfBirth,
  photoUrl,
  generation = 1,
  empty,
  emphasis,
  onPress,
}: PedigreeNodeProps) {
  if (empty) {
    return (
      <View className={`flex-1 rounded-lg border bg-black-rich ${borderClassFor(generation, true)}`} />
    );
  }

  const mask = ancestorFieldMask(generation);
  const showPhoto = cellShowsPhoto(generation) && Boolean(photoUrl);
  const content = (
    <View className={`flex-1 justify-center rounded-lg border bg-black-rich px-2 py-2 ${borderClassFor(generation, false)}`}>
      {showPhoto ? (
        <Image source={{ uri: photoUrl! }} style={{ width: '100%', height: 56, marginBottom: 6 }} contentFit="cover" />
      ) : null}
      <Typography
        variant={emphasis ? 'subtitle' : 'caption'}
        numberOfLines={3}
        className="text-[#F5F0E8]"
        style={{ fontSize: generation <= 0 ? 16 : 11 }}
      >
        {label.trim()}
      </Typography>
      {mask.showTitles && titlesHealth?.trim() ? (
        <Typography variant="caption" className="mt-0.5 text-[#C4A35A]" numberOfLines={2}>
          {titlesHealth.trim()}
        </Typography>
      ) : null}
      {mask.showDob && dateOfBirth ? (
        <Typography variant="caption" className="mt-0.5 text-[#A8A090]">
          {formatKennelDate(dateOfBirth)}
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
  return a.registeredName?.trim() || '';
}

export function subjectNodeLabel(registeredName: string | null, fallbackName: string): string {
  return registeredName?.trim() || fallbackName;
}

export const PEDIGREE_NODE_MIN_HEIGHT = 44;
export const PEDIGREE_COLUMN_WIDTH = 132;
