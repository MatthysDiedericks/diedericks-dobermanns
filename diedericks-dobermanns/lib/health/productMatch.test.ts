import assert from 'node:assert/strict';

import { suggestProductSpelling } from './productMatch';

/** Run: npx tsx lib/health/productMatch.test.ts */

const PRODUCTS = [
  'Quantel',
  'Bravecto',
  'Milpro',
  'NexGard',
  'Mediworm',
  'Univerm Total',
  'Nutribyte',
  'Antizol',
];

function main() {
  assert.equal(suggestProductSpelling('Quantil', PRODUCTS), 'Quantel');
  assert.equal(suggestProductSpelling('Quantell', PRODUCTS), 'Quantel');
  assert.equal(suggestProductSpelling('quantel', PRODUCTS), null);
  assert.equal(suggestProductSpelling('Quantel', PRODUCTS), null);
  assert.equal(suggestProductSpelling('Qua', PRODUCTS), null);
  assert.equal(suggestProductSpelling('BrandNewWormer', PRODUCTS), null);
  console.log('productMatch.test.ts: ok');
}

main();
