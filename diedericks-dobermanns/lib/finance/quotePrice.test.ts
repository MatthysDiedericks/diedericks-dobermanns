import assert from 'node:assert/strict';

import { resolveQuotePrice, type QuotePriceTier } from './quotePrice';

/** Run: npx tsx lib/finance/quotePrice.test.ts */

const tiers: QuotePriceTier[] = [
  { tier_key: 'elite_developed', display_label: 'Elite developed', price: 250000 },
];

const fromLitter = resolveQuotePrice({ litterDefaultTier: 'elite_developed' }, tiers);
assert.equal(fromLitter.unitPrice, null);
assert.equal(fromLitter.sourceLabel, 'Set a price');

console.log('quotePrice.test.ts ok');
