import { useCallback, useEffect, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type GuestAccess = {
  isGuest: boolean;
  holderName: string | null;
  holderId: string | null;
  canViewFinancials: boolean;
};

const HOLDER: GuestAccess = {
  isGuest: false,
  holderName: null,
  holderId: null,
  canViewFinancials: true,
};

type GuestRow = {
  membership_id: string;
  account_holder_id: string;
  holder_name: string | null;
  can_view_financials: boolean;
};

export function useGuestAccess(): GuestAccess & { loading: boolean; error: string | null; refresh: () => void } {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [access, setAccess] = useState<GuestAccess>(HOLDER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!userId) {
      setAccess(HOLDER);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { data, error: err } = await requireSupabase().rpc('my_guest_access');
        if (err) {
          setError(err.message);
          setAccess(HOLDER);
          return;
        }
        const rows = (data ?? []) as GuestRow[];
        if (rows.length === 0) {
          setAccess(HOLDER);
          return;
        }
        const names = rows.map((r) => r.holder_name?.trim()).filter(Boolean) as string[];
        setAccess({
          isGuest: true,
          holderName: names.length === 1 ? names[0]! : names.join(', ') || 'this account',
          holderId: rows[0]?.account_holder_id ?? null,
          canViewFinancials: rows.some((r) => r.can_view_financials),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...access, loading, error, refresh };
}
