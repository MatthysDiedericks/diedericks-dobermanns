import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useContactInteractions } from '@/hooks/useContacts';
import { showSaved } from '@/lib/dogDetail/feedback';
import type { ContactInteraction } from '@/types/phase10';

export interface LogInteractionSheetHandle {
  open: (preset?: Partial<{
    interaction_type: ContactInteraction['interaction_type'];
    direction: ContactInteraction['direction'];
    body: string;
  }>) => void;
  close: () => void;
}

interface LogInteractionSheetProps {
  contactId: string;
  onSaved?: () => void;
}

const TYPES: { value: ContactInteraction['interaction_type']; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'call', label: 'Call', icon: 'call' },
  { value: 'meeting', label: 'Meeting', icon: 'people' },
  { value: 'note', label: 'Note', icon: 'document-text' },
  { value: 'sms', label: 'SMS', icon: 'chatbubble' },
];

export const LogInteractionSheet = forwardRef<LogInteractionSheetHandle, LogInteractionSheetProps>(
  function LogInteractionSheet({ contactId, onSaved }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['85%'], []);
    const { logInteraction } = useContactInteractions(contactId);

    const [type, setType] = useState<ContactInteraction['interaction_type']>('note');
    const [direction, setDirection] = useState<ContactInteraction['direction']>('outbound');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [saving, setSaving] = useState(false);

    const reset = useCallback(() => {
      setType('note');
      setDirection('outbound');
      setSubject('');
      setBody('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
    }, []);

    const close = useCallback(() => {
      sheetRef.current?.dismiss();
      reset();
    }, [reset]);

    useImperativeHandle(ref, () => ({
      open: (preset) => {
        reset();
        if (preset?.interaction_type) setType(preset.interaction_type);
        if (preset?.direction) setDirection(preset.direction);
        if (preset?.body) setBody(preset.body);
        sheetRef.current?.present();
      },
      close,
    }));

    const hideSubject = type === 'whatsapp' || type === 'call';

    const save = async () => {
      if (!body.trim()) return;
      setSaving(true);
      try {
        await logInteraction({
          interaction_type: type,
          direction,
          subject: hideSubject ? undefined : subject.trim() || undefined,
          body: body.trim(),
          interaction_date: `${date}T12:00:00.000Z`,
        });
        showSaved('Interaction logged');
        onSaved?.();
        close();
      } finally {
        setSaving(false);
      }
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        handleIndicatorStyle={{ backgroundColor: Colors.gold, width: 40 }}
        backgroundStyle={{ backgroundColor: Colors.nav }}
      >
        <View className="flex-row items-center justify-between px-6 pb-3 pt-4">
          <Typography variant="subtitle" className="text-gold">
            Log Interaction
          </Typography>
          <Pressable onPress={close} hitSlop={12} className="rounded-full bg-surface p-2">
            <Ionicons name="close" size={20} color={Colors.gold} />
          </Pressable>
        </View>

        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
          <Typography variant="caption" className="mb-2 text-silver">
            Type
          </Typography>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {TYPES.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => setType(t.value)}
                className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${type === t.value ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
              >
                <Ionicons name={t.icon} size={14} color={Colors.gold} />
                <Typography variant="caption">{t.label}</Typography>
              </Pressable>
            ))}
          </View>

          <Typography variant="caption" className="mb-2 text-silver">
            Direction
          </Typography>
          <View className="mb-4 flex-row gap-2">
            {(['outbound', 'inbound'] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => setDirection(d)}
                className={`rounded-full border px-4 py-2 ${direction === d ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
              >
                <Typography variant="caption">{d === 'outbound' ? 'Outbound (sent by us)' : 'Inbound (received)'}</Typography>
              </Pressable>
            ))}
          </View>

          {!hideSubject ? (
            <>
              <Typography variant="caption" className="mb-2 text-silver">
                Subject (optional)
              </Typography>
              <BottomSheetTextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Subject"
                placeholderTextColor={Colors.silver}
                className="mb-4 rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
              />
            </>
          ) : null}

          <Typography variant="caption" className="mb-2 text-silver">
            Notes *
          </Typography>
          <BottomSheetTextInput
            value={body}
            onChangeText={setBody}
            placeholder="What was discussed?"
            placeholderTextColor={Colors.silver}
            multiline
            numberOfLines={4}
            className="mb-4 min-h-[96px] rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
          />

          <DateField label="Date" value={date} onChange={setDate} />

          <Button label="Save interaction" onPress={() => void save()} loading={saving} disabled={!body.trim()} fullWidth />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
