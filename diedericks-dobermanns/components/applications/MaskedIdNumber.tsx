import { useState } from 'react';
import { Pressable } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { maskIdNumber } from '@/lib/identity/idNumber';

export function MaskedIdNumber({ value }: { value: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!value) return <Typography variant="body">—</Typography>;
  return (
    <Pressable onPress={() => setOpen((v) => !v)}>
      <Typography variant="body">{open ? value : maskIdNumber(value)}</Typography>
      <Typography variant="caption" className="mt-1 text-gold">
        {open ? 'Hide' : 'Reveal'}
      </Typography>
    </Pressable>
  );
}
