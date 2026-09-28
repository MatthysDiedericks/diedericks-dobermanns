import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatAmount } from '@/lib/finance/formatters';
import { toCents } from '@/lib/finance/resolveAllocations';
import type { ReceiptCosting } from '@/lib/stock/confirmReceipt';
import { completeReceive, createProduct } from '@/lib/stock/mutations';
import { fetchActiveProducts, fetchStockDogsAndLitters, fetchSupplierNames } from '@/lib/stock/queries';
import {
  lineTotal,
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  type Product,
  type ProductCategory,
  type ProductUnit,
} from '@/lib/stock/types';

type Line = {
  key: string;
  product_id: string;
  product_name: string;
  quantity: string;
  unit_cost: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReceiveStockScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [dogs, setDogs] = useState<Array<{ id: string; name: string }>>([]);
  const [litters, setLitters] = useState<Array<{ id: string; label: string }>>([]);
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [receivedOn, setReceivedOn] = useState(today);
  const [invoiceTotal, setInvoiceTotal] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { key: '1', product_id: '', product_name: '', quantity: '1', unit_cost: '' },
  ]);
  const [kind, setKind] = useState<ReceiptCosting['kind']>('company');
  const [dogId, setDogId] = useState('');
  const [litterId, setLitterId] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ count: number; total: number } | null>(null);

  useEffect(() => {
    void Promise.all([fetchActiveProducts(), fetchSupplierNames(), fetchStockDogsAndLitters()]).then(
      ([p, s, lists]) => {
        setProducts(p);
        setSuppliers(s);
        setDogs(lists.dogs);
        setLitters(lists.litters);
      },
    );
  }, []);

  const computed =
    lines.reduce((sum, l) => {
      const qty = Number(l.quantity);
      const cost = Number(l.unit_cost);
      if (!(qty > 0) || Number.isNaN(cost)) return sum;
      return sum + toCents(lineTotal(qty, cost));
    }, 0) / 100;

  async function confirm() {
    setBusy(true);
    const costing: ReceiptCosting =
      kind === 'dog'
        ? { kind: 'dog', dogId }
        : kind === 'litter'
          ? { kind: 'litter', litterId }
          : { kind };
    const res = await completeReceive({
      supplier_name: supplier,
      supplier_invoice_no: invoiceNo,
      received_on: receivedOn,
      supplier_invoice_total: Number(invoiceTotal) || computed,
      costing,
      lines: lines
        .filter((l) => l.product_id)
        .map((l) => ({
          product_id: l.product_id,
          product_name: l.product_name,
          quantity: Number(l.quantity),
          unit_cost: Number(l.unit_cost) || 0,
        })),
    });
    setBusy(false);
    if (res.error) {
      Alert.alert('Could not confirm', res.error);
      return;
    }
    setDone({ count: res.quantity_total ?? res.item_count ?? 0, total: res.total ?? computed });
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Stock" title="Receive stock" />
      <View className="gap-4 px-6 pb-12">
        <View className="flex-row gap-2">
          {(['Supplier', "What's in the box", 'Confirm'] as const).map((label, i) => (
            <Pressable
              key={label}
              onPress={() => (i + 1 < step ? setStep(i + 1) : undefined)}
              className={`flex-1 rounded-lg border px-2 py-2 ${
                step === i + 1 ? 'border-gold bg-gold/15' : 'border-gold/20'
              }`}
            >
              <Typography variant="caption" className="text-center text-gold">
                {i + 1}. {label}
              </Typography>
            </Pressable>
          ))}
        </View>

        {done ? (
          <Card className="gap-3 p-4">
            <Typography variant="subtitle" className="text-gold">
              Received — {done.count} items, {formatAmount(done.total)}, expense posted
            </Typography>
            <Button label="Receive another" onPress={() => router.replace('/(admin)/stock/receive' as never)} />
            <Button label="Back to stock" variant="outline" onPress={() => router.replace('/(admin)/stock' as never)} />
          </Card>
        ) : step === 1 ? (
          <View className="gap-3">
            <Field label="Supplier" value={supplier} onChange={setSupplier} />
            {suppliers.slice(0, 6).map((name) => (
              <Pressable key={name} onPress={() => setSupplier(name)}>
                <Typography variant="caption" className="text-gold">
                  {name}
                </Typography>
              </Pressable>
            ))}
            <Field label="Invoice number" value={invoiceNo} onChange={setInvoiceNo} />
            <Field label="Date received" value={receivedOn} onChange={setReceivedOn} />
            <Field label="Supplier invoice total" value={invoiceTotal} onChange={setInvoiceTotal} keyboard />
            <Button label="Continue" onPress={() => setStep(2)} />
          </View>
        ) : step === 2 ? (
          <View className="gap-3">
            {lines.map((line, index) => (
              <Card key={line.key} className="gap-2 p-3">
                <Typography variant="caption">Product</Typography>
                <TextInput
                  value={line.product_name}
                  placeholder="Type SKU or name"
                  placeholderTextColor={Colors.silver}
                  className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
                  onChangeText={(v) => {
                    const match = products.find(
                      (p) =>
                        p.name.toLowerCase() === v.toLowerCase() ||
                        p.sku.toLowerCase() === v.toLowerCase(),
                    );
                    setLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key
                          ? {
                              ...l,
                              product_name: v,
                              product_id: match?.id ?? '',
                              unit_cost: l.unit_cost || (match ? String(match.cost_price) : ''),
                            }
                          : l,
                      ),
                    );
                  }}
                />
                {products
                  .filter((p) => {
                    const q = line.product_name.trim().toLowerCase();
                    if (!q || line.product_id) return false;
                    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
                  })
                  .slice(0, 5)
                  .map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  product_id: p.id,
                                  product_name: p.name,
                                  unit_cost: l.unit_cost || String(p.cost_price),
                                }
                              : l,
                          ),
                        )
                      }
                    >
                      <Typography variant="caption" className="text-gold">
                        {p.name} · {p.sku}
                      </Typography>
                    </Pressable>
                  ))}
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Field
                      label="Qty"
                      value={line.quantity}
                      keyboard
                      onChange={(v) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, quantity: v } : l)),
                        )
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Field
                      label="Unit cost"
                      value={line.unit_cost}
                      keyboard
                      onChange={(v) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, unit_cost: v } : l)),
                        )
                      }
                    />
                  </View>
                </View>
                {index === lines.length - 1 ? (
                  <InlineNew
                    onCreated={(p) => {
                      setProducts((prev) => [...prev, p]);
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key
                            ? {
                                ...l,
                                product_id: p.id,
                                product_name: p.name,
                                unit_cost: String(p.cost_price),
                              }
                            : l,
                        ),
                      );
                    }}
                  />
                ) : null}
              </Card>
            ))}
            <Button
              label="Add line"
              variant="outline"
              onPress={() =>
                setLines((prev) => [
                  ...prev,
                  {
                    key: String(prev.length + 1),
                    product_id: '',
                    product_name: '',
                    quantity: '1',
                    unit_cost: '',
                  },
                ])
              }
            />
            <Typography variant="subtitle" className="text-gold">
              Running total {formatAmount(computed)}
              {invoiceTotal.trim() && Number.isFinite(Number(invoiceTotal)) && Number(invoiceTotal) !== computed
                ? ` · invoice ${formatAmount(Number(invoiceTotal))} · difference ${formatAmount(Number(invoiceTotal) - computed)}`
                : ''}
            </Typography>
            <Button label="Continue" onPress={() => setStep(3)} />
            <Button label="Back" variant="outline" onPress={() => setStep(1)} />
          </View>
        ) : (
          <View className="gap-3">
            {lines
              .filter((l) => l.product_id)
              .map((l) => (
                <Typography key={l.key} variant="body">
                  {l.product_name} · {l.quantity} × {formatAmount(Number(l.unit_cost) || 0)}
                </Typography>
              ))}
            <Typography variant="subtitle">{formatAmount(computed)}</Typography>
            <Typography variant="caption">How should this be costed?</Typography>
            {(
              [
                ['company', 'Company'],
                ['shared', 'Shared across the dogs'],
                ['dog', 'One dog'],
                ['litter', 'One litter'],
              ] as const
            ).map(([value, label]) => (
              <Pressable key={value} onPress={() => setKind(value)}>
                <Typography variant="body" className={kind === value ? 'text-gold' : ''}>
                  {kind === value ? '● ' : '○ '}
                  {label}
                </Typography>
              </Pressable>
            ))}
            {kind === 'dog'
              ? dogs.slice(0, 40).map((d) => (
                  <Pressable key={d.id} onPress={() => setDogId(d.id)}>
                    <Typography className={dogId === d.id ? 'text-gold' : ''}>{d.name}</Typography>
                  </Pressable>
                ))
              : null}
            {kind === 'litter'
              ? litters.map((l) => (
                  <Pressable key={l.id} onPress={() => setLitterId(l.id)}>
                    <Typography className={litterId === l.id ? 'text-gold' : ''}>{l.label}</Typography>
                  </Pressable>
                ))
              : null}
            <Button label={busy ? 'Posting…' : 'Confirm receive'} onPress={() => void confirm()} />
            <Button label="Back" variant="outline" onPress={() => setStep(2)} />
          </View>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: boolean;
}) {
  return (
    <View>
      <Typography variant="caption" className="mb-1 text-silver">
        {label}
      </Typography>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard ? 'decimal-pad' : 'default'}
        placeholderTextColor={Colors.silver}
        className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
      />
    </View>
  );
}

