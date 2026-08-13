import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  CATALOGUE_CATEGORIES,
  codeFromLabel,
  isStarterCatalogueItem,
  type CatalogueCategory,
  type CatalogueItem,
} from '@/lib/finance/catalogue';
import {
  createCatalogueItem,
  deactivateCatalogueItem,
  fetchAllCatalogueItems,
  fetchCatalogueUsageCounts,
  updateCatalogueItem,
} from '@/lib/finance/catalogueQueries';
import { formatPrice } from '@/lib/format';

type Draft = {
  label: string;
  item_type: string;
  category: CatalogueCategory;
  default_price: string;
  price_varies: boolean;
  description_template: string;
  notes: string;
  sort_order: string;
};

const blank = (): Draft => ({
  label: '',
  item_type: 'other',
  category: 'other',
  default_price: '',
  price_varies: true,
  description_template: '',
  notes: '',
  sort_order: '0',
});

export default function CatalogueSettingsScreen() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [all, counts] = await Promise.all([
      fetchAllCatalogueItems(),
      fetchCatalogueUsageCounts(),
    ]);
    setItems(all);
    setUsage(counts);
  }, []);

  useEffect(() => {
    void reload().catch((e) => Alert.alert('Could not load catalogue', e.message));
  }, [reload]);

  const showBanner = useMemo(
    () => items.some((it) => it.is_active && isStarterCatalogueItem(it)),
    [items],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogueItem[]>();
    for (const it of items) {
      const list = map.get(it.category) ?? [];
      list.push(it);
      map.set(it.category, list);
    }
    return CATALOGUE_CATEGORIES.map((c) => ({ category: c, items: map.get(c) ?? [] })).filter(
      (g) => g.items.length > 0,
    );
  }, [items]);

  async function save() {
    setBusy(true);
    const payload = {
      code: codeFromLabel(draft.label),
      label: draft.label.trim(),
      item_type: draft.item_type,
      category: draft.category,
      default_price: draft.default_price === '' ? null : Number(draft.default_price),
      price_varies: draft.price_varies,
      description_template: draft.description_template.trim() || draft.label.trim(),
      notes: draft.notes.trim() || null,
      is_active: true,
      sort_order: Number(draft.sort_order) || 0,
    };
    const res =
      editingId === 'new'
        ? await createCatalogueItem(payload)
        : editingId
          ? await updateCatalogueItem(editingId, payload)
          : { error: 'Nothing to save' };
    setBusy(false);
    if (res.error) {
      Alert.alert('Could not save', res.error);
      return;
    }
    setEditingId(null);
    await reload();
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Admin" title="Quote catalogue" />
      <View className="gap-4 px-6 pb-10">
        {showBanner ? (
          <Card className="border border-amber-500/40 bg-amber-500/10 p-4">
            <Typography variant="bodyMuted">
              These are starting suggestions — edit, price or deactivate them to match what you
              actually sell.
            </Typography>
            <Button
              label="I've reviewed these"
              variant="outline"
              className="mt-3"
              onPress={async () => {
                for (const it of items.filter(isStarterCatalogueItem)) {
                  await updateCatalogueItem(it.id, {
                    notes: (it.notes ?? '').replace(/\[starter\]\s*/g, '').trim() || null,
                  });
                }
                await reload();
              }}
            />
          </Card>
        ) : null}

        <Button
          label="Add catalogue item"
          onPress={() => {
            setEditingId('new');
            setDraft(blank());
          }}
          fullWidth
        />

        {editingId === 'new' ? (
          <Editor draft={draft} setDraft={setDraft} busy={busy} onSave={save} onCancel={() => setEditingId(null)} />
        ) : null}

        {grouped.map((g) => (
          <View key={g.category} className="gap-2">
            <Typography variant="caption" className="uppercase text-gold">
              {g.category}
            </Typography>
            {g.items.map((it) => (
              <Card key={it.id} className={`p-4 ${it.is_active ? '' : 'opacity-50'}`}>
                <Typography variant="subtitle">{it.label}</Typography>
                <Typography variant="caption" className="mt-1 text-ink-muted">
                  {it.item_type.replace(/_/g, ' ')} ·{' '}
                  {it.price_varies ? 'price varies' : formatPrice(it.default_price ?? 0)} · on{' '}
                  {usage[it.code] ?? 0} quotes{!it.is_active ? ' · inactive' : ''}
                </Typography>
                <View className="mt-3 flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      setEditingId(it.id);
                      setDraft({
                        label: it.label,
                        item_type: it.item_type,
                        category: it.category,
                        default_price: it.default_price == null ? '' : String(it.default_price),
                        price_varies: it.price_varies,
                        description_template: it.description_template ?? '',
                        notes: it.notes ?? '',
                        sort_order: String(it.sort_order),
                      });
                    }}
                  >
                    <Typography variant="caption" className="text-gold">
                      Edit
                    </Typography>
                  </Pressable>
                  {it.is_active ? (
                    <Pressable
                      onPress={async () => {
                        await deactivateCatalogueItem(it.id);
                        await reload();
                      }}
                    >
                      <Typography variant="caption" className="text-red-300">
                        Deactivate
                      </Typography>
                    </Pressable>
                  ) : null}
                </View>
                {editingId === it.id ? (
                  <Editor
                    draft={draft}
                    setDraft={setDraft}
                    busy={busy}
                    onSave={save}
                    onCancel={() => setEditingId(null)}
                  />
                ) : null}
              </Card>
            ))}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

function Editor({
  draft,
  setDraft,
  busy,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Card className="mt-3 gap-2 p-3">
      {(
        [
          ['Label', 'label'],
          ['Item type', 'item_type'],
          ['Category', 'category'],
          ['Description template', 'description_template'],
          ['Sort order', 'sort_order'],
          ['Notes', 'notes'],
        ] as const
      ).map(([label, key]) => (
        <View key={key}>
          <Typography variant="caption" className="mb-1 text-silver">
            {label}
          </Typography>
          <TextInput
            value={draft[key]}
            onChangeText={(v) => setDraft({ ...draft, [key]: v })}
            placeholderTextColor={Colors.silver}
            className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
          />
        </View>
      ))}
      <Pressable onPress={() => setDraft({ ...draft, price_varies: !draft.price_varies })}>
        <Typography variant="bodyMuted">
          Price varies: {draft.price_varies ? 'yes' : 'no'} (tap to toggle)
        </Typography>
      </Pressable>
      {!draft.price_varies ? (
        <TextInput
          value={draft.default_price}
          onChangeText={(v) => setDraft({ ...draft, default_price: v })}
          keyboardType="decimal-pad"
          placeholder="Default price"
          placeholderTextColor={Colors.silver}
          className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
        />
      ) : null}
      <View className="mt-2 flex-row gap-2">
        <Button label="Save" onPress={onSave} loading={busy} />
        <Button label="Cancel" variant="outline" onPress={onCancel} />
      </View>
    </Card>
  );
}
