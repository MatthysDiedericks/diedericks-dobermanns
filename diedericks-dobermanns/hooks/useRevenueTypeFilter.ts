import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  parseRevenueTypeFilter,
  REVENUE_TYPE_STORAGE_KEY,
  type RevenueTypeFilter,
} from '@/lib/finance/quoteTypes';

export function useRevenueTypeFilter() {
  const [filter, setFilterState] = useState<RevenueTypeFilter>('all');

  useEffect(() => {
    void AsyncStorage.getItem(REVENUE_TYPE_STORAGE_KEY).then((stored) => {
      setFilterState(parseRevenueTypeFilter(stored));
    });
  }, []);

  const setFilter = useCallback((next: RevenueTypeFilter) => {
    setFilterState(next);
    void AsyncStorage.setItem(REVENUE_TYPE_STORAGE_KEY, next);
  }, []);

  return { filter, setFilter };
}
