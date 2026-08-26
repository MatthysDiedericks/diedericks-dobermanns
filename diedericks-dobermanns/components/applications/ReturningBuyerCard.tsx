import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { returningBuyerLine } from '@/lib/applications/returningBuyer';
import { requireSupabase } from '@/lib/supabase';

export function ReturningBuyerCard({ previousId }: { previousId: string }) {
  const [line, setLine] = useState('Second application — returning buyer');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = requireSupabase();
      const { data: previous } = await supabase
        .from('applications')
        .select('user_id, specific_dog_id')
        .eq('id', previousId)
        .maybeSingle();
      if (!previous || cancelled) return;
      if (previous.specific_dog_id) {
        const { data } = await supabase
          .from('dogs')
          .select('name, collar_colour, placement_date')
          .eq('id', previous.specific_dog_id)
          .maybeSingle();
        if (!cancelled && data?.name) {
          const colour = data.collar_colour?.trim();
          setLine(
            returningBuyerLine({
              dogName: colour ? `${data.name} (${colour})` : data.name,
              collectedOn: data.placement_date,
            }),
          );
          return;
        }
      }
      if (!previous.user_id) return;
      const { data } = await supabase
        .from('dogs')
        .select('name, collar_colour, placement_date')
        .eq('owner_id', previous.user_id)
        .not('placement_date', 'is', null)
        .order('placement_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data?.name) return;
      const colour = data.collar_colour?.trim();
      setLine(
        returningBuyerLine({
          dogName: colour ? `${data.name} (${colour})` : data.name,
          collectedOn: data.placement_date,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [previousId]);

  return (
    <Card className="mb-4">
      <Typography variant="label" className="text-gold">
        RETURNING BUYER
      </Typography>
      <Typography variant="body" className="mt-1">
        {line}
      </Typography>
    </Card>
  );
}
