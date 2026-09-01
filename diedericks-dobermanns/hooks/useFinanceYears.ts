import { useEffect, useState } from 'react';

import { financeYearsWithData, yearsFromRecordBounds } from '@/lib/finance/years';

export function useFinanceYears(): number[] {
  const [years, setYears] = useState<number[]>(() => yearsFromRecordBounds([]));

  useEffect(() => {
    let cancelled = false;
    void financeYearsWithData()
      .then((next) => {
        if (!cancelled) setYears(next);
      })
      .catch(() => {
        if (!cancelled) setYears(yearsFromRecordBounds([]));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return years;
}
