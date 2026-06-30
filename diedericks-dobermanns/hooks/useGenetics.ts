import { useMemo, useState } from 'react';

import { calculateOffspringColours } from '@/lib/genetics/dobermann-colours';
import { vwdCross } from '@/lib/genetics/punnett';

export function useGeneticsCalculator() {
  const [b1, setB1] = useState('Bb');
  const [b2, setB2] = useState('Bb');
  const [d1, setD1] = useState('Dd');
  const [d2, setD2] = useState('Dd');
  const [vwd1, setVwd1] = useState<'clear' | 'carrier' | 'affected'>('clear');
  const [vwd2, setVwd2] = useState<'clear' | 'carrier' | 'affected'>('carrier');

  const colours = useMemo(
    () => calculateOffspringColours(b1, b2, d1, d2),
    [b1, b2, d1, d2],
  );

  const vwd = useMemo(() => vwdCross(vwd1, vwd2), [vwd1, vwd2]);

  return {
    b1,
    b2,
    d1,
    d2,
    vwd1,
    vwd2,
    setB1,
    setB2,
    setD1,
    setD2,
    setVwd1,
    setVwd2,
    colours,
    vwd,
  };
}
