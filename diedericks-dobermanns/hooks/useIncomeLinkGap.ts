import { useEffect, useState } from 'react';

import type { IncomeLinkSummary } from '@/lib/finance/incomeLinks';
import { loadIncomeLinkGap } from '@/lib/finance/loadLinkSales';
import { requireSupabase } from '@/lib/supabase';

export function useIncomeLinkGap(): IncomeLinkSummary | null {
  const [gap, setGap] = useState<IncomeLinkSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadIncomeLinkGap(requireSupabase())
      .then((next) => {
        if (!cancelled) setGap(next);
      })
      .catch(() => {
        if (!cancelled) setGap(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return gap;
}
