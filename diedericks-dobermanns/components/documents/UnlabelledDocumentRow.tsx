import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { DocumentPreviewThumb } from '@/components/documents/DocumentPreviewThumb';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import {
  LABELLABLE_CATEGORIES,
  type UnlabelledDocument,
} from '@/lib/documents/unlabelled';

type Props = {
  item: UnlabelledDocument;
  onSave: (id: string, name: string, category: string) => Promise<{ error?: string }>;
};

export function UnlabelledDocumentRow({ item, onSave }: Props) {
  const [name, setName] = useState(item.document_name);
  const [category, setCategory] = useState('pedigree');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await onSave(item.id, name, category);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  return (
    <View className="rounded-sm border border-gold/20 bg-surface p-4">
      <View className="flex-row gap-3">
        <DocumentPreviewThumb source={item} />
        <View className="flex-1">
          <Typography variant="caption" className="text-subtle">
            {item.dogName ?? item.entity_type}
            {item.original_filename ? ` · ${item.original_filename}` : ''}
          </Typography>
          <Input
            label="Document name"
            value={name}
            onChangeText={setName}
            containerClassName="mt-3 mb-0"
          />
        </View>
      </View>

      <Typography variant="label" className="mb-2 mt-3 text-silver">
        Category
      </Typography>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {LABELLABLE_CATEGORIES.map((c) => (
          <Pressable
            key={c.value}
            onPress={() => setCategory(c.value)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              category === c.value ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{c.label}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}

      <Button
        label={busy ? 'Saving…' : 'Save label'}
        size="sm"
        className="mt-3 self-start"
        loading={busy}
        disabled={busy}
        onPress={() => void save()}
      />
    </View>
  );
}
