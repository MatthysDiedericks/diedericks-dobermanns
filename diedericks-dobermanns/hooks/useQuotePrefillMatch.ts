import { useEffect, useRef } from 'react';

import type { DraftLineItem } from '@/components/finance/LineItemRow';
import type { Dog, Litter } from '@/types/app.types';

interface Prefill {
  dogId?: string;
  litterId?: string;
}

/**
 * Pre-adds a waitlist entry's matched dog (or litter, if no specific puppy is
 * assigned yet) as a quote line item, reusing the same shape as the "Quick add a
 * dog" mechanism — runs once, as soon as the relevant list has loaded.
 */
export function useQuotePrefillMatch(
  prefill: Prefill | undefined,
  skip: boolean,
  dogs: Dog[],
  litters: Litter[],
  addDog: (id: string, name: string, price: number | null) => void,
  setItems: React.Dispatch<React.SetStateAction<DraftLineItem[]>>,
  nextKey: () => string,
) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current || skip) return;
    if (prefill?.dogId && dogs.length) {
      const dog = dogs.find((d) => d.id === prefill.dogId);
      if (dog) {
        done.current = true;
        addDog(dog.id, dog.name, dog.price);
      }
    } else if (prefill?.litterId && litters.length) {
      const litter = litters.find((l) => l.id === prefill.litterId);
      if (litter) {
        done.current = true;
        const label = litter.name ?? 'Litter';
        setItems((prev) => [
          ...prev,
          { key: nextKey(), item_type: 'dog', dog_id: null, description: `Puppy — ${label}`, quantity: 1, unit_price: 0 },
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dogs, litters, prefill?.dogId, prefill?.litterId, skip]);
}
