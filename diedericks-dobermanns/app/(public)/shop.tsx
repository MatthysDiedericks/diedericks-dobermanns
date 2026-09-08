import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { equipmentImageUrl, shopPriceLabel, stockStatusLabel } from '@/lib/equipment/display';
import { submitEquipmentEnquiry } from '@/lib/equipment/submit';
import type { EquipmentFulfilment } from '@/lib/equipment/types';
import { fetchShopCatalogueItems } from '@/lib/finance/catalogueQueries';
import type { CatalogueItem } from '@/lib/finance/catalogue';
import { MARKETING_CONSENT_LABEL } from '@/lib/marketing/sources';
import { useAuthStore } from '@/stores/authStore';

type Basket = Record<string, number>;

export default function PublicShopScreen() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [basket, setBasket] = useState<Basket>({});
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fulfilment, setFulfilment] = useState<EquipmentFulfilment>('collection');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const signedInPrefill = Boolean(session?.user && (profile?.full_name || session.user.email));

  useEffect(() => {
    void fetchShopCatalogueItems()
      .then(setItems)
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (!signedInPrefill) {
      setEditing(true);
      return;
    }
    setFullName(profile?.full_name ?? '');
    setEmail(profile?.email ?? session?.user.email ?? '');
    setPhone(profile?.phone ?? '');
    setEditing(false);
  }, [signedInPrefill, profile, session]);

  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const lines = Object.entries(basket)
    .filter(([, qty]) => qty > 0)
    .map(([id, quantity]) => ({ item: byId.get(id), quantity }))
    .filter((row): row is { item: CatalogueItem; quantity: number } => Boolean(row.item));

  const setQty = useCallback((id: string, quantity: number) => {
    setBasket((prev) => {
      const next = { ...prev };
      if (quantity <= 0) delete next[id];
      else next[id] = Math.min(99, quantity);
      return next;
    });
  }, []);

  async function onSubmit() {
    setError(null);
    if (lines.length === 0) {
      setError('Add at least one item.');
      return;
    }
    setBusy(true);
    const res = await submitEquipmentEnquiry({
      full_name: fullName,
      email,
      phone,
      fulfilment,
      delivery_address: fulfilment === 'delivery' ? address : null,
      message,
      marketing_opt_in: marketing,
      items: lines.map((l) => ({ catalogue_item_id: l.item.id, quantity: l.quantity })),
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
    setBasket({});
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Retail" title="Equipment" />
      <View className="gap-4 px-6 pb-12">
        <Typography variant="bodyMuted">
          Add what you need. Not an order. We reply with a quote.
        </Typography>

        {loadError ? (
          <EmptyState title="Could not load the shop" message={loadError} />
        ) : items.length === 0 ? (
          <EmptyState title="Nothing in the shop just yet" message="Please check back shortly." />
        ) : (
          items.map((item) => {
            const img = equipmentImageUrl(item.image_path);
            const stock = stockStatusLabel(item.stock_status);
            const qty = basket[item.id] ?? 0;
            return (
              <Card key={item.id} className="overflow-hidden p-0">
                {img ? (
                  <Image source={{ uri: img }} style={{ width: '100%', height: 180 }} contentFit="cover" />
                ) : null}
                <View className="p-4">
                  <Typography variant="subtitle" className="text-gold">
                    {item.label}
                  </Typography>
                  {item.short_description ? (
                    <Typography variant="bodyMuted" className="mt-2">
                      {item.short_description}
                    </Typography>
                  ) : null}
                  <Typography variant="body" className="mt-2">
                    {shopPriceLabel(item)}
                  </Typography>
                  {stock ? (
                    <Typography variant="caption" className="mt-1 text-gold">
                      {stock}
                    </Typography>
                  ) : null}
                  <View className="mt-3 flex-row items-center gap-3">
                    {qty === 0 ? (
                      <Button label="Add" variant="outline" onPress={() => setQty(item.id, 1)} />
                    ) : (
                      <>
                        <Pressable
                          onPress={() => setQty(item.id, qty - 1)}
                          className="h-9 w-9 items-center justify-center rounded-lg border border-gold/40"
                        >
                          <Typography variant="subtitle">−</Typography>
                        </Pressable>
                        <Typography variant="body">{qty}</Typography>
                        <Pressable
                          onPress={() => setQty(item.id, qty + 1)}
                          className="h-9 w-9 items-center justify-center rounded-lg border border-gold/40"
                        >
                          <Typography variant="subtitle">+</Typography>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              </Card>
            );
          })
        )}

        {done ? (
          <Card className="p-4">
            <Typography variant="subtitle" className="text-gold">
              Enquiry received
            </Typography>
            <Typography variant="bodyMuted" className="mt-2">
              Not an order. We will reply with a quote.
            </Typography>
          </Card>
        ) : (
          <Card className="gap-3 p-4">
            <Typography variant="subtitle" className="text-gold">
              Enquire
            </Typography>
            {lines.map((l) => (
              <Typography key={l.item.id} variant="caption">
                {l.item.label} × {l.quantity} · {shopPriceLabel(l.item)}
              </Typography>
            ))}

            {signedInPrefill && !editing ? (
              <View className="rounded-lg border border-gold/20 bg-black-rich p-3">
                <Typography variant="body">{fullName}</Typography>
                <Typography variant="caption">
                  {email}
                  {phone ? ` · ${phone}` : ''}
                </Typography>
                <Pressable onPress={() => setEditing(true)} className="mt-2">
                  <Typography variant="caption" className="text-gold">
                    Edit
                  </Typography>
                </Pressable>
              </View>
            ) : (
              <>
                <Field label="Full name" value={fullName} onChange={setFullName} />
                <Field label="Email" value={email} onChange={setEmail} keyboard="email-address" />
                <Field label="Mobile" value={phone} onChange={setPhone} keyboard="phone-pad" />
              </>
            )}

            <View className="flex-row gap-2">
              {(['collection', 'delivery'] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setFulfilment(value)}
                  className={`rounded-lg border px-4 py-2 ${
                    fulfilment === value ? 'border-gold bg-gold/15' : 'border-gold/20'
                  }`}
                >
                  <Typography variant="caption" className="capitalize">
                    {value}
                  </Typography>
                </Pressable>
              ))}
            </View>

            {fulfilment === 'delivery' ? (
              <Field label="Delivery address" value={address} onChange={setAddress} multiline />
            ) : null}

            <Field label="Message (optional)" value={message} onChange={setMessage} multiline />

            <Checkbox
              checked={marketing}
              onChange={setMarketing}
              label={MARKETING_CONSENT_LABEL}
            />

            {error ? (
              <Typography variant="caption" className="text-red-300">
                {error}
              </Typography>
            ) : null}

            <Button
              label="Send enquiry"
              onPress={() => void onSubmit()}
              loading={busy}
              fullWidth
            />
            <Typography variant="caption">Not an order. We reply with a quote.</Typography>
          </Card>
        )}
      </View>
    </ScreenContainer>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'email-address' | 'phone-pad';
  multiline?: boolean;
}) {
  return (
    <View>
      <Typography variant="caption" className="mb-1 text-silver">
        {label}
      </Typography>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard ?? 'default'}
        multiline={multiline}
        placeholderTextColor={Colors.silver}
        className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
      />
    </View>
  );
}
