import { useState } from 'react';
import { View } from 'react-native';

import { PhotoPicker } from '@/components/forms/PhotoPicker';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { fileTypeFromName } from '@/lib/documents/constants';
import { uploadFile } from '@/lib/storage';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function MicrochipQuickAttach({ dogId, dogName, onSaved }: { dogId: string; dogName: string; onSaved: () => void }) {
  const uid = useAuthStore((s) => s.session?.user.id);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!uid || photos.length === 0) return;
    setBusy(true);
    setError(null);
    const uploaded = await uploadFile({
      bucket: 'documents',
      path: `dogs/${dogId}/microchip/${Date.now()}.jpg`,
      uri: photos[0],
      contentType: 'image/jpeg',
    });
    if (uploaded.error || !uploaded.path) {
      setBusy(false);
      setError(uploaded.error ?? 'Upload failed.');
      return;
    }
    const supabase = requireSupabase();
    const { error: insertError } = await supabase.from('documents').insert({
      entity_type: 'dog',
      entity_id: dogId,
      document_name: `Microchip certificate — ${dogName}`,
      original_filename: uploaded.path.split('/').pop() ?? 'microchip.jpg',
      storage_path: uploaded.path,
      file_type: fileTypeFromName(uploaded.path),
      category: 'microchip',
      client_visible: true,
      is_public: false,
      provided_by: 'staff',
      uploaded_by: uid,
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setPhotos([]);
    setOk('Microchip certificate uploaded — visible in the owner portal.');
    onSaved();
  }

  return (
    <View className="mb-4 rounded-xl border border-gold/20 bg-surface p-4">
      <Typography variant="label" className="text-gold">
        MICROCHIP CERTIFICATE
      </Typography>
      <Typography variant="caption" className="mt-1 text-subtle">
        The paper buyers ask for first.
      </Typography>
      <View className="mt-3">
        <PhotoPicker value={photos} onChange={setPhotos} max={1} />
      </View>
      {error ? <Typography variant="caption" className="mt-2">{error}</Typography> : null}
      {ok ? <Typography variant="caption" className="mt-2 text-gold">{ok}</Typography> : null}
      <Button
        label="Attach microchip certificate"
        size="sm"
        className="mt-3"
        loading={busy}
        disabled={photos.length === 0}
        onPress={() => void send()}
      />
    </View>
  );
}
