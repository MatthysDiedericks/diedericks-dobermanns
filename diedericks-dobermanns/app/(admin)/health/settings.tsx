import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';

import { AccordionSection } from '@/components/dogs/detail/AccordionSection';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  useAddHealthProduct,
  useAddVetPractice,
  useAllHealthProducts,
  useUpdateHealthProduct,
  useVetPractices,
} from '@/hooks/useHealth';
import type { HealthProductCategory } from '@/lib/health/types';

const CATEGORIES: { key: HealthProductCategory; label: string }[] = [
  { key: 'vaccination', label: 'Vaccinations' },
  { key: 'deworming', label: 'Deworming' },
  { key: 'tick_flea', label: 'Tick & Flea' },
];

export default function HealthSettingsScreen() {
  const { products, refresh: refreshProducts } = useAllHealthProducts();
  const { practices, refresh: refreshPractices } = useVetPractices();
  const addProduct = useAddHealthProduct();
  const updateProduct = useUpdateHealthProduct();
  const addPractice = useAddVetPractice();

  const [productForm, setProductForm] = useState({
    product_name: '',
    category: 'vaccination' as HealthProductCategory,
    manufacturer: '',
    default_schedule_type: 'annual',
  });
  const [practiceForm, setPracticeForm] = useState({
    practice_name: '',
    phone: '',
    email: '',
    address: '',
  });

  async function onAddProduct() {
    if (!productForm.product_name.trim()) return;
    await addProduct({
      product_name: productForm.product_name.trim(),
      category: productForm.category,
      manufacturer: productForm.manufacturer || null,
      default_schedule_type: productForm.default_schedule_type,
    });
    setProductForm({ product_name: '', category: 'vaccination', manufacturer: '', default_schedule_type: 'annual' });
    await refreshProducts();
  }

  async function onAddPractice() {
    if (!practiceForm.practice_name.trim()) return;
    await addPractice({
      practice_name: practiceForm.practice_name.trim(),
      phone: practiceForm.phone || null,
      email: practiceForm.email || null,
      address: practiceForm.address || null,
    });
    setPracticeForm({ practice_name: '', phone: '', email: '', address: '' });
    await refreshPractices();
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Health" title="Products & Practices" back />
      <ScrollView className="px-6 pb-12">
        <AccordionSection title="Vaccine & Product Library" count={products.length} defaultOpen>
          {CATEGORIES.map((cat) => {
            const items = products.filter((p) => p.category === cat.key);
            if (items.length === 0) return null;
            return (
              <View key={cat.key} className="mb-4">
                <Typography variant="label" className="mb-2 text-gold">
                  {cat.label.toUpperCase()}
                </Typography>
                {items.map((p) => (
                  <View
                    key={p.id}
                    className="mb-2 flex-row items-center justify-between rounded-lg border border-gold/15 p-3"
                  >
                    <View className="flex-1">
                      <Typography variant="body">{p.product_name}</Typography>
                      <Typography variant="caption" className="text-muted">
                        {p.manufacturer ?? '—'} · {p.default_schedule_type ?? '—'}
                      </Typography>
                    </View>
                    <Switch
                      value={p.is_active}
                      onValueChange={(v) => void updateProduct(p.id, { is_active: v }).then(refreshProducts)}
                      trackColor={{ true: Colors.gold, false: '#444' }}
                    />
                  </View>
                ))}
              </View>
            );
          })}

          <Input
            value={productForm.product_name}
            onChangeText={(v) => setProductForm((s) => ({ ...s, product_name: v }))}
            placeholder="Product name"
          />
          <View className="my-2 flex-row flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setProductForm((s) => ({ ...s, category: c.key }))}
                className={`rounded-full border px-3 py-1 ${
                  productForm.category === c.key ? 'border-gold bg-gold/15' : 'border-gold/20'
                }`}
              >
                <Typography variant="caption">{c.label}</Typography>
              </Pressable>
            ))}
          </View>
          <Input
            value={productForm.manufacturer}
            onChangeText={(v) => setProductForm((s) => ({ ...s, manufacturer: v }))}
            placeholder="Manufacturer (optional)"
            className="mb-2"
          />
          <Button label="+ Add Product" onPress={() => void onAddProduct()} fullWidth />
        </AccordionSection>

        <AccordionSection title="Veterinary Practices" count={practices.length}>
          {practices.map((p) => (
            <View key={p.id} className="mb-3 rounded-lg border border-gold/15 p-3">
              <Typography variant="subtitle">{p.practice_name}</Typography>
              <Typography variant="caption" className="text-muted">
                {p.phone ?? '—'} · {(p.vet_names ?? []).length} doctors
              </Typography>
              {(p.vet_names ?? []).length > 0 ? (
                <Typography variant="caption" className="mt-1 text-muted">
                  {(p.vet_names ?? []).join(', ')}
                </Typography>
              ) : null}
              {p.address ? (
                <Typography variant="caption" className="mt-1 text-muted">
                  {p.address}
                </Typography>
              ) : null}
            </View>
          ))}

          <Input
            value={practiceForm.practice_name}
            onChangeText={(v) => setPracticeForm((s) => ({ ...s, practice_name: v }))}
            placeholder="Practice name"
          />
          <Input
            value={practiceForm.phone}
            onChangeText={(v) => setPracticeForm((s) => ({ ...s, phone: v }))}
            placeholder="Phone"
            className="mt-2"
          />
          <Input
            value={practiceForm.email}
            onChangeText={(v) => setPracticeForm((s) => ({ ...s, email: v }))}
            placeholder="Email"
            className="mt-2"
          />
          <Input
            value={practiceForm.address}
            onChangeText={(v) => setPracticeForm((s) => ({ ...s, address: v }))}
            placeholder="Address"
            className="mt-2 mb-3"
          />
          <Button label="+ Add Practice" onPress={() => void onAddPractice()} fullWidth />
        </AccordionSection>
      </ScrollView>
    </ScreenContainer>
  );
}
