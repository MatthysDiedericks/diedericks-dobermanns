import assert from 'node:assert/strict';

import { resolveSalePurchasePrice } from './salePrice';

/** Run: npx tsx lib/contracts/salePrice.test.ts */

const dogPrice = 50_000;

assert.equal(resolveSalePurchasePrice(dogPrice, { total: 3_000 }, { total_amount: 4_000 }), 4_000);
assert.equal(resolveSalePurchasePrice(dogPrice, { total: 3_000 }, null), 3_000);
assert.equal(resolveSalePurchasePrice(dogPrice, null, null), dogPrice);
assert.equal(
  resolveSalePurchasePrice(dogPrice, { total: null }, null),
  50_000,
  'quote with a null total falls through to dog.price, not to null',
);

console.log('salePrice.test.ts ok');
console.log('resolveSalePurchasePrice(50000, { total: null }, null) =', resolveSalePurchasePrice(50000, { total: null }, null));
