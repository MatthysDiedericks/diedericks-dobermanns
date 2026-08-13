import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { CatalogueItem } from '@/lib/finance/catalogue';
import { formatPrice } from '@/lib/format';

export function CatalogueItemPicker({
  visible,
  items,
  onPick,
  onClose,
}: {
  visible: boolean;
  items: CatalogueItem[];
  onPick: (item: CatalogueItem) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const grouped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = items.filter((it) => {
      if (!needle) return true;
      return (
        it.label.toLowerCase().includes(needle) ||
        it.code.toLowerCase().includes(needle) ||
        it.category.toLowerCase().includes(needle)
      );
    });
    const map = new Map<string, CatalogueItem[]>();
    for (const it of filtered) {
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return [...map.entries()];
  }, [items, q]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[80%] rounded-t-2xl bg-surface p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Typography variant="subtitle" className="text-gold">
              Add from catalogue
            </Typography>
            <Pressable onPress={onClose}>
              <Typography variant="caption" className="text-ink-muted">
                Close
              </Typography>
            </Pressable>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search…"
            placeholderTextColor={Colors.silver}
            className="mb-3 rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
          />
          <ScrollView>
            {grouped.map(([category, list]) => (
              <View key={category} className="mb-3">
                <Typography variant="caption" className="mb-1 uppercase text-silver">
                  {category}
                </Typography>
                {list.map((it) => (
                  <Pressable
                    key={it.id}
                    onPress={() => {
                      onPick(it);
                      onClose();
                    }}
                    className="mb-1 flex-row items-center justify-between rounded-lg border border-gold/10 px-3 py-3"
                  >
                    <Typography variant="body">{it.label}</Typography>
                    <Typography variant="caption" className="text-ink-muted">
                      {it.price_varies || it.default_price == null
                        ? 'price varies'
                        : formatPrice(it.default_price)}
                    </Typography>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
