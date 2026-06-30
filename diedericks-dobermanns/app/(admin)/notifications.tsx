import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Config } from '@/constants/config';
import { broadcastNotification } from '@/lib/notifications';

type Channel = 'push' | 'email' | 'whatsapp';
const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'push', label: 'Push' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export default function AdminNotificationsScreen() {
  const [channel, setChannel] = useState<Channel>('push');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSend() {
    setSending(true);
    setError(null);
    // Invokes the `notify` Edge Function which fans out to every client.
    const result = await broadcastNotification({ type: channel, subject, body });
    setSending(false);

    // In demo mode there is no backend, so treat dispatch as queued.
    if (result.error && !Config.isDemoMode) {
      setError(result.error);
      return;
    }
    setSent(true);
    setSubject('');
    setBody('');
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Broadcast" title="Send Notification" back={false} />
        <View className="px-6">
          <Typography variant="caption" className="mb-2 text-silver">
            Channel
          </Typography>
          <View className="mb-2 flex-row gap-2">
            {CHANNELS.map((c) => {
              const active = channel === c.value;
              return (
                <View key={c.value} className="flex-1">
                  <Button
                    label={c.label}
                    variant={active ? 'primary' : 'secondary'}
                    onPress={() => setChannel(c.value)}
                    fullWidth
                  />
                </View>
              );
            })}
          </View>

          <View className="mt-4">
            {channel !== 'whatsapp' ? (
              <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="Notification subject" />
            ) : null}
            <Input
              label="Message"
              value={body}
              onChangeText={setBody}
              placeholder="Write your message..."
              multiline
              numberOfLines={5}
              className="h-32"
            />
          </View>

          {sent ? (
            <Typography variant="body" className="mb-3 text-success">
              Notification queued for delivery.
            </Typography>
          ) : null}
          {error ? (
            <Typography variant="body" className="mb-3 text-danger">
              {error}
            </Typography>
          ) : null}

          <Button
            label="Send to All Clients"
            onPress={onSend}
            loading={sending}
            disabled={!body}
            fullWidth
          />

          {Config.isDemoMode ? (
            <Typography variant="caption" className="mt-6 text-center">
              Demo mode — delivery is simulated. Connect Supabase Edge Functions to send for real.
            </Typography>
          ) : null}
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
