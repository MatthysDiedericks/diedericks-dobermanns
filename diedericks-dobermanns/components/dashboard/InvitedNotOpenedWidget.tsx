import { useCallback, useEffect, useState } from 'react';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { countUnopenedInvites } from '@/lib/portal/invite';

export function InvitedNotOpenedWidget() {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setCount(await countUnopenedInvites());
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SurfaceCard
      title="Invited, not opened"
      href="/(admin)/waitlist"
      badge={count}
      badgeTone="gold"
    >
      {count === 0 ? (
        <Typography variant="caption" className="text-subtle">
          No invite links sitting unopened.
        </Typography>
      ) : (
        <Typography variant="body" className="text-text">
          {count} buyer{count === 1 ? '' : 's'} invited but never opened the link — they may be
          stuck. Resend from the waiting list or their client record.
        </Typography>
      )}
    </SurfaceCard>
  );
}
