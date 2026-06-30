import { Pressable, Switch, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { SHARING_SECTIONS, useLitterSharing } from '@/hooks/useLitterSharing';
import type { LitterPuppy } from '@/hooks/useLitterWeights';
import { CollarDot } from '@/lib/litters/collarColours';

export function LitterSharingTab({
  litterId,
  puppies,
}: {
  litterId: string;
  puppies: LitterPuppy[];
}) {
  const { publicSections, puppySharing, updatePublicSections, upsertPuppySharing } =
    useLitterSharing(
      litterId,
      puppies.map((p) => p.id),
    );

  function toggleSection(key: string) {
    const next = publicSections.includes(key)
      ? publicSections.filter((k) => k !== key)
      : [...publicSections, key];
    void updatePublicSections(next);
  }

  function selectAll() {
    void updatePublicSections(SHARING_SECTIONS.map((s) => s.key));
  }

  return (
    <View className="pb-8">
      <Typography variant="label" className="mb-2 text-gold">
        SECTIONS SHARED ON PUBLIC PAGE
      </Typography>
      <Pressable onPress={selectAll} className="mb-3">
        <Typography variant="caption" className="text-gold">
          Select all
        </Typography>
      </Pressable>
      <View className="mb-6 flex-row flex-wrap gap-2">
        {SHARING_SECTIONS.map((s) => {
          const active = publicSections.includes(s.key);
          return (
            <Pressable
              key={s.key}
              onPress={() => toggleSection(s.key)}
              className={`rounded-full border px-3 py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
            >
              <Typography variant="caption">
                {s.label}
                {active ? ' ✓' : ''}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      <Typography variant="label" className="mb-2 text-gold">
        PER-PUPPY SHARING
      </Typography>
      {puppies.map((p, i) => {
        const sharing = puppySharing.get(p.id);
        return (
          <View key={p.id} className="mb-3 flex-row items-center border-b border-gold/10 pb-3">
            <Typography variant="caption" className="w-6">
              {i + 1}
            </Typography>
            <CollarDot colour={p.collar_colour} />
            <Typography variant="body" className="ml-2 flex-1">
              {p.name}
            </Typography>
            <View className="items-center">
              <Typography variant="caption">Public</Typography>
              <Switch
                value={sharing?.is_public_page ?? false}
                onValueChange={(v) => void upsertPuppySharing(p.id, { is_public_page: v })}
              />
            </View>
            <View className="ml-3 items-center">
              <Typography variant="caption">Pedigree</Typography>
              <Switch
                value={sharing?.is_pedigree_public ?? false}
                onValueChange={(v) => void upsertPuppySharing(p.id, { is_pedigree_public: v })}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
