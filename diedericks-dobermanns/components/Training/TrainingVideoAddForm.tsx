import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import {
  createVideo,
  useVideoBundles,
  useVideoCategories,
  type CreateVideoInput,
} from '@/hooks/useTrainingVideos';

const ACCESS_TIERS = ['free', 'bundle', 'admin'] as const;

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export function TrainingVideoAddForm({ onCreated, onCancel }: Props) {
  const { categories } = useVideoCategories();
  const { bundles } = useVideoBundles();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [weekLabel, setWeekLabel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accessTier, setAccessTier] = useState<CreateVideoInput['access_tier']>('free');
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !categoryId) {
      Alert.alert('Missing fields', 'Title and category are required.');
      return;
    }
    if (accessTier === 'bundle' && !bundleId) {
      Alert.alert('Missing bundle', 'Select a bundle for bundle-tier videos.');
      return;
    }
    setSaving(true);
    try {
      await createVideo({
        category_id: categoryId,
        title,
        description: description || null,
        access_tier: accessTier,
        bundle_id: accessTier === 'bundle' ? bundleId : null,
        video_url: videoUrl || null,
        week_label: weekLabel || null,
      });
      onCreated();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create video');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4">
      <Typography variant="label" className="mb-3 text-gold">
        Add video
      </Typography>
      <Input value={title} onChangeText={setTitle} placeholder="Title *" className="mb-2" />
      <Input
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        multiline
        className="mb-2 min-h-[60px]"
      />
      <Input value={videoUrl} onChangeText={setVideoUrl} placeholder="Video URL (optional)" className="mb-2" />
      <Input value={weekLabel} onChangeText={setWeekLabel} placeholder="Week label (curriculum)" className="mb-3" />

      <Typography variant="caption" className="mb-1 text-silver">
        Category *
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCategoryId(c.id)}
            className={`rounded-lg border px-3 py-2 ${categoryId === c.id ? 'border-gold bg-gold/10' : 'border-surface-border'}`}
          >
            <Typography variant="caption">{c.name}</Typography>
          </Pressable>
        ))}
      </View>

      <Typography variant="caption" className="mb-1 text-silver">
        Access tier
      </Typography>
      <View className="mb-3 flex-row gap-2">
        {ACCESS_TIERS.map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              setAccessTier(t);
              if (t !== 'bundle') setBundleId(null);
            }}
            className={`rounded-lg border px-3 py-2 ${accessTier === t ? 'border-gold bg-gold/10' : 'border-surface-border'}`}
          >
            <Typography variant="caption">{t}</Typography>
          </Pressable>
        ))}
      </View>

      {accessTier === 'bundle' ? (
        <>
          <Typography variant="caption" className="mb-1 text-silver">
            Bundle *
          </Typography>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {bundles.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => setBundleId(b.id)}
                className={`rounded-lg border px-3 py-2 ${bundleId === b.id ? 'border-gold bg-gold/10' : 'border-surface-border'}`}
              >
                <Typography variant="caption">{b.name}</Typography>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <View className="flex-row gap-2">
        <Button label="Create" size="sm" loading={saving} onPress={() => void save()} className="flex-1" />
        <Button label="Cancel" size="sm" variant="outline" onPress={onCancel} className="flex-1" />
      </View>
    </Card>
  );
}
