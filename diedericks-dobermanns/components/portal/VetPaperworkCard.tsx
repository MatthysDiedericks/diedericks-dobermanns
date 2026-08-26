import { useState } from 'react';
import { View } from 'react-native';

import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { fileTypeFromName } from '@/lib/documents/constants';
import { requireSupabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';

const CATEGORIES = [
  { value: 'vaccination_record', label: 'Vaccination record' },
  { value: 'health_certificate', label: 'Health certificate' },
  { value: 'microchip', label: 'Microchip certificate' },
  { value: 'other', label: 'Other vet paperwork' },
] as const;

export function VetPaperworkCard({
  dogs,
  onSaved,
}: {
  dogs: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [dogId, setDogId] = useState(dogs[0]?.id ?? '');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['value']>('vaccination_record');
  const [photos, setPhotos] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!userId || dogs.length === 0) return null;

  async function send() {
    if (!userId || !dogId || photos.length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const uri = photos[0];
    const uploaded = await uploadFile({
      bucket: 'documents',
      path: `${userId}/health/${dogId}/${Date.now()}.jpg`,
      uri,
      contentType: 'image/jpeg',
    });
    if (uploaded.error || !uploaded.path) {
      setBusy(false);
      setError(uploaded.error ?? 'Upload failed.');
      return;
    }
    const supabase = requireSupabase();
    const { error: insertError } = await supabase.from('documents').insert({
      entity_type: 'health',
      entity_id: dogId,
      document_name: 'Vet paperwork',
      original_filename: uploaded.path.split('/').pop() ?? 'vet.jpg',
      storage_path: uploaded.path,
      file_type: fileTypeFromName(uploaded.path),
      category,
      client_visible: true,
      is_public: false,
      uploaded_by: userId,
      review_status: 'pending',
      provided_by: 'client',
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setPhotos([]);
    setNotice('Sent to Diedericks Dobermanns — awaiting confirmation');
    onSaved();
  }

  return (
    <View className="mb-4 rounded-xl border border-gold/20 bg-surface p-4">
      <Typography variant="label" className="text-gold">
        VET PAPERWORK
      </Typography>
      <Typography variant="caption" className="mt-1 text-subtle">
        Photograph the card at the vet. We confirm it on our side.
      </Typography>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {dogs.map((d) => (
          <Button
            key={d.id}
            label={d.name}
            size="sm"
            variant={dogId === d.id ? 'solid' : 'outline'}
            onPress={() => setDogId(d.id)}
          />
        ))}
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Button
            key={c.value}
            label={c.label}
            size="sm"
            variant={category === c.value ? 'solid' : 'outline'}
            onPress={() => setCategory(c.value)}
          />
        ))}
      </View>
      <View className="mt-3">
        <PhotoPicker value={photos} onChange={setPhotos} max={1} />
      </View>
      {error ? <Typography variant="caption" className="mt-2">{error}</Typography> : null}
      {notice ? <Typography variant="body" className="mt-2">{notice}</Typography> : null}
      <Button
        label="Send to Diedericks Dobermanns"
        className="mt-3"
        loading={busy}
        disabled={photos.length === 0}
        onPress={() => void send()}
      />
    </View>
  );
}
