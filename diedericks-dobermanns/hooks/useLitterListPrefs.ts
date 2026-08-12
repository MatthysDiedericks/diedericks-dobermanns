import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_LITTER_LIST_PREFS,
  LITTER_LIST_PREFS_KEY,
  parseLitterListPrefs,
  serializeLitterListPrefs,
  type LitterListPrefs,
} from '@/lib/litters/listPrefs';

/** Persists admin litter list sort/filter across visits. */
export function useLitterListPrefs() {
  const [prefs, setPrefsState] = useState<LitterListPrefs>(DEFAULT_LITTER_LIST_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(LITTER_LIST_PREFS_KEY).then((raw) => {
      setPrefsState(parseLitterListPrefs(raw));
      setReady(true);
    });
  }, []);

  const setPrefs = useCallback((next: LitterListPrefs | ((prev: LitterListPrefs) => LitterListPrefs)) => {
    setPrefsState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      void AsyncStorage.setItem(LITTER_LIST_PREFS_KEY, serializeLitterListPrefs(value));
      return value;
    });
  }, []);

  const patch = useCallback(
    (partial: Partial<LitterListPrefs>) => {
      setPrefs((prev) => ({ ...prev, ...partial }));
    },
    [setPrefs],
  );

  const clearFilters = useCallback(() => {
    setPrefs((prev) => ({ ...prev, damId: null, year: null }));
  }, [setPrefs]);

  return { prefs, setPrefs, patch, clearFilters, ready };
}
