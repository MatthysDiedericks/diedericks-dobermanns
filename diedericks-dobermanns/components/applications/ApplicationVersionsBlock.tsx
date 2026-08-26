import { useEffect, useState } from 'react';

import { VersionHistoryList } from '@/components/applications/VersionHistoryList';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { fetchVersionHistory, type VersionHistoryItem } from '@/lib/applications/pendingChanges';
import { requireSupabase, supabase } from '@/lib/supabase';

export function ApplicationVersionsBlock({ applicationId }: { applicationId: string }) {
  const [items, setItems] = useState<VersionHistoryItem[]>([]);
  useEffect(() => {
    if (!supabase) return;
    void fetchVersionHistory(requireSupabase(), applicationId).then(setItems);
  }, [applicationId]);
  return (
    <Card className="mt-4">
      <Typography variant="label" className="mb-3">
        Versions
      </Typography>
      <VersionHistoryList items={items} />
    </Card>
  );
}
