import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Switch, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { ancestorNameKey } from '@/lib/pedigree/nameKey';
import { requireSupabase, supabase } from '@/lib/supabase';

type Row = {
  nameKey: string;
  displayName: string;
  appearances: number;
  charts: number;
  url: string | null;
  credit: string | null;
  isPublic: boolean;
};

export default function AncestorPhotosScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const client = requireSupabase();
    const [{ data: ancestors }, { data: photos, error: photoErr }] = await Promise.all([
      client.from('pedigree_ancestors').select('registered_name, dog_id'),
      client.from('ancestor_photos').select('name_key, display_name, url, thumbnail_url, credit, is_public'),
    ]);
    if (photoErr) {
      setError(photoErr.message);
      setLoading(false);
      return;
    }
    const counts = new Map<string, { displayName: string; appearances: number; charts: Set<string> }>();
    for (const row of ancestors ?? []) {
      const key = ancestorNameKey(row.registered_name);
      if (!key) continue;
      const current = counts.get(key) ?? {
        displayName: row.registered_name!.trim(),
        appearances: 0,
        charts: new Set<string>(),
      };
      current.appearances += 1;
      if (row.dog_id) current.charts.add(row.dog_id);
      counts.set(key, current);
    }
    const photoByKey = new Map((photos ?? []).map((p) => [p.name_key, p]));
    const next = [...counts.entries()]
      .map(([nameKey, c]) => {
        const photo = photoByKey.get(nameKey);
        return {
          nameKey,
          displayName: photo?.display_name ?? c.displayName,
          appearances: c.appearances,
          charts: c.charts.size,
          url: photo?.thumbnail_url ?? photo?.url ?? null,
          credit: photo?.credit ?? null,
          isPublic: photo?.is_public ?? false,
        };
      })
      .sort((a, b) => b.appearances - a.appearances);
    setRows(next);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublic(row: Row) {
    if (!supabase) return;
    await supabase.from('ancestor_photos').update({ is_public: !row.isPublic }).eq('name_key', row.nameKey);
    void load();
  }

  async function saveCredit(row: Row, credit: string) {
    if (!supabase) return;
    await supabase.from('ancestor_photos').update({ credit: credit.trim() || null }).eq('name_key', row.nameKey);
  }

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Pedigree" title="Ancestor photos" />
      <Typography variant="caption" className="mb-4 px-6 text-[#A8A090]">
        One photo per ancestor name. Photos stay off the public site until marked public.
      </Typography>
      {loading ? <ActivityIndicator color={Colors.gold} /> : null}
      {error ? <Typography variant="body" className="px-6 text-danger">{error}</Typography> : null}
      <ScrollView className="px-6 pb-12">
        {rows.map((row) => (
          <View key={row.nameKey} className="mb-4 flex-row gap-3 rounded-xl border border-gold/20 bg-surface p-3">
            {row.url ? (
              <Image source={{ uri: row.url }} style={{ width: 64, height: 64 }} />
            ) : (
              <View className="h-16 w-16 border border-gold/15" />
            )}
            <View className="flex-1">
              <Typography variant="body">{row.displayName}</Typography>
              <Typography variant="caption" className="text-[#A8A090]">
                {row.appearances} appearances · {row.charts} charts
              </Typography>
              <TextInput
                defaultValue={row.credit ?? ''}
                placeholder="Credit"
                placeholderTextColor={Colors.silver}
                className="mt-1 text-[#F5F0E8]"
                onEndEditing={(e) => void saveCredit(row, e.nativeEvent.text)}
              />
              <View className="mt-2 flex-row items-center gap-2">
                <Typography variant="caption" className="text-gold">
                  {row.isPublic ? 'Public' : 'Not public'}
                </Typography>
                <Switch
                  value={row.isPublic}
                  onValueChange={() => void togglePublic(row)}
                  disabled={!row.url}
                  trackColor={{ true: Colors.gold }}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
