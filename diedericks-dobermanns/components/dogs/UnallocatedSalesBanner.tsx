import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { useUnallocatedSalesCount } from '@/hooks/useUnallocatedSales';

export function UnallocatedSalesBanner() {
  const router = useRouter();
  const { count } = useUnallocatedSalesCount();
  if (count === 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/(admin)/dogs/unallocated' as never)}
      className="mx-6 mb-3 rounded-sm border border-gold/30 bg-gold/10 px-4 py-3"
    >
      <Typography variant="label" className="text-gold">
        {count} sold {count === 1 ? 'dog' : 'dogs'} with no owner linked
      </Typography>
    </Pressable>
  );
}
