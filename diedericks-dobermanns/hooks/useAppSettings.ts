import { useCallback, useEffect, useState } from 'react';

import { MOCK_APP_SETTINGS } from '@/lib/mockData';
import { SOCIAL_SETTING_KEYS } from '@/lib/social';
import { supabase } from '@/lib/supabase';
import type { AppSettings } from '@/types/app.types';

/**
 * Loads social/contact links from the key/value `app_settings` table and maps
 * them into a normalised object. Falls back to demo values when offline.
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(MOCK_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      setSettings(MOCK_APP_SETTINGS);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('app_settings').select('key, value');
    const byKey = new Map((data ?? []).map((r) => [r.key, r.value]));
    const next = {} as AppSettings;
    (Object.keys(SOCIAL_SETTING_KEYS) as (keyof AppSettings)[]).forEach((field) => {
      next[field] = byKey.get(SOCIAL_SETTING_KEYS[field]) ?? null;
    });
    setSettings(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { settings, loading, refetch: load };
}
