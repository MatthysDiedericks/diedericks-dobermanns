import { useCallback, useEffect, useState } from 'react';

import { countPendingClientDocuments } from '@/lib/documents/pendingReview';
import { countUnlabelledDocuments } from '@/lib/documents/unlabelled';
import { countPendingMedia } from '@/lib/media/pendingReview';

export type DocumentTriageCounts = {
  unlabelled: number;
  pendingClient: number;
  pendingMedia: number;
};

const EMPTY: DocumentTriageCounts = { unlabelled: 0, pendingClient: 0, pendingMedia: 0 };

export function useDocumentTriageCounts() {
  const [counts, setCounts] = useState<DocumentTriageCounts>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [unlabelled, pendingClient, pendingMedia] = await Promise.all([
        countUnlabelledDocuments(),
        countPendingClientDocuments(),
        countPendingMedia(),
      ]);
      setCounts({ unlabelled, pendingClient, pendingMedia });
    } catch {
      setCounts(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { counts, loading, refresh };
}
