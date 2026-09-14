import { Pressable, View } from 'react-native';

import { collarHex } from '@/lib/litters/collarColours';

export type CollarDotDog = {
  id: string;
  name: string;
  sex?: string | null;
  status?: string | null;
  collar_colour?: string | null;
  birth_order?: number | null;
  deceased_at?: string | null;
};

function isDeceased(dog: CollarDotDog): boolean {
  const status = (dog.status ?? '').toLowerCase();
  return Boolean(dog.deceased_at) || status === 'deceased' || status === 'stillborn';
}

export function CollarDots({
  dogs,
  currentId,
  onPress,
  size = 12,
}: {
  dogs: CollarDotDog[];
  currentId?: string | null;
  onPress?: (id: string) => void;
  size?: number;
}) {
  const ordered = [...dogs].sort((a, b) => {
    const ao = a.birth_order ?? 9999;
    const bo = b.birth_order ?? 9999;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });

  return (
    <View className="flex-row flex-wrap items-center" style={{ gap: 6 }}>
      {ordered.map((dog) => {
        const current = dog.id === currentId;
        const deceased = isDeceased(dog);
        const hollow = !dog.collar_colour || dog.collar_colour === 'none';
        const dim = current ? size + 6 : size;
        const fill = hollow ? 'transparent' : collarHex(dog.collar_colour);
        const inner = (
          <View
            style={{
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: fill,
              borderWidth: current ? 2 : hollow ? 2 : 1,
              borderColor: current ? '#C4A35A' : hollow ? '#6b7280' : collarHex(dog.collar_colour),
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {deceased ? (
              <View
                style={{
                  position: 'absolute',
                  width: 1,
                  height: dim * 1.4,
                  backgroundColor: 'rgba(248,250,252,0.9)',
                  transform: [{ rotate: '45deg' }],
                }}
              />
            ) : null}
          </View>
        );
        if (!onPress) {
          return <View key={dog.id}>{inner}</View>;
        }
        return (
          <Pressable
            key={dog.id}
            onPress={() => onPress(dog.id)}
            accessibilityLabel={`${dog.name} ${dog.sex ?? ''} ${dog.status ?? ''}`}
          >
            {inner}
          </Pressable>
        );
      })}
    </View>
  );
}
