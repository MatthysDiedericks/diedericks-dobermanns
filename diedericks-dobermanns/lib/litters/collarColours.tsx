import { View } from 'react-native';

export const COLLAR_COLOURS = [
  { id: 'red', label: 'Red', hex: '#ef4444' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'green', label: 'Green', hex: '#22c55e' },
  { id: 'yellow', label: 'Yellow', hex: '#eab308' },
  { id: 'pink', label: 'Pink', hex: '#ec4899' },
  { id: 'orange', label: 'Orange', hex: '#f97316' },
  { id: 'purple', label: 'Purple', hex: '#a855f7' },
  { id: 'white', label: 'White', hex: '#f8fafc' },
  { id: 'black', label: 'Black', hex: '#374151' },
  { id: 'none', label: 'No collar', hex: '#6b7280' },
] as const;

export type CollarColourId = (typeof COLLAR_COLOURS)[number]['id'];

export function collarHex(id: string | null | undefined): string {
  return COLLAR_COLOURS.find((c) => c.id === id)?.hex ?? '#6b7280';
}

export function collarLabel(id: string | null | undefined): string {
  return COLLAR_COLOURS.find((c) => c.id === id)?.label ?? '—';
}

interface CollarDotProps {
  colour: string | null | undefined;
  size?: number;
}

export function CollarDot({ colour, size = 10 }: CollarDotProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: collarHex(colour),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
      }}
    />
  );
}
