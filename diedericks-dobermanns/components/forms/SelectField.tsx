import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface DropdownProps {
  label?: string;
  value: string;
  placeholder?: string;
  options: readonly string[];
  onChange: (value: string) => void;
  error?: string;
}

/** Dark, branded modal picker — the app's dropdown, since no native picker library is installed. */
function Dropdown({ label, value, placeholder, options, onChange, error }: DropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className="mb-4">
      {label ? (
        <Typography variant="caption" className="mb-2 text-silver uppercase tracking-widest">
          {label}
        </Typography>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between rounded-xl border bg-surface px-4 py-3 ${
          error ? 'border-danger' : 'border-gold/20'
        }`}
      >
        <Typography variant="body" className={value ? 'text-ink' : 'text-silver'}>
          {value || placeholder || 'Select…'}
        </Typography>
        <Ionicons name="chevron-down" size={18} color={Colors.silver} />
      </Pressable>
      {error ? (
        <Typography variant="caption" className="mt-1 text-danger">
          {error}
        </Typography>
      ) : null}

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/70 px-6"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="max-h-[70%] w-full rounded-2xl border border-gold/20 bg-black-rich"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="border-b border-gold/10 px-5 py-4">
              <Typography variant="subtitle">{label || 'Select an option'}</Typography>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const active = item === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    className={`flex-row items-center justify-between px-5 py-3.5 ${
                      active ? 'bg-gold/10' : ''
                    }`}
                  >
                    <Typography variant="body" className={active ? 'text-gold' : 'text-ink'}>
                      {item}
                    </Typography>
                    {active ? <Ionicons name="checkmark" size={18} color={Colors.gold} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

interface SelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  options: readonly string[];
}

/** Form-bound dropdown select — the picker equivalent of ControlledInput. */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
}: SelectFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <Dropdown
          label={label}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          options={options}
          onChange={onChange}
          error={error?.message}
        />
      )}
    />
  );
}
