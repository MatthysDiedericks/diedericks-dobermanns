import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { handoverBlockers } from '@/lib/dogs/handoverBlockers';
import { formatPrice, titleCase } from '@/lib/format';
import type { Dog } from '@/types/app.types';

export function AdminWorkStrip({
  dog,
  hasSignedContract,
  hasAnyContract,
  outstandingBalance,
  vaccinationsIncomplete,
}: {
  dog: Dog;
  hasSignedContract: boolean;
  hasAnyContract: boolean;
  outstandingBalance: number;
  vaccinationsIncomplete: boolean;
}) {
  const blockers = handoverBlockers({
    microchipNumber: dog.microchip_number,
    hasSignedContract,
    hasAnyContract,
    outstandingBalance,
    vaccinationsIncomplete,
  });
  const buyer = dog.owner_contact?.full_name || dog.new_owner_name;
  const tier = dog.programme_tier ? titleCase(dog.programme_tier) : null;
  const price = dog.price != null ? formatPrice(dog.price) : null;

  return (
    <View className="mt-4 border-t border-gold/30 pt-4">
      <Typography variant="label" className="mb-3 text-gold">
        KENNEL ONLY
      </Typography>
      {buyer ? <Typography variant="body">Buyer {buyer}</Typography> : null}
      {tier && tier !== '—' ? <Typography variant="body">Programme {tier}</Typography> : null}
      {price ? <Typography variant="body">Price {price}</Typography> : null}
      <Typography variant="label" className="mt-3 text-gold">
        HANDOVER BLOCKERS
      </Typography>
      {blockers.length === 0 ? (
        <Typography variant="caption" className="mt-1 text-muted">
          Nothing outstanding for handover.
        </Typography>
      ) : (
        blockers.map((b) => (
          <Typography key={b.id} variant="body" className="mt-1">
            {b.label}
          </Typography>
        ))
      )}
    </View>
  );
}
