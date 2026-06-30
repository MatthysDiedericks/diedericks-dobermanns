import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { TrainingVideoAddForm } from '@/components/Training/TrainingVideoAddForm';
import { updateVideoFields, useAllVideosAdmin } from '@/hooks/useTrainingVideos';

export function TrainingVideosTab() {
  const { videos, loading, refresh } = useAllVideosAdmin();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weekLabel, setWeekLabel] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (id: string) => {
    const v = videos.find((x) => x.id === id);
    if (!v) return;
    setEditingId(id);
    setTitle(v.title);
    setDescription(v.description ?? '');
    setWeekLabel(v.week_label ?? '');
    setVideoUrl(v.video_url ?? '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateVideoFields(editingId, {
        title: title.trim(),
        description: description.trim() || null,
        week_label: weekLabel.trim() || null,
        video_url: videoUrl.trim() || null,
      });
      setEditingId(null);
      await refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await updateVideoFields(id, { is_active: active });
      await refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update');
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
          <Input value={weekLabel} onChangeText={setWeekLabel} placeholder="Week label" className="mb-2" />
          <Input value={videoUrl} onChangeText={setVideoUrl} placeholder="Video URL" className="mb-3" />
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
                {v.access_tier} · {v.week_label ?? '—'}
              </Typography>
            </View>
            <Switch value={v.is_active} onValueChange={(val) => void toggleActive(v.id, val)} />
          </View>
          <Pressable onPress={() => startEdit(v.id)}>
            <Typography variant="caption" className="text-gold">
              Edit
            </Typography>
          </Pressable>
        </Card>
      ))}
    </ScrollView>
  );
}
