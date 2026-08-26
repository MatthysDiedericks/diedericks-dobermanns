import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ApplicationChangeDiff } from '@/components/applications/ApplicationChangeDiff';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { reapproveApplicationChanges } from '@/lib/applications/amendments';
import { discussWhatsAppText } from '@/lib/applications/fieldTiers';
import { fetchPendingChanges, type PendingChangeItem } from '@/lib/applications/pendingChanges';
import { formatDateTime } from '@/lib/format';
import { openWhatsApp } from '@/lib/social';
import { requireSupabase } from '@/lib/supabase';

export function PendingChangesAdminBlock({
  applicationId,
  phone,
  fullName,
  onDone,
}: {
  applicationId: string;
  phone: string | null;
  fullName: string;
  onDone: () => void;
}) {
  const [item, setItem] = useState<PendingChangeItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPendingChanges(requireSupabase(), applicationId).then((rows) => setItem(rows[0] ?? null));
  }, [applicationId]);

  if (!item) return null;
  const first = fullName.trim().split(/\s+/)[0] || fullName;

  return (
    <Card className="mb-4">
      <Typography variant="label" className="mb-3">
        What moved
      </Typography>
      <ApplicationChangeDiff changes={item.changes} />
      <Typography variant="caption" className="mt-2">
        Changed {item.changedAt ? formatDateTime(item.changedAt) : ''} by {item.changedByName}
      </Typography>
      <View className="mt-4 gap-2">
        <Button
          label="Re-approve"
          onPress={async () => {
            setBusy(true);
            setError(null);
            const res = await reapproveApplicationChanges(applicationId);
            setBusy(false);
            if (res.error) setError(res.error);
            else onDone();
          }}
          loading={busy}
          fullWidth
        />
        {phone ? (
          <Button
            label="Discuss"
            variant="outline"
            onPress={() => openWhatsApp(phone, discussWhatsAppText(first))}
            fullWidth
          />
        ) : null}
        {error ? (
          <Typography variant="caption" className="text-danger">
            {error}
          </Typography>
        ) : null}
      </View>
    </Card>
  );
}
