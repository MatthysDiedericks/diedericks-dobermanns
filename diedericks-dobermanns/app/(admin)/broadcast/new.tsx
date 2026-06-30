import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { BroadcastConfirmStep, BroadcastSentReport } from '@/components/Broadcast/BroadcastPhases';
import { ChannelToggle } from '@/components/Broadcast/ChannelToggle';
import { GroupSelector } from '@/components/Broadcast/GroupSelector';
import { PreviewCard } from '@/components/Broadcast/PreviewCard';
import { MediaUploader, type UploaderValue } from '@/components/forms/MediaUploader';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useClientGroups } from '@/hooks/useAdmin';
import { sendBroadcast, useSubmitting, type BroadcastInput } from '@/hooks/useMutations';
import type { BroadcastChannel, ClientGroup } from '@/types/app.types';

const BODY_LIMIT = 500;

type Phase = 'compose' | 'confirm' | 'sent';

export default function BroadcastComposer() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { data: groups } = useClientGroups();
  const { settings } = useAppSettings();
  const { submitting, run } = useSubmitting();

  const [phase, setPhase] = useState<Phase>('compose');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(groupId || null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<UploaderValue[]>([]);
  const [channels, setChannels] = useState<BroadcastChannel[]>(['push']);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const group: ClientGroup | undefined = groups.find((g) => g.id === selectedGroup);
  const imageUrl = image[0]?.url ?? null;

  function toggleChannel(c: BroadcastChannel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function goConfirm() {
    setError(null);
    if (!selectedGroup) return setError('Select a group to send to.');
    if (!title.trim()) return setError('Add a title.');
    if (!body.trim()) return setError('Write a message.');
    if (channels.length === 0) return setError('Select at least one channel.');
    if (scheduleOn && !scheduleAt.trim()) return setError('Set a schedule date/time.');
    setPhase('confirm');
  }

  async function confirmSend() {
    const input: BroadcastInput = {
      group_id: selectedGroup,
      title: title.trim(),
      body: body.trim(),
      image_url: imageUrl,
      channels,
      scheduled_for: scheduleOn && scheduleAt.trim() ? scheduleAt.trim() : null,
    };
    const { error: err } = await run(() => sendBroadcast(input));
    if (err) {
      setError(err);
      return;
    }
    setPhase('sent');
  }

  if (phase === 'sent') {
    return (
      <BroadcastSentReport
        scheduleOn={scheduleOn}
        scheduleAt={scheduleAt}
        group={group}
        channels={channels}
        title={title}
        body={body}
        whatsappNumber={settings.whatsapp_number}
        telegramUrl={settings.telegram_channel_url}
        onDone={() => router.back()}
      />
    );
  }

  if (phase === 'confirm') {
    return (
      <BroadcastConfirmStep
        group={group}
        channels={channels}
        title={title}
        body={body}
        imageUrl={imageUrl}
        scheduleOn={scheduleOn}
        error={error}
        submitting={submitting}
        onBack={() => setPhase('compose')}
        onSend={confirmSend}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Broadcast" title="New Message" />
        <View className="px-6">
          <SectionHeader eyebrow="Step 1" title="Select Group" />
          <GroupSelector groups={groups} selectedGroup={selectedGroup} onSelect={setSelectedGroup} />

          <View className="mt-8">
            <SectionHeader eyebrow="Step 2" title="Write Message" />
            <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Litter update" />
            <Input
              label="Message"
              value={body}
              onChangeText={(t) => setBody(t.slice(0, BODY_LIMIT))}
              multiline
              className="h-32"
              placeholder="Share your news…"
            />
            <Typography variant="caption" className="text-silver">
              {body.length}/{BODY_LIMIT}
            </Typography>
          </View>

          <View className="mt-8">
            <SectionHeader eyebrow="Step 3 · optional" title="Attach Image" />
            <MediaUploader value={image} onChange={setImage} bucket="gallery" folder="broadcasts" kinds={['image']} max={1} />
          </View>

          <View className="mt-8">
            <SectionHeader eyebrow="Step 4" title="Channels" />
            <ChannelToggle channels={channels} onToggle={toggleChannel} />
          </View>

          <View className="mt-8">
            <SectionHeader eyebrow="Step 5" title="When" />
            <View className="flex-row gap-3">
              <Button
                label="Send Now"
                variant={scheduleOn ? 'secondary' : 'primary'}
                onPress={() => setScheduleOn(false)}
                className="flex-1"
              />
              <Button
                label="Schedule"
                variant={scheduleOn ? 'primary' : 'secondary'}
                onPress={() => setScheduleOn(true)}
                className="flex-1"
              />
            </View>
            {scheduleOn ? (
              <View className="mt-3">
                <Input
                  label="Send at (YYYY-MM-DD HH:mm)"
                  value={scheduleAt}
                  onChangeText={setScheduleAt}
                  placeholder="2026-07-01 09:00"
                  autoCapitalize="none"
                />
              </View>
            ) : null}
          </View>

          <View className="mt-8">
            <SectionHeader eyebrow="Preview" title="How it looks" />
            <PreviewCard title={title || 'Your title'} body={body || 'Your message…'} imageUrl={imageUrl} />
          </View>

          {error ? (
            <Typography variant="caption" className="mt-3 text-danger">{error}</Typography>
          ) : null}

          <Button label="Review & Send" onPress={goConfirm} fullWidth className="mt-6" />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
