import { Pressable, ScrollView, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { DamOption, LitterListPrefs, YearOption } from '@/lib/litters/listPrefs';
import { litterPrefsActive } from '@/lib/litters/listPrefs';

type Props = {
  prefs: LitterListPrefs;
  dams: DamOption[];
  years: YearOption[];
  onPatch: (partial: Partial<LitterListPrefs>) => void;
  onClearFilters: () => void;
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full border px-3 py-2 ${
        active ? 'border-gold bg-gold/15' : 'border-gold/25'
      }`}
    >
      <Typography variant="caption" className={active ? 'text-gold' : undefined}>
        {label}
      </Typography>
    </Pressable>
  );
}

/** Sort + dam + year chips for the admin litters list. */
export function LitterListFilters({ prefs, dams, years, onPatch, onClearFilters }: Props) {
  const filtersOn = litterPrefsActive(prefs);

  return (
    <View className="mb-3 gap-3">
      <View>
        <Typography variant="caption" className="mb-2 px-6 text-subtle">
          Sort
        </Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6">
          <Chip
            label="Newest first"
            active={prefs.sort === 'newest'}
            onPress={() => onPatch({ sort: 'newest' })}
          />
          <Chip
            label="Oldest first"
            active={prefs.sort === 'oldest'}
            onPress={() => onPatch({ sort: 'oldest' })}
          />
          {filtersOn ? (
            <Chip label="Clear filters" active={false} onPress={onClearFilters} />
          ) : null}
        </ScrollView>
      </View>

      <View>
        <Typography variant="caption" className="mb-2 px-6 text-subtle">
          Dam
        </Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6">
          <Chip label="All" active={prefs.damId == null} onPress={() => onPatch({ damId: null })} />
          {dams.map((d) => (
            <Chip
              key={d.id}
              label={`${d.name} (${d.count})`}
              active={prefs.damId === d.id}
              onPress={() => onPatch({ damId: d.id })}
            />
          ))}
        </ScrollView>
      </View>

      <View>
        <Typography variant="caption" className="mb-2 px-6 text-subtle">
          Year
        </Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6">
          <Chip label="All" active={prefs.year == null} onPress={() => onPatch({ year: null })} />
          {years.map((y) => (
            <Chip
              key={y.year}
              label={`${y.year} (${y.count})`}
              active={prefs.year === y.year}
              onPress={() => onPatch({ year: y.year })}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
