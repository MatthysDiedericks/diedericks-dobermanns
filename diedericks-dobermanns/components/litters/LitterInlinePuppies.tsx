import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useLitterInlinePuppies, type InlineLitterPuppy } from '@/hooks/useLitterInlinePuppies';
import { titleCase } from '@/lib/format';
import { CollarDot } from '@/lib/litters/collarColours';
import { isDeceasedStatus } from '@/lib/litters/derivedCounts';

export function LitterInlinePuppies({
  litterId,
  highlightQuery,
}: {
  litterId: string;
  highlightQuery?: string;
}) {
  const { puppies, loading, error } = useLitterInlinePuppies(litterId, true);
  const [showDeceased, setShowDeceased] = useState(false);

  const deceasedCount = (puppies ?? []).filter((p) => isDeceasedStatus(p.status)).length;
  const visible = useMemo(() => {
    const list = puppies ?? [];
    const filtered = showDeceased ? list : list.filter((p) => !isDeceasedStatus(p.status));
    return [...filtered].sort((a, b) => {
      const ao = a.birth_order ?? 9999;
      const bo = b.birth_order ?? 9999;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
  }, [puppies, showDeceased]);

  if (loading) {
    return (
      <Typography variant="caption" className="px-1 py-2 text-subtle">
        Loading puppies…
      </Typography>
    );
  }
  if (error) {
    return (
      <Typography variant="caption" className="px-1 py-2 text-danger">
        {error}
      </Typography>
    );
  }
  if (!puppies?.length) {
    return (
      <Typography variant="caption" className="px-1 py-2 text-subtle">
        No puppies recorded yet.
      </Typography>
    );
  }

  return (
    <View className="mt-2">
      {deceasedCount > 0 ? (
        <Pressable onPress={() => setShowDeceased((v) => !v)} className="mb-2">
          <Typography variant="caption" className="text-gold">
            {showDeceased ? 'Hide' : 'Show'} deceased ({deceasedCount})
          </Typography>
        </Pressable>
      ) : null}
      <View className="gap-2">
        {visible.map((p) => (
          <InlinePuppyRow
            key={p.id}
            puppy={p}
            highlighted={!!highlightQuery && puppyMatches(p, highlightQuery)}
          />
        ))}
      </View>
    </View>
  );
}

function puppyMatches(puppy: InlineLitterPuppy, query: string): boolean {
  return puppy.name.toLowerCase().includes(query.toLowerCase());
}

function InlinePuppyRow({
  puppy,
  highlighted,
}: {
  puppy: InlineLitterPuppy;
  highlighted: boolean;
}) {
  const router = useRouter();
  const buyer = puppy.reserved_for_name?.trim() || puppy.new_owner_name?.trim();
  return (
    <Pressable
      onPress={() => router.push(`/(admin)/dogs/${puppy.id}` as never)}
      className={`flex-row items-center rounded-sm border px-3 py-2 ${
        highlighted ? 'border-gold bg-gold/10' : 'border-gold/15'
      }`}
    >
      <CollarDot colour={puppy.collar_colour} />
      <View className="ml-3 flex-1">
        <Typography variant="subtitle" numberOfLines={1}>
          {puppy.name}
        </Typography>
        <Typography variant="caption" className="text-subtle">
          {sexLabel(puppy.sex)} · {titleCase(puppy.status)}
          {buyer ? ` · ${buyer}` : ''}
        </Typography>
      </View>
    </Pressable>
  );
}

function sexLabel(sex: string | null): string {
  if (sex === 'male') return 'Male';
  if (sex === 'female') return 'Female';
  return '—';
}
