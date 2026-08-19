import { useCallback, useEffect, useState } from 'react';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { countPendingPaymentProofs } from '@/lib/finance/verifyPaymentProof';

export function AwaitingProofsWidget() {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setCount(await countPendingPaymentProofs());
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SurfaceCard
      title="Awaiting review"
      href="/(admin)/finance/proofs"
      badge={count}
      badgeTone="gold"
    >
      {count === 0 ? (
        <Typography variant="caption" className="text-subtle">
          No payment proofs waiting.
        </Typography>
      ) : (
        <Typography variant="body" className="text-text">
          {count} proof{count === 1 ? '' : 's'} of payment to verify — money arriving is not a
          daily digest.
        </Typography>
      )}
    </SurfaceCard>
  );
}
