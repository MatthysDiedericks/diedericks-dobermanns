import { useCallback, useEffect, useState } from 'react';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { countConfirmedNeverSignedIn, countUnopenedInvites } from '@/lib/portal/invite';

export function InvitedNotOpenedWidget() {
  const [unopened, setUnopened] = useState(0);
  const [locked, setLocked] = useState(0);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([countUnopenedInvites(), countConfirmedNeverSignedIn()]);
      setUnopened(a);
      setLocked(b);
    } catch {
      setUnopened(0);
      setLocked(0);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SurfaceCard
      title="Portal lockouts"
      href="/(admin)/waitlist"
      badge={locked}
      badgeTone="gold"
    >
      {locked === 0 && unopened === 0 ? (
        <Typography variant="caption" className="text-subtle">
          No buyers sitting on a burned or unopened invite.
        </Typography>
      ) : (
        <Typography variant="body" className="text-text">
          {locked} confirmed, never signed in — re-issue a code from the client record.
          {unopened > 0 ? ` ${unopened} invited, not opened.` : ''}
        </Typography>
      )}
    </SurfaceCard>
  );
}
