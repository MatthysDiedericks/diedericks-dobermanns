import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import {
  clampPedigreeDepth,
  defaultPedigreeDepth,
  pedigreeDepthOptions,
  PEDIGREE_DEPTH_STORAGE,
  type PedigreeSurface,
} from '@/lib/pedigree/generation';

export function usePedigreeDepth(maxGen: number, surface: PedigreeSurface) {
  const options = pedigreeDepthOptions(maxGen, surface);
  const fallback = defaultPedigreeDepth(maxGen, surface);
  const [depth, setDepthState] = useState(fallback);

  useEffect(() => {
    const key = PEDIGREE_DEPTH_STORAGE[surface];
    void AsyncStorage.getItem(key).then((raw) => {
      const stored = raw ? Number(raw) : NaN;
      setDepthState(
        Number.isFinite(stored) ? clampPedigreeDepth(stored, maxGen, surface) : fallback,
      );
    });
  }, [fallback, maxGen, surface]);

  function setDepth(next: number) {
    const clamped = clampPedigreeDepth(next, maxGen, surface);
    setDepthState(clamped);
    void AsyncStorage.setItem(PEDIGREE_DEPTH_STORAGE[surface], String(clamped));
  }

  return { depth, setDepth, options };
}
