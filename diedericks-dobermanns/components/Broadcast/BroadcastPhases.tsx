import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { BROADCAST_CHANNELS } from '@/components/Broadcast/ChannelToggle';
import { PreviewCard } from '@/components/Broadcast/PreviewCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { openUrl, openWhatsApp } from '@/lib/social';
import type { BroadcastChannel, ClientGroup } from '@/types/app.types';

export function BroadcastSentReport({
  scheduleOn,
  scheduleAt,
  group,
  channels,
  title,
  body,
  whatsappNumber,
  telegramUrl,
  onDone,
}: {
  scheduleOn: boolean;
  scheduleAt: string;
  group?: ClientGroup;
  channels: BroadcastChannel[];
  title: string;
  body: string;
  whatsappNumber: string | null;
  telegramUrl: string | null;
  onDone: () => void;
}) {
  const greeting = `${title}\n\n${body}`;
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Broadcast" title={scheduleOn ? 'Scheduled' : 'Delivery Report'} />
      <View className="px-6">
        <Card>
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Typography variant="subtitle" className="ml-3 flex-1">
              {scheduleOn ? `Scheduled for ${scheduleAt}` : 'Message processed'}
            </Typography>
          </View>
          <Typography variant="caption" className="mt-2">
            {group?.name} · {group?.member_count ?? '—'} recipients
          </Typography>
        </Card>

        <View className="mt-4 gap-3">
          {channels.includes('push') ? (
            <Card className="flex-row items-center">
              <Ionicons name="notifications" size={18} color={Colors.gold} />
              <Typography variant="body" className="ml-3 flex-1">Push Notification</Typography>
              <Badge label={scheduleOn ? 'Scheduled' : 'Sent'} tone="success" />
            </Card>
          ) : null}
          {channels.includes('whatsapp') ? (
            <Card>
              <View className="flex-row items-center">
                <Ionicons name="logo-whatsapp" size={18} color={Colors.gold} />
                <Typography variant="body" className="ml-3 flex-1">WhatsApp</Typography>
                <Badge label="Manual" tone="gold" />
              </View>
              <Button
                label="Open WhatsApp with message"
                variant="outline"
                fullWidth
                className="mt-3"
                onPress={() => openWhatsApp(whatsappNumber, greeting)}
              />
            </Card>
          ) : null}
          {channels.includes('telegram') ? (
            <Card>
              <View className="flex-row items-center">
                <Ionicons name="paper-plane" size={18} color={Colors.gold} />
                <Typography variant="body" className="ml-3 flex-1">Telegram</Typography>
                <Badge label="Manual" tone="gold" />
              </View>
              <Button
                label="Open Telegram channel"
                variant="outline"
                fullWidth
                className="mt-3"
                onPress={() => openUrl(telegramUrl)}
              />
            </Card>
          ) : null}
        </View>

        <Button label="Done" onPress={onDone} fullWidth className="mt-8" />
      </View>
    </ScreenContainer>
  );
}

export function BroadcastConfirmStep({
  group,
  channels,
  title,
  body,
  imageUrl,
  scheduleOn,
  error,
  submitting,
  onBack,
  onSend,
}: {
  group?: ClientGroup;
  channels: BroadcastChannel[];
  title: string;
  body: string;
  imageUrl: string | null;
  scheduleOn: boolean;
  error: string | null;
  submitting: boolean;
  onBack: () => void;
  onSend: () => void;
}) {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Step 5" title="Confirm & Send" />
      <View className="px-6">
        <Card>
          <Typography variant="caption">Sending to</Typography>
          <Typography variant="subtitle" className="mt-1">{group?.name}</Typography>
          <Typography variant="caption" className="mt-1">
            {group?.member_count ?? '—'} recipients · {channels.length} channel{channels.length === 1 ? '' : 's'}
          </Typography>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {channels.map((c) => (
              <Badge key={c} label={BROADCAST_CHANNELS.find((x) => x.key === c)?.label ?? c} tone="neutral" />
            ))}
          </View>
        </Card>

        <SectionHeader eyebrow="Preview" title="Message" />
        <PreviewCard title={title} body={body} imageUrl={imageUrl} />

        {error ? (
          <Typography variant="caption" className="mt-3 text-danger">{error}</Typography>
        ) : null}

        <View className="mt-6 flex-row gap-3">
          <Button label="Back" variant="secondary" onPress={onBack} className="flex-1" />
          <Button
            label={scheduleOn ? 'Schedule' : 'Send Now'}
            onPress={onSend}
            loading={submitting}
            className="flex-1"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
