import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Config } from '@/constants/config';
import { callNotify } from '@/lib/functions';
import { broadcastNotification } from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';

type Channel = 'push' | 'email' | 'whatsapp';
const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'push', label: 'Push' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export default function AdminNotificationsScreen() {
  const currentUserId = useAuthStore((s) => s.profile?.id);
  const [channel, setChannel] = useState<Channel>('push');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function sendTest() {
    if (!currentUserId) {
      setTestError('No signed-in user found.');
      return;
    }
    setTesting(true);
    setTestError(null);
    try {
      const ok = await callNotify({
        userId: currentUserId,
        title: 'Test Notification',
        body: 'Edge Functions are working correctly.',
      });
      if (!ok) {
        setTestError('Failed — check Edge Function deployment');
        return;
      }
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch {
      setTestError('Failed — check Edge Function deployment');
    } finally {
      setTesting(false);
    }
  }

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

        <View className="mb-6 px-6">
          <Card className="border-gold/20">
            <Typography variant="label" className="mb-2 text-gold">
              Edge Function test
            </Typography>
            <Typography variant="caption" className="mb-3 text-silver">
              Sends a push notification to your own account to verify deployment.
            </Typography>
            {testSent ? (
              <Typography variant="body" className="mb-3 text-success">
                Test notification sent.
              </Typography>
            ) : null}
            {testError ? (
              <Typography variant="body" className="mb-3 text-danger">
                {testError}
              </Typography>
            ) : null}
            <Button
              label="Send Test Notification"
              variant="outline"
              onPress={sendTest}
              loading={testing}
              disabled={!currentUserId}
              fullWidth
            />
          </Card>
        </View>

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
