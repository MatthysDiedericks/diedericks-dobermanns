import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  formatLastChargedHistory,
  type LastChargeRow,
} from '@/lib/finance/catalogue';
import { fetchLastChargesForCode } from '@/lib/finance/catalogueQueries';
import { formatPrice } from '@/lib/format';

function shortDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  } catch {
    return iso.slice(0, 10);
  }
}

export function LastChargedHint({
  catalogueCode,
  onPickAmount,
}: {
  catalogueCode: string | null | undefined;
  onPickAmount: (amount: number) => void;
}) {
  const [rows, setRows] = useState<LastChargeRow[] | null>(null);

  useEffect(() => {
    if (!catalogueCode) {
      setRows(null);
      return;
    }
    let cancelled = false;
    void fetchLastChargesForCode(catalogueCode)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogueCode]);

  if (!catalogueCode) return null;
  if (rows == null) {
    return (
      <Typography variant="caption" className="mt-1 text-silver">
        Loading charge history…
      </Typography>
    );
  }

  const history = formatLastChargedHistory(rows, formatPrice, shortDay);

  return (
    <View className="mt-1">
      <Typography variant="caption" className="text-silver">
        {history}
      </Typography>
      {rows.length ? (
        <View className="mt-1 flex-row flex-wrap gap-2">
          {rows.map((r, i) => (
            <Pressable key={`${r.quote_number}-${i}`} onPress={() => onPickAmount(r.line_total)}>
              <Typography variant="caption" className="text-gold underline">
                use {formatPrice(r.line_total)}
              </Typography>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
