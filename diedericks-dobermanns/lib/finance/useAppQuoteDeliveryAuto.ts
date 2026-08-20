import { useEffect, useMemo, useRef } from 'react';

import type { DraftLineItem } from '@/components/finance/LineItemRow';
import type { CatalogueItem, DeliveryDecision } from '@/lib/finance/catalogue';
import { EXPORT_PROMPT, computeDeliveryDefaults, syncDeliveryLine } from '@/lib/finance/quoteDelivery';
import { nextQuoteLineKey } from '@/lib/finance/appQuoteBuilderSeed';

export function useAppQuoteDeliveryAuto(
  items: DraftLineItem[],
  dogs: { id: string; programme_tier?: string | null }[],
  catalogue: CatalogueItem[],
  hadDecision: boolean,
  setDeliveryDecision: (d: DeliveryDecision | null) => void,
  setDeliveryReason: (r: string | null) => void,
  setExportPrompt: (p: string | null) => void,
  setItems: (fn: (prev: DraftLineItem[]) => DraftLineItem[]) => void,
) {
  const autoApplied = useRef(hadDecision);
  const dogTier = useMemo(
    () =>
      items
        .filter((it) => it.item_type === 'dog')
        .map((it) => it.programme_tier ?? (it.dog_id ? dogs.find((d) => d.id === it.dog_id)?.programme_tier : null)),
    [items, dogs],
  );

  useEffect(() => {
    if (!dogTier.some(Boolean)) return;
    const def = computeDeliveryDefaults(dogTier, null);
    setDeliveryReason(def.reason);
    if (def.suggestExport) setExportPrompt(EXPORT_PROMPT);
    if (autoApplied.current) return;
    if (def.decision) {
      setDeliveryDecision(def.decision);
      setItems((prev) => syncDeliveryLine(prev, def.decision, catalogue, nextQuoteLineKey));
    }
    autoApplied.current = true;
  }, [dogTier, catalogue, setDeliveryDecision, setDeliveryReason, setExportPrompt, setItems]);
}
