import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { fetchNewEquipmentEnquiryCount } from '@/lib/equipment/queries';

export function EquipmentShopWidget() {
  const router = useRouter();
  const [newCount, setNewCount] = useState(0);

  const reload = useCallback(() => {
    void fetchNewEquipmentEnquiryCount()
      .then(setNewCount)
      .catch(() => setNewCount(0));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <SurfaceCard
      title="Equipment shop"
      href="/(admin)/equipment"
      badge={newCount}
      badgeTone="gold"
    >
      {newCount === 0 ? (
        <Typography variant="caption" className="text-subtle">
          Catalogue and shop enquiries. Converts into a quote — never the dog pipeline.
        </Typography>
      ) : (
        <Pressable onPress={() => router.push('/(admin)/equipment' as never)}>
          <Typography variant="body">
            {newCount} new enquir{newCount === 1 ? 'y' : 'ies'}
          </Typography>
        </Pressable>
      )}
    </SurfaceCard>
  );
}
