import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { fetchAllQuotes } from '@/lib/finance/quoteQueries';
import { holdChipLabel, isLapsingSoon, isQuoteOnHold, reminderProgressLabel } from '@/lib/finance/quoteLapse';
import { quoteBuyerDisplay, quoteListNumber } from '@/lib/finance/quoteBuyerDisplay';
import type { Quote } from '@/types/app.types';

export function LapsingSoonWidget() {
  const router = useRouter();
  const [rows, setRows] = useState<Quote[]>([]);

  const load = useCallback(async () => {
    try {
      const all = await fetchAllQuotes('sent');
      setRows(all.filter((q) => isLapsingSoon(q)).slice(0, 12));
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SurfaceCard title="Lapsing soon" href="/(admin)/quotes" badge={rows.length} badgeTone="gold">
      {rows.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          No sent quotes at day 60 or later.
        </Typography>
      ) : (
        rows.map((q) => {
          const held = isQuoteOnHold(q.lapse_hold_until);
          return (
            <Pressable
              key={q.id}
              onPress={() => router.push({ pathname: '/(admin)/quotes/[id]', params: { id: q.id } })}
              className="border-b border-gold/10 py-3"
            >
              <Typography variant="body">{quoteBuyerDisplay(q).name}</Typography>
              <Typography variant="caption">
                {quoteListNumber(q.quote_number, q.revision)}
                {reminderProgressLabel(q) ? ` · ${reminderProgressLabel(q)}` : ''}
              </Typography>
              {held && q.lapse_hold_until ? (
                <View className="mt-1">
                  <Typography variant="caption" className="text-amber-300">
                    {holdChipLabel(q.lapse_hold_until)}
                  </Typography>
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}
    </SurfaceCard>
  );
}
