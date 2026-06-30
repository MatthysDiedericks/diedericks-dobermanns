import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}

function toDate(value: string): Date {
  if (!value) return new Date();
  try {
    return parseISO(value);
  } catch {
    return new Date();
  }
}

export function DateField({ label, value, onChange, optional }: DateFieldProps) {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(toDate(value));

  if (Platform.OS === 'web') {
    return (
      <View className="mb-4">
        <Typography variant="label" className="mb-2">
          {label}
          {optional ? ' (optional)' : ''}
        </Typography>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: Colors.nav,
            color: Colors.white,
            border: '1px solid rgba(196,163,90,0.4)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 14,
            width: '100%',
          }}
        />
      </View>
    );
  }

  const display = value ? formatKennelDate(value) : optional ? 'Not set' : 'Select date';

  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2">
        {label}
        {optional ? ' (optional)' : ''}
      </Typography>
      <Pressable
        onPress={() => {
          setDraft(toDate(value));
          setShow(true);
        }}
        className="rounded-xl border border-gold/40 bg-surface px-4 py-3"
      >
        <Typography variant="body" className={value ? '' : 'text-subtle'}>
          {display}
        </Typography>
      </Pressable>

      <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setShow(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="rounded-t-2xl bg-surface p-4">
            <View className="mb-3 flex-row justify-end gap-3">
              <Pressable onPress={() => setShow(false)}>
                <Typography variant="caption" className="text-subtle">
                  Cancel
                </Typography>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChange(format(draft, 'yyyy-MM-dd'));
                  setShow(false);
                }}
              >
                <Typography variant="label" className="text-gold">
                  Done
                </Typography>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              onChange={(_event, selected) => {
                if (selected) setDraft(selected);
              }}
              textColor={Colors.white}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
