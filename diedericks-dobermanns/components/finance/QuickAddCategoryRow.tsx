import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { createExpenseCategory } from '@/lib/finance/queries';
import type { ExpenseCategory } from '@/types/finance';

const PALETTE = [
  '#E74C3C', '#E67E22', '#F39C12', '#F1C40F', '#2ECC71', '#1ABC9C',
  '#3498DB', '#2980B9', '#9B59B6', '#8E44AD', '#C0392B', '#7F8C8D',
];

interface QuickAddCategoryRowProps {
  onCreated: (category: ExpenseCategory) => void;
}

export function QuickAddCategoryRow({ onCreated }: QuickAddCategoryRowProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [colour, setColour] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setOpen(false);
    setName('');
    setColour(PALETTE[0]);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const cat = await createExpenseCategory(name.trim(), colour);
      onCreated(cat);
      close();
    } catch (e) {
      console.error('[QuickAddCategoryRow]', e);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        className="mt-1 items-center rounded-lg border border-dashed border-gold/30 py-2.5"
      >
        <Typography variant="caption" className="text-gold">
          + New Category
        </Typography>
      </Pressable>
    );
  }

  return (
    <View className="mt-1 rounded-xl border border-gold/20 bg-surface p-3">
      <BottomSheetTextInput
        value={name}
        onChangeText={setName}
        placeholder="Category name"
        placeholderTextColor="#9E9E9E"
        className="mb-3 rounded-lg border border-gold/20 bg-black-rich px-3 py-2 font-body text-sm text-ink"
      />
      <View className="mb-3 flex-row flex-wrap gap-2">
        {PALETTE.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColour(c)}
            className={`h-7 w-7 rounded-full ${colour === c ? 'border-2 border-gold' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </View>
      <View className="flex-row gap-2">
        <Button label="Cancel" variant="outline" size="sm" onPress={close} />
        <Button label="Add category" size="sm" loading={saving} onPress={() => void save()} />
      </View>
    </View>
  );
}
