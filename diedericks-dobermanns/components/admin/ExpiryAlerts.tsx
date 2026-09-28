import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { attentionHeadline, attentionText } from '@/lib/alerts/phrases';
import {
  dismissExpiringItem,
  fetchExpiringItems,
  type ExpiringItem,
} from '@/lib/alerts/expiring';

type AlertContextValue = {
  items: ExpiringItem[];
  dismiss: (item: ExpiringItem) => Promise<void>;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function ExpiringAlertsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ExpiringItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      setItems(await fetchExpiringItems());
    } catch (error) {
      console.error('[alerts]', error);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dismiss = useCallback(
    async (item: ExpiringItem) => {
      const result = await dismissExpiringItem(item.kind, item.id);
      if (result.error) {
        Alert.alert('Could not dismiss', result.error);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  return <AlertContext.Provider value={{ items, dismiss }}>{children}</AlertContext.Provider>;
}

function useAlerts(): AlertContextValue {
  const value = useContext(AlertContext);
  if (!value) return { items: [], dismiss: async () => {} };
  return value;
}

export function ExpiryBanner() {
  const router = useRouter();
  const { items } = useAlerts();
  if (items.length === 0) return null;
  const shown = items.slice(0, 4);
  const rest = items.length - shown.length;
  return (
    <View className="mb-4 rounded-sm border border-gold/40 bg-gold/10 px-4 py-3">
      <Typography variant="label" className="text-gold">
        {attentionHeadline(items.length)}
      </Typography>
      <View className="mt-2 gap-1">
        {shown.map((item) => (
          <Pressable key={`${item.kind}:${item.id}`} onPress={() => router.push(item.href as never)}>
            <Typography variant="body" className={item.daysLeft < 0 ? 'text-danger' : ''}>
              {attentionText(item)}
            </Typography>
          </Pressable>
        ))}
        {rest > 0 ? <Typography variant="caption">and {rest} more</Typography> : null}
      </View>
    </View>
  );
}

export function ExpiryBell() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, dismiss } = useAlerts();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={items.length ? `${items.length} things need attention` : 'Nothing expiring'}
        className="h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-black-rich"
      >
        <Ionicons name="notifications-outline" size={18} color={Colors.gold} />
        {items.length > 0 ? (
          <View className="absolute -right-1 -top-1 min-w-4 items-center rounded-full bg-gold px-1">
            <Typography variant="caption" className="text-[10px] text-black">
              {items.length}
            </Typography>
          </View>
        ) : null}
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setOpen(false)}>
          <Pressable
            className="max-h-[80%] rounded-t-2xl bg-surface px-5 pt-4"
            style={{ paddingBottom: insets.bottom + 16 }}
            onPress={() => {}}
          >
            <Typography variant="subtitle" className="text-gold">
              {items.length ? attentionHeadline(items.length) : 'Nothing expiring'}
            </Typography>
            <ScrollView className="mt-3">
              {items.length === 0 ? (
                <Typography variant="bodyMuted">Nothing is inside its lead time.</Typography>
              ) : (
                items.map((item) => (
                  <View key={`${item.kind}:${item.id}`} className="border-b border-gold/10 py-3">
                    <Pressable
                      onPress={() => {
                        setOpen(false);
                        router.push(item.href as never);
                      }}
                    >
                      <Typography variant="body" className={item.daysLeft < 0 ? 'text-danger' : ''}>
                        {attentionText(item)}
                      </Typography>
                    </Pressable>
                    {item.daysLeft < 0 ? null : (
                      <Pressable onPress={() => void dismiss(item)} className="mt-1">
                        <Typography variant="caption">Dismiss for 7 days</Typography>
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