function InlineNew({ onCreated }: { onCreated: (p: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('other');
  const [unit, setUnit] = useState<ProductUnit>('each');
  const [cost, setCost] = useState('');
  const [sell, setSell] = useState('');

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)}>
        <Typography variant="caption" className="text-gold">
          + New product
        </Typography>
      </Pressable>
    );
  }

  return (
    <View className="gap-2">
      <Field label="Name" value={name} onChange={setName} />
      <View className="flex-row flex-wrap gap-2">
        {PRODUCT_CATEGORIES.map((c) => (
          <Pressable key={c.value} onPress={() => setCategory(c.value)}>
            <Typography variant="caption" className={category === c.value ? 'text-gold' : ''}>
              {c.label}
            </Typography>
          </Pressable>
        ))}
      </View>
      <View className="flex-row gap-2">
        {PRODUCT_UNITS.map((u) => (
          <Pressable key={u.value} onPress={() => setUnit(u.value)}>
            <Typography variant="caption" className={unit === u.value ? 'text-gold' : ''}>
              {u.label}
            </Typography>
          </Pressable>
        ))}
      </View>
      <Field label="Cost" value={cost} onChange={setCost} keyboard />
      <Field label="Sell" value={sell} onChange={setSell} keyboard />
      <Button
        label="Add"
        onPress={async () => {
          const res = await createProduct({
            name,
            category,
            unit,
            cost_price: Number(cost) || 0,
            sell_price: Number(sell) || 0,
          });
          if (res.error || !res.id) {
            Alert.alert('Could not create', res.error ?? 'Unknown error');
            return;
          }
          onCreated({
            id: res.id,
            sku: name,
            name: name.trim(),
            category,
            unit,
            cost_price: Number(cost) || 0,
            sell_price: Number(sell) || 0,
            vat_rate: 15,
            reorder_level: 0,
            image_path: null,
            short_description: null,
            is_client_visible: false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            updated_by: null,
          });
          setOpen(false);
        }}
      />
    </View>
  );
}
