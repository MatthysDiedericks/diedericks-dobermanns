import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { COLLAR_COLOURS, CollarDot, type CollarColourId } from '@/lib/litters/collarColours';

interface CollarPickerProps {
  value: CollarColourId | null;
  onChange: (id: CollarColourId) => void;
  usedColours?: string[];
}

export function CollarPicker({ value, onChange, usedColours = [] }: CollarPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {COLLAR_COLOURS.map((c) => {
        const used = usedColours.includes(c.id) && value !== c.id;
        const active = value === c.id;
        return (
          <Pressable
            key={c.id}
            onPress={() => !used && onChange(c.id)}
            className={`mb-1 flex-row items-center gap-2 rounded-full border px-3 py-2 ${
              active ? 'border-gold bg-gold/15' : used ? 'border-danger/40 opacity-40' : 'border-gold/25'
            }`}
          >
            <CollarDot colour={c.id} size={12} />
            <Typography variant="caption">{c.label}</Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

interface CollarPickerFieldProps extends CollarPickerProps {
  duplicateWarning?: boolean;
}

export function CollarPickerField({ duplicateWarning, ...props }: CollarPickerFieldProps) {
  return (
    <View>
      <CollarPicker {...props} />
      {duplicateWarning ? (
        <Typography variant="caption" className="mt-2 text-danger">
          This collar colour is already used in this litter.
        </Typography>
      ) : null}
    </View>
  );
}

export function CollarPickerActions({
  onSave,
  saving,
}: {
  onSave: () => void;
  saving?: boolean;
}) {
  return <Button label="Save" onPress={onSave} loading={saving} />;
}
