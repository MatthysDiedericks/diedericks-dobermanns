import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { FemaleLitterHistoryRow } from '@/hooks/useLittersIndex';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface LitterRowProps {
  row: FemaleLitterHistoryRow;
}

export function LitterRow({ row }: LitterRowProps) {
  const router = useRouter();
  const males = row.puppies.filter((p) => p.sex === 'male').map((p) => p.name).join(', ') || '—';
  const females = row.puppies.filter((p) => p.sex === 'female').map((p) => p.name).join(', ') || '—';
  const notes = row.deceased_count
    ? `Deceased: ${row.deceased_count}`
    : row.notes ?? row.whelping_notes ?? '—';

  return (
    <View className="mb-3 flex-row items-start border-b border-gold/10 pb-3">
      <Typography variant="caption" className="w-24">
        {formatKennelDate(row.actual_date)}
      </Typography>
      <Typography variant="caption" className="w-28">
        {row.father?.name ?? '—'}
      </Typography>
      <Typography variant="caption" className="w-28">
        {males}
      </Typography>
      <Typography variant="caption" className="w-28">
        {females}
      </Typography>
      <Typography variant="caption" className="flex-1">
        {notes}
      </Typography>
      <Pressable onPress={() => router.push(`/(admin)/litters/${row.id}` as never)}>
        <Typography variant="label" className="text-gold">
          View
        </Typography>
      </Pressable>
    </View>
  );
}

export function LitterHistoryTable({ rows }: { rows: FemaleLitterHistoryRow[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="min-w-[640px]">
        <View className="mb-2 flex-row border-b border-gold/20 pb-2">
          {['Date', 'Sire', '♂ Males', '♀ Females', 'Notes', ''].map((h) => (
            <Typography key={h} variant="label" className="w-28 text-gold">
              {h}
            </Typography>
          ))}
        </View>
        {rows.map((r) => (
          <LitterRow key={r.id} row={r} />
        ))}
      </View>
    </ScrollView>
  );
}
