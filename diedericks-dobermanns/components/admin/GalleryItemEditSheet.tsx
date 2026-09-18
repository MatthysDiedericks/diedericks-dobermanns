import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { updateGalleryItem } from '@/hooks/useMutations';
import type { GalleryItem } from '@/types/app.types';

const CATEGORIES = [
  { value: 'puppies', label: 'Puppies' },
  { value: 'elite_pups', label: 'Elite Pups' },
  { value: 'protection_dogs', label: 'Elite Family Protection Dogs' },
  { value: 'planned_litters', label: 'Planned Litters' },
  { value: 'litter_announcements', label: 'Litter Announcement (poster)' },
  { value: 'competition', label: 'Competition' },
  { value: 'training', label: 'Training' },
  { value: 'kennel', label: 'Kennel' },
  { value: 'family', label: 'Family' },
];

const DISCIPLINES = [
  { value: 'protection', label: 'Protection' },
  { value: 'obedience', label: 'Obedience' },
];

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

export function GalleryItemEditSheet({
  item,
  onClose,
  onSaved,
}: {
  item: GalleryItem;
  onClose: () => void;
  onSaved: (next: GalleryItem) => void;
}) {
  const isVideo = Boolean(item.video_url) && !item.image_url;
  const [title, setTitle] = useState(item.title ?? '');
  const [description, setDescription] = useState(item.description ?? '');
  const [category, setCategory] = useState<string>(item.category ?? 'puppies');
  const [discipline, setDiscipline] = useState(item.discipline ?? 'protection');
  const [photoTakenAt, setPhotoTakenAt] = useState(toDateInput(item.photo_taken_at));
  const [featured, setFeatured] = useState(item.is_featured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const fields = {
      title: title.trim() || null,
      description: description.trim() || null,
      category,
      discipline: isVideo ? discipline : null,
      photo_taken_at: photoTakenAt || null,
      is_featured: featured,
    };
    const { error: err } = await updateGalleryItem(item.id, fields);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onSaved({ ...item, ...fields, category: category as GalleryItem['category'] });
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-black-rich" contentContainerClassName="px-6 pb-10 pt-14">
        <Typography variant="subtitle" className="mb-4 text-gold">
          Edit media
        </Typography>
        <Input label="Title" value={title} onChangeText={setTitle} />
        <Input
          label="Caption a client reads under this photo on the public gallery"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          className="min-h-[96px]"
        />
        <Input
          label="Date taken"
          value={photoTakenAt}
          onChangeText={setPhotoTakenAt}
          placeholder="YYYY-MM-DD"
        />
        <Typography variant="caption" className="mb-2 text-silver">
          Category
        </Typography>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              className={`rounded-full border px-3 py-1.5 ${
                category === c.value ? 'border-gold bg-gold/15' : 'border-gold/20'
              }`}
            >
              <Typography variant="caption" className={category === c.value ? 'text-gold' : 'text-silver'}>
                {c.label}
              </Typography>
            </Pressable>
          ))}
        </View>
        {isVideo ? (
          <View className="mb-4 flex-row flex-wrap gap-2">
            {DISCIPLINES.map((d) => (
              <Pressable
                key={d.value}
                onPress={() => setDiscipline(d.value)}
                className={`rounded-full border px-3 py-1.5 ${
                  discipline === d.value ? 'border-gold bg-gold/15' : 'border-gold/20'
                }`}
              >
                <Typography variant="caption" className={discipline === d.value ? 'text-gold' : 'text-silver'}>
                  {d.label}
                </Typography>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View className="mb-6 flex-row items-center justify-between">
          <Typography variant="body">Featured</Typography>
          <Switch
            value={featured}
            onValueChange={setFeatured}
            trackColor={{ false: Colors.border, true: Colors.gold }}
          />
        </View>
        {error ? (
          <Typography variant="caption" className="mb-3 text-danger">
            {error}
          </Typography>
        ) : null}
        <Button label={busy ? 'Saving…' : 'Save'} onPress={() => void save()} loading={busy} fullWidth />
        <Pressable onPress={onClose} className="mt-4 items-center py-3">
          <Typography variant="label">Cancel</Typography>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}
