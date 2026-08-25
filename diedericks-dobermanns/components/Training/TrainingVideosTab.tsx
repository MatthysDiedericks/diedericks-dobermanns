import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { TrainingVideoAddForm } from '@/components/Training/TrainingVideoAddForm';
import { TrainingVideoPhoneUpload } from '@/components/Training/TrainingVideoPhoneUpload';
import { TrainingVideoTierChips } from '@/components/Training/TrainingVideoTierChips';
import { logTierChange, updateVideoFields, useAllVideosAdmin, useVideoCategories } from '@/hooks/useTrainingVideos';
import { ACCESS_TIERS, TIER_LABEL, normalizeTier, videoHasFile, type AccessTier } from '@/lib/training/access';
import { requireSupabase } from '@/lib/supabase';

export function TrainingVideosTab() {
  const { videos, loading, refresh } = useAllVideosAdmin();
  const { categories } = useVideoCategories();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weekLabel, setWeekLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [ownerViewers, setOwnerViewers] = useState(0);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkTier, setBulkTier] = useState<AccessTier>('owner');

  useEffect(() => {
    void requireSupabase()
      .rpc('training_owner_client_count')
      .then(({ data }) => setOwnerViewers(Number(data ?? 0)));
  }, []);

  const counts = useMemo(() => {
    const base: Record<AccessTier, { videos: number; viewers: number }> = {
      public: { videos: 0, viewers: 0 },
      owner: { videos: 0, viewers: ownerViewers },
      paid: { videos: 0, viewers: 0 },
    };
    for (const v of videos) base[normalizeTier(v.access_tier)].videos += 1;
    return base;
  }, [videos, ownerViewers]);

  const startEdit = (id: string) => {
    const v = videos.find((x) => x.id === id);
    if (!v) return;
    setEditingId(id);
    setTitle(v.title);
    setDescription(v.description ?? '');
    setWeekLabel(v.week_label ?? '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateVideoFields(editingId, {
        title: title.trim(),
        description: description.trim() || null,
        week_label: weekLabel.trim() || null,
      });
      setEditingId(null);
      await refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const bulkApply = async (confirmRevoke: boolean) => {
    const categoryId = bulkCategoryId || categories[0]?.id;
    if (!categoryId) return;
    const inCat = videos.filter((v) => v.category_id === categoryId);
    const revoke = inCat.filter((v) => normalizeTier(v.access_tier) === 'owner' && bulkTier === 'paid');
    if (revoke.length && !confirmRevoke) {
      Alert.alert(
        'Revoke puppy access?',
        `${revoke.length} videos will lock for buyers immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Revoke', style: 'destructive', onPress: () => void bulkApply(true) },
        ],
      );
      return;
    }
    try {
      for (const v of inCat) {
        await updateVideoFields(v.id, { access_tier: bulkTier });
      }
      await logTierChange(
        inCat.map((v) => v.id),
        'mixed',
        bulkTier,
        categoryId,
      );
      await refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Bulk update failed');
    }
  };

  if (loading) {
    return (
      <View className="px-6 py-8">
        <Typography variant="body">Loading videos…</Typography>
      </View>
    );
  }

  return (
    <ScrollView className="px-6 pb-12">
      <Card className="mb-4">
        <Typography variant="label" className="mb-2 text-gold">
          Bulk-set a category
        </Typography>
        <View className="mb-2 flex-row flex-wrap gap-2">
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setBulkCategoryId(c.id)}
              className={`min-h-[44px] rounded-lg border px-3 py-2 ${
                (bulkCategoryId || categories[0]?.id) === c.id ? 'border-gold bg-gold/10' : 'border-surface-border'
              }`}
            >
              <Typography variant="caption">{c.name}</Typography>
            </Pressable>
          ))}
        </View>
        <View className="mb-2 flex-row flex-wrap gap-2">
          {ACCESS_TIERS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setBulkTier(t)}
              className={`min-h-[44px] rounded-lg border px-3 py-2 ${
                bulkTier === t ? 'border-gold bg-gold/10' : 'border-surface-border'
              }`}
            >
              <Typography variant="caption">{TIER_LABEL[t]}</Typography>
            </Pressable>
          ))}
        </View>
        <Button label="Apply to category" size="sm" onPress={() => void bulkApply(false)} />
      </Card>
      {!editingId && !showAdd ? (
        <Button label="+ Add video" size="sm" onPress={() => setShowAdd(true)} className="mb-4" />
      ) : null}
      {showAdd ? (
        <TrainingVideoAddForm
          onCreated={() => {
            setShowAdd(false);
            void refresh();
          }}
          onCancel={() => setShowAdd(false)}
        />
      ) : null}
      {editingId ? (
        <Card className="mb-4">
          <Typography variant="label" className="mb-3 text-gold">
            Edit video
          </Typography>
          <Input value={title} onChangeText={setTitle} placeholder="Title" className="mb-2" />
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            multiline
            className="mb-2 min-h-[60px]"
          />
          <Input value={weekLabel} onChangeText={setWeekLabel} placeholder="Week label" className="mb-3" />
          <View className="flex-row gap-2">
            <Button label="Save" size="sm" loading={saving} onPress={() => void saveEdit()} className="flex-1" />
            <Button label="Cancel" size="sm" variant="outline" onPress={() => setEditingId(null)} className="flex-1" />
          </View>
        </Card>
      ) : null}
      {videos.map((v) => (
        <Card key={v.id} className="mb-3">
          <View className="mb-2 flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Typography variant="body">{v.title}</Typography>
              <Typography variant="caption" className="text-silver">
                {videoHasFile(v.video_url) ? v.week_label ?? '—' : 'Awaiting footage'}
              </Typography>
            </View>
            <Switch
              value={v.is_active}
              onValueChange={(val) => {
                void updateVideoFields(v.id, { is_active: val }).then(() => refresh());
              }}
            />
          </View>
          <TrainingVideoTierChips
            videoId={v.id}
            accessTier={v.access_tier}
            bundleId={v.bundle_id}
            counts={counts}
          />
          <TrainingVideoPhoneUpload videoId={v.id} onDone={() => void refresh()} />
          <Pressable onPress={() => startEdit(v.id)} className="mt-2 min-h-[44px] justify-center">
            <Typography variant="caption" className="text-gold">
              Edit
            </Typography>
          </Pressable>
        </Card>
      ))}
    </ScrollView>
  );
}
