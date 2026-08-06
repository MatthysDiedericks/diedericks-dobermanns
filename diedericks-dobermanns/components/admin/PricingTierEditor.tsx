import { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import type { PricingTier } from '@/lib/finance/pricingQueries';

interface PricingTierPatch {
  price: number;
  display_label: string;
  description: string | null;
  is_public: boolean;
}

interface PricingTierEditorProps {
  tier: PricingTier | null;
  onClose: () => void;
  onSave: (id: string, patch: PricingTierPatch) => Promise<{ error: string | null }>;
}

/** Edit form for a single pricing tier — price, label, description, public visibility. */
export function PricingTierEditor({ tier, onClose, onSave }: PricingTierEditorProps) {
  const [price, setPrice] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tier) return;
    setPrice(String(tier.price));
    setLabel(tier.display_label);
    setDescription(tier.description ?? '');
    setIsPublic(tier.is_public);
    setPriceError(null);
  }, [tier]);

  async function handleSave() {
    if (!tier) return;
    const trimmedLabel = label.trim();
    const numericPrice = Number(price);

    if (!price.trim() || Number.isNaN(numericPrice) || numericPrice < 0) {
      setPriceError('Enter a valid price of 0 or more.');
      return;
    }
    if (!trimmedLabel) {
      setPriceError('Label cannot be empty.');
      return;
    }
    setPriceError(null);

    setSubmitting(true);
    try {
      const { error } = await onSave(tier.id, {
        price: numericPrice,
        display_label: trimmedLabel,
        description: description.trim() || null,
        is_public: isPublic,
      });
      if (error) {
        Alert.alert('Could not save', error);
        return;
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={!!tier} onClose={onClose} title="Edit Pricing Tier">
      <Input
        label="Display label"
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. Standard Puppy"
      />
      <Input
        label="Price (ZAR)"
        value={price}
        onChangeText={(v) => {
          setPrice(v);
          setPriceError(null);
        }}
        keyboardType="numeric"
        placeholder="0"
        error={priceError ?? undefined}
      />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Shown to admins and, if public, on the website"
        multiline
        numberOfLines={3}
        className="h-20"
      />

      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Typography variant="body">Show on website</Typography>
          <Typography variant="caption" className="mt-0.5 text-subtle">
            When off, the price is hidden from applicants but still used to price quotes.
          </Typography>
        </View>
        <Switch value={isPublic} onValueChange={setIsPublic} />
      </View>

      <View className="flex-row gap-3">
        <Button label="Cancel" variant="outline" onPress={onClose} className="flex-1" disabled={submitting} />
        <Button label="Save" onPress={() => void handleSave()} className="flex-1" loading={submitting} />
      </View>
    </Modal>
  );
}
