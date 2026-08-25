import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { requireSupabase, supabase } from '@/lib/supabase';

/**
 * Always visible. Zero is the healthy state; anything else means a writer
 * bypassed the inherit-parents trigger.
 */
export function ParentageHealthStrip() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setCount(0);
      return;
    }
    try {
      const { count: n, error } = await requireSupabase()
        .from('dogs')
        .select('id', { count: 'exact', head: true })
        .not('litter_id', 'is', null)
        .or('father_id.is.null,mother_id.is.null');
      if (error) {
        setCount(0);
        return;
      }
      setCount(n ?? 0);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (count == null) return null;

  const tone =
    count === 0
      ? 'border-gold/20 bg-black-rich'
      : 'border-amber-500/40 bg-amber-500/10';

  return (
    <Pressable
      onPress={() => router.push('/(admin)/dogs' as never)}
      className={`mx-6 mb-4 rounded-xl border px-4 py-3 ${tone}`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Typography variant="body" className="flex-1 text-text">
          {count} {count === 1 ? 'dog has' : 'dogs have'} a litter but no sire or dam
        </Typography>
        <Typography variant="label" className="text-gold">
          Fix
        </Typography>
      </View>
    </Pressable>
  );
}
