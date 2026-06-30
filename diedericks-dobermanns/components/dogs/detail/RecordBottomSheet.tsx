import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';

export interface FormField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  keyboard?: 'default' | 'numeric';
}

export interface RecordSheetRef {
  open: () => void;
  close: () => void;
}

interface RecordBottomSheetProps {
  title: string;
  fields: FormField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  saving?: boolean;
}

export const RecordBottomSheet = forwardRef<RecordSheetRef, RecordBottomSheetProps>(
  function RecordBottomSheet(
    { title, fields, values, onChange, onSave, saving = false },
    ref,
  ) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['65%'], []);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.present(),
      close: () => sheetRef.current?.dismiss(),
    }));

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: '#1C1A0E' }}
        handleIndicatorStyle={{ backgroundColor: '#C4A35A' }}
      >
        <BottomSheetScrollView className="px-5 pb-8">
          <Typography variant="subtitle" className="mb-4 text-gold">
            {title}
          </Typography>
          {fields.map((f) => (
            <View key={f.key} className="mb-3">
              <Typography variant="caption" className="mb-1 text-muted">
                {f.label}
                {f.required ? ' *' : ''}
              </Typography>
              <BottomSheetTextInput
                value={values[f.key] ?? ''}
                onChangeText={(v) => onChange(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor="#8C8474"
                multiline={f.multiline}
                keyboardType={f.keyboard === 'numeric' ? 'decimal-pad' : 'default'}
                className="rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
                style={f.multiline ? { minHeight: 80, textAlignVertical: 'top' } : undefined}
              />
            </View>
          ))}
          <Button
            label="Save"
            variant="solid"
            onPress={onSave}
            loading={saving}
            fullWidth
            className="mt-2"
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
