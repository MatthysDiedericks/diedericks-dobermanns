import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

export function FinanceDashboardFabs() {
  const router = useRouter();
  return (
    <>
      <View className="absolute bottom-6 right-6 flex-row gap-3">
        <Pressable
          onPress={() => router.push('/(admin)/finance/expenses/new')}
          className="rounded-full border border-gold/40 bg-surface px-5 py-3"
        >
          <Typography variant="label">Log expense</Typography>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/quotes/new' as never)}
          className="rounded-full border border-gold/40 bg-surface px-5 py-3"
        >
          <Typography variant="label">New Quote</Typography>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/finance/invoices/new')}
          className="rounded-full border border-gold bg-gold px-5 py-3 flex-row items-center gap-2"
        >
          <Ionicons name="receipt-outline" size={16} color="#111008" />
          <Typography variant="label" className="text-black-rich">
            New Invoice
          </Typography>
        </Pressable>
      </View>

      <View className="absolute bottom-6 left-6 flex-row gap-3">
        <Pressable
          onPress={() => router.push('/(admin)/finance/creditors' as never)}
          className="rounded-full border border-gold/30 bg-black-rich px-4 py-3"
        >
          <Ionicons name="swap-horizontal-outline" size={20} color={Colors.gold} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/finance/reports/index' as never)}
          className="rounded-full border border-gold/30 bg-black-rich px-4 py-3"
        >
          <Ionicons name="document-text-outline" size={20} color={Colors.gold} />
        </Pressable>
      </View>
    </>
  );
}
