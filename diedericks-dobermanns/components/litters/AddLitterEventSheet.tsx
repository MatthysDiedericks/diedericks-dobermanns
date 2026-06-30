import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { AddLitterEventInput } from '@/hooks/useLitterCalendar';
import { LITTER_EVENT_TYPES } from '@/lib/litters/calendarHelpers';

export interface AddLitterEventSheetHandle {
  open: () => void;
  close: () => void;
}

interface AddLitterEventSheetProps {
  onSave: (input: AddLitterEventInput) => Promise<void>;
}

export const AddLitterEventSheet = forwardRef<AddLitterEventSheetHandle, AddLitterEventSheetProps>(
  function AddLitterEventSheet({ onSave }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['75%'], []);
    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<string>(LITTER_EVENT_TYPES[0].value);
    const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const reset = useCallback(() => {
      setTitle('');
      setEventType(LITTER_EVENT_TYPES[0].value);
      setEventDate(new Date().toISOString().slice(0, 10));
      setNotes('');
    }, []);

    const close = useCallback(() => {
      sheetRef.current?.dismiss();
      reset();
    }, [reset]);

    useImperativeHandle(ref, () => ({
      open: () => {
        reset();
        sheetRef.current?.present();
      },
      close,
    }));

    async function handleSave() {
      if (!title.trim()) return;
      setSaving(true);
      try {
        await onSave({
          title: title.trim(),
          event_type: eventType,
          event_date: eventDate,
          notes: notes.trim() || undefined,
        });
        close();
      } finally {
        setSaving(false);
      }
    }

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: Colors.surface }}
        handleIndicatorStyle={{ backgroundColor: Colors.gold }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Typography variant="subtitle" className="mb-4 text-gold">
            Add milestone
          </Typography>

          <Typography variant="caption" className="mb-1 text-silver">
            Title
          </Typography>
          <BottomSheetTextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. 6-week vet check"
            placeholderTextColor={Colors.silver}
            style={{
              borderWidth: 1,
              borderColor: Colors.goldMuted,
              borderRadius: 8,
              padding: 12,
              color: Colors.white,
              marginBottom: 16,
            }}
          />

          <Typography variant="caption" className="mb-2 text-silver">
            Type
          </Typography>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {LITTER_EVENT_TYPES.map((t) => {
              const active = eventType === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setEventType(t.value)}
                  className={`rounded-full border px-3 py-1.5 ${active ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
                >
                  <Typography variant="caption" className={active ? 'text-gold' : ''}>
                    {t.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>

          <DateField label="Date" value={eventDate} onChange={setEventDate} />

          <Typography variant="caption" className="mb-1 mt-4 text-silver">
            Notes (optional)
          </Typography>
          <BottomSheetTextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholderTextColor={Colors.silver}
            style={{
              borderWidth: 1,
              borderColor: Colors.goldMuted,
              borderRadius: 8,
              padding: 12,
              color: Colors.white,
              minHeight: 80,
              marginBottom: 20,
              textAlignVertical: 'top',
            }}
          />

          <Button label="Save Event" onPress={() => void handleSave()} loading={saving} fullWidth />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
