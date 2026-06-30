import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { PayFastCheckoutModal } from '@/components/payments/PayFastCheckoutModal';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { usePayFastCheckout } from '@/hooks/usePayFastCheckout';
import {
  useCategoryVideoCounts,
  useClientBundles,
  useVideoBundles,
  useVideoCategories,
} from '@/hooks/useTrainingVideos';
import { formatAmount } from '@/lib/finance/formatters';
import { isPayFastConfigured } from '@/lib/payments/payfast';
import { openWhatsApp } from '@/lib/social';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  ribbon: 'ribbon-outline',
  shield: 'shield-outline',
  earth: 'earth-outline',
  school: 'school-outline',
  'play-circle': 'play-circle-outline',
};

export default function TrainingVideoLibraryScreen() {
  const router = useRouter();
  const { settings } = useAppSettings();
  const { categories, loading: catLoading } = useVideoCategories();
  const { bundles, loading: bundleLoading } = useVideoBundles();
  const { purchasedBundleIds, refetch: refetchBundles } = useClientBundles();
  const counts = useCategoryVideoCounts();
  const { startCheckout, loading: checkoutLoading } = usePayFastCheckout();
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);

  const categoryAccessLabel = (catName: string) => {
    if (catName.includes('Protection') || catName.includes('Curriculum')) return 'BUNDLE';
    return 'FREE';
  };

  const enquireBundle = (name: string) => {
    openWhatsApp(
      settings.whatsapp_number,
      `Hi, I'd like to enquire about the ${name} video bundle.`,
    );
  };

  async function purchaseBundle(bundle: { id: string; name: string; price: number; description: string | null }) {
    if (!isPayFastConfigured()) {
      enquireBundle(bundle.name);
      return;
    }
    const result = await startCheckout({
      orderType: 'video_bundle',
      referenceId: bundle.id,
      amount: Number(bundle.price),
      itemName: bundle.name,
      itemDescription: bundle.description ?? undefined,
    });
    if (result.error) {
      Alert.alert('Payment unavailable', result.error);
      return;
    }
    if (result.html) setCheckoutHtml(result.html);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Training" title="Training Library" />

      <ScrollView className="px-6 pb-12">
        <Typography variant="caption" className="mb-4 text-silver">
          Videos from Diedericks Dobermanns
        </Typography>

        {catLoading ? (
          <ActivityIndicator color={Colors.gold} className="my-8" />
        ) : (
          <View className="mb-6 flex-row flex-wrap gap-3">
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() =>
                  router.push({
                    pathname: '/(portal)/training/videos/[categoryId]',
                    params: { categoryId: cat.id },
                  } as never)
                }
                style={{ width: '47%' }}
              >
                <Card className="min-h-[120px] border-gold/25">
                  <Ionicons
                    name={ICON_MAP[cat.icon] ?? 'play-circle-outline'}
                    size={24}
                    color={cat.colour}
                  />
                  <Typography variant="subtitle" className="mt-2" numberOfLines={2}>
                    {cat.name}
                  </Typography>
                  <Typography variant="caption" className="mt-1 text-silver">
                    {counts[cat.id] ?? 0} videos · {categoryAccessLabel(cat.name)}
                  </Typography>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        <Typography variant="label" className="mb-3 text-gold">
          My bundles
        </Typography>
        {bundleLoading ? (
          <ActivityIndicator color={Colors.gold} />
        ) : (
          bundles.map((b) => {
            const owned = purchasedBundleIds.has(b.id);
            return (
              <Card key={b.id} className="mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Typography variant="body">
                      {owned ? '✓ ' : '🔒 '}
                      {b.name}
                    </Typography>
                    <Typography variant="caption" className="text-silver" numberOfLines={2}>
                      {b.description}
                    </Typography>
                  </View>
                  {owned ? (
                    <Typography variant="caption" className="text-success">
                      Purchased
                    </Typography>
                  ) : (
                    <Pressable
                      onPress={() => purchaseBundle(b)}
                      disabled={checkoutLoading}
                      className="rounded-full border border-gold px-3 py-1.5"
                    >
                      <Typography variant="caption" className="text-gold">
                        {isPayFastConfigured() ? 'Buy' : 'Unlock'} · {formatAmount(Number(b.price))}
                      </Typography>
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
      <PayFastCheckoutModal
        visible={!!checkoutHtml}
        html={checkoutHtml}
        onClose={() => {
          setCheckoutHtml(null);
          void refetchBundles();
        }}
      />
    </ScreenContainer>
  );
}
