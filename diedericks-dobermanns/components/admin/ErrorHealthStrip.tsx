import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { ERROR_CODES } from '@/lib/errors/codes';
import { requireSupabase } from '@/lib/supabase';

type Strip = {
  registrationFailures24h: number;
  peopleAffected24h: number;
  openCritical: number;
};

export function ErrorHealthStrip() {
  const router = useRouter();
  const [strip, setStrip] = useState<Strip | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = requireSupabase();
      const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from('error_events' as never)
        .select('id, code, area, severity, session_ref, email_domain' as never)
        .gte('occurred_at' as never, since)
        .is('resolved_at' as never, null);
      if (error || !data?.length) {
        setStrip(null);
        return;
      }
      const rows = data as unknown as {
        id: number;
        code: string;
        area: string;
        severity: string;
        session_ref: string | null;
        email_domain: string | null;
      }[];
      const reg = rows.filter(
        (r) =>
          r.code !== ERROR_CODES.INVITE_ALREADY_REGISTERED &&
          (r.area === 'auth' ||
            r.code === 'AUTH_REGISTRATION_BLOCKED' ||
            r.code === 'AUTH_SIGNUP_PHANTOM' ||
            r.code === 'AUTH_PASSWORD_POLICY'),
      );
      const people = new Set(reg.map((r) => r.session_ref || r.email_domain || `id:${r.id}`));
      const openCritical = rows.filter((r) => r.severity === 'critical').length;
      if (!reg.length && !openCritical) {
        setStrip(null);
        return;
      }
      setStrip({
        registrationFailures24h: reg.length,
        peopleAffected24h: people.size,
        openCritical,
      });
    } catch {
      setStrip(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!strip) return null;

  const text =
    strip.registrationFailures24h > 0
      ? `${strip.registrationFailures24h} registration failure${
          strip.registrationFailures24h === 1 ? '' : 's'
        } in the last 24 hours — ${strip.peopleAffected24h} ${
          strip.peopleAffected24h === 1 ? 'person' : 'people'
        } affected`
      : `${strip.openCritical} critical failure${strip.openCritical === 1 ? '' : 's'} unresolved`;

  return (
    <Pressable
      onPress={() => router.push('/(admin)/errors' as never)}
      className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3"
    >
      <Typography variant="caption" className="text-red-300">
        ATTENTION
      </Typography>
      <Typography variant="body" className="mt-1 text-text">
        {text}
      </Typography>
      <Typography variant="caption" className="mt-2 text-gold">
        View →
      </Typography>
      <View />
    </Pressable>
  );
}
