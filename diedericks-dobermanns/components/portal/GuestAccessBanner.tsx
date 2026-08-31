import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { GuestAccess } from '@/hooks/useGuestAccess';

export function GuestAccessBanner({ access }: { access: GuestAccess }) {
  if (!access.isGuest) return null;
  const holder = access.holderName ?? 'the account holder';
  return (
    <View className="mb-4 rounded-xl border border-gold/40 bg-gold/10 p-4">
      <Typography variant="label" className="text-gold">
        Guest access
      </Typography>
      <Typography variant="body" className="mt-2">
        You have guest access to {holder}&apos;s portal. You are looking at their dogs and
        records, not your own.
      </Typography>
      <Typography variant="caption" className="mt-2 text-subtle">
        You can see vaccinations, training updates and upload photos. You cannot sign a
        contract.
        {access.canViewFinancials
          ? ' They have turned on financial access.'
          : ' You cannot see invoices, quotes, payments or the contract.'}
      </Typography>
    </View>
  );
}
