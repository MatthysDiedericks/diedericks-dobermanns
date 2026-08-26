import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { LockedFieldNote } from '@/components/applications/LockedFieldNote';
import { UpdateDetailsForm } from '@/components/applications/UpdateDetailsForm';
import { VersionHistoryList } from '@/components/applications/VersionHistoryList';
import { labelFor } from '@/components/forms/ApplicationForm/labels';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import {
  FREE_FIELDS,
  LOCKED_FIELDS,
  REAPPROVAL_FIELDS,
  fieldLabel,
  lockedWhatsAppText,
} from '@/lib/applications/fieldTiers';
import { fetchVersionHistory, type VersionHistoryItem } from '@/lib/applications/pendingChanges';
import { formatChangeValue } from '@/lib/applications/versionDiff';
import { whatsappUrl } from '@/lib/social';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ApplicationEditScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { settings } = useAppSettings();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<VersionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    const client = requireSupabase();
    const { data } = await client
      .from('applications')
      .select('*')
      .eq('user_id', profile.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const app = (data as Record<string, unknown> | null) ?? null;
    setRow(app);
    if (app?.id) setHistory(await fetchVersionHistory(client, String(app.id)));
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (!row?.id) {
    return (
      <ScreenContainer>
        <PageHeader title="Update my details" />
        <View className="px-6">
          <Typography variant="body">No application found.</Typography>
        </View>
      </ScreenContainer>
    );
  }

  const initial: Record<string, string | boolean | null> = {};
  for (const field of [...FREE_FIELDS, ...REAPPROVAL_FIELDS]) {
    const v = row[field];
    initial[field] = typeof v === 'boolean' ? v : v == null ? '' : String(v);
  }
  const appId = String(row.id);
  const ref = String(row.reference_code ?? appId.slice(0, 8));
  const whatsappHref = settings.whatsapp_number
    ? whatsappUrl(settings.whatsapp_number, lockedWhatsAppText(ref))
    : null;

  return (
    <ScreenContainer>
      <PageHeader title="Update my details" />
      <View className="px-6 pb-12">
        <UpdateDetailsForm
          applicationId={appId}
          initial={initial}
          onSaved={(msg) => {
            if (msg) router.replace('/(portal)/application-status');
          }}
        />
        <Typography variant="label" className="mb-2 mt-8">
          Assessment
        </Typography>
        {LOCKED_FIELDS.map((field) => {
          const v = row[field];
          const shown =
            typeof v === 'string' && v
              ? labelFor(field as never, v as never)
              : formatChangeValue(v);
          return (
            <LockedFieldNote
              key={field}
              label={fieldLabel(field)}
              value={shown}
              whatsappHref={whatsappHref}
            />
          );
        })}
        <Typography variant="label" className="mb-3 mt-8">
          Change history
        </Typography>
        <VersionHistoryList items={history} />
      </View>
    </ScreenContainer>
  );
}
