import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { saveAppSettings, useSubmitting } from '@/hooks/useMutations';
import { openUrl, openWhatsApp } from '@/lib/social';
import type { AppSettings } from '@/types/app.types';

type Field = {
  key: keyof AppSettings;
  label: string;
  placeholder: string;
  isPhone?: boolean;
};

const FIELDS: Field[] = [
  { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '+27 82 000 0000', isPhone: true },
  { key: 'whatsapp_community_url', label: 'WhatsApp Community URL', placeholder: 'https://chat.whatsapp.com/...' },
  { key: 'telegram_channel_url', label: 'Telegram Channel URL', placeholder: 'https://t.me/...' },
  { key: 'facebook_page_url', label: 'Facebook Page URL', placeholder: 'https://facebook.com/...' },
  { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/...' },
  { key: 'youtube_url', label: 'YouTube URL', placeholder: 'https://youtube.com/@...' },
];

export default function SocialSettingsScreen() {
  const { settings } = useAppSettings();
  const { submitting, run } = useSubmitting();
  const [values, setValues] = useState<Partial<AppSettings>>(settings);
  const [saved, setSaved] = useState(false);

  function set(key: keyof AppSettings, value: string) {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function test(field: Field) {
    const v = (values[field.key] as string | null) ?? '';
    if (!v.trim()) return;
    if (field.isPhone) openWhatsApp(v);
    else openUrl(v);
  }

  async function save() {
    const { error } = await run(() => saveAppSettings(values));
    if (!error) setSaved(true);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Settings" title="Social & Contact Links" />
        <View className="px-6">
          <Typography variant="bodyMuted" className="mb-5">
            These links power the social bar on the home screen, the follow buttons, and the
            WhatsApp contact actions throughout the app.
          </Typography>

          {FIELDS.map((f) => (
            <View key={f.key} className="mb-4">
              <Input
                label={f.label}
                value={(values[f.key] as string | null) ?? ''}
                onChangeText={(t) => set(f.key, t)}
                placeholder={f.placeholder}
                autoCapitalize="none"
                keyboardType={f.isPhone ? 'phone-pad' : 'url'}
                containerClassName="mb-2"
              />
              <Pressable onPress={() => test(f)} className="flex-row items-center self-start">
                <Ionicons name="open-outline" size={14} color={Colors.gold} />
                <Typography variant="caption" className="ml-1 text-gold">
                  Test link
                </Typography>
              </Pressable>
            </View>
          ))}

          {saved ? (
            <Typography variant="caption" className="mb-3 text-success">
              Saved.
            </Typography>
          ) : null}

          <Button label="Save Settings" onPress={save} loading={submitting} fullWidth className="mt-2" />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
