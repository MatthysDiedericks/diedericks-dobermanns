import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { CollarDots } from '@/components/dogs/CollarDots';
import { Typography } from '@/components/ui/Typography';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { LineageParent, LineageStripData } from '@/lib/dogs/lineageStrip';

function ParentBox({
  role,
  parent,
  onPress,
}: {
  role: 'SIRE' | 'DAM';
  parent: LineageParent;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center gap-2 rounded-xl border border-gold/25 bg-black-rich px-2 py-2"
    >
      {parent.photoUrl ? (
        <Image source={{ uri: parent.photoUrl }} style={{ width: 36, height: 36, borderRadius: 6 }} />
      ) : (
        <View className="h-9 w-9 items-center justify-center rounded-md bg-surface">
          <Typography variant="caption" className="text-gold">
            {parent.name.slice(0, 1)}
          </Typography>
        </View>
      )}
      <View className="flex-1">
        <Typography variant="caption" className="text-gold-dim">
          {role}
        </Typography>
        <Typography variant="body" className={parent.linked ? 'text-gold' : 'text-muted'} numberOfLines={1}>
          {parent.name}
        </Typography>
      </View>
    </Pressable>
  );
}

export function DogLineageStrip({
  data,
  dogHref,
  litterHref,
  pedigreeHref,
}: {
  data: LineageStripData;
  dogHref: (id: string) => string;
  litterHref?: (id: string) => string;
  pedigreeHref?: string;
}) {
  const router = useRouter();
  const litter = data.litter;
  const litterLine = litter
    ? [
        `${litter.damName} × ${litter.sireName}`,
        litter.date ? formatKennelDate(litter.date) : null,
        litter.letter ? `litter ${litter.letter}` : litter.name,
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  function openParent(parent: LineageParent) {
    if (parent.linked && parent.id) {
      router.push(dogHref(parent.id) as never);
      return;
    }
    if (pedigreeHref) router.push(pedigreeHref as never);
  }

  return (
    <View className="border-b border-gold/20 bg-background pb-3">
      <View className="flex-row gap-2">
        <ParentBox role="SIRE" parent={data.sire} onPress={() => openParent(data.sire)} />
        <ParentBox role="DAM" parent={data.dam} onPress={() => openParent(data.dam)} />
      </View>
      <Typography variant="caption" className="mb-1 mt-3 text-gold-dim">
        LITTER{litterLine ? ` · ${litterLine}` : ''}
      </Typography>
      <CollarDots
        dogs={data.littermates}
        currentId={data.dogId}
        onPress={(id) => router.push(dogHref(id) as never)}
      />
      <Typography variant="caption" className="mt-3 text-gold-dim">
        PROGENY
      </Typography>
      {data.progeny.length === 0 ? (
        <Typography variant="body" className="mt-0.5 text-muted">
          none yet
        </Typography>
      ) : (
        data.progeny.map((p) => {
          const label = [
            p.otherParentName,
            p.date ? formatKennelDate(p.date) : null,
            `${p.puppyCount} ${p.puppyCount === 1 ? 'puppy' : 'puppies'}`,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Pressable
              key={p.litterId ?? label}
              onPress={() => {
                if (p.litterId && litterHref) router.push(litterHref(p.litterId) as never);
              }}
              className="py-1"
            >
              <Typography variant="body" className="text-gold">
                {label}
              </Typography>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
