import assert from 'node:assert/strict';

import {
  defaultQuoteTypeFromLines,
  matchesRevenueTypeFilter,
  parseRevenueTypeFilter,
} from './quoteTypes';

/** Run: npx tsx lib/finance/quoteTypes.test.ts */

assert.equal(defaultQuoteTypeFromLines([]), 'dog_sale');
assert.equal(defaultQuoteTypeFromLines([{ item_type: 'dog' }]), 'dog_sale');
assert.equal(
  defaultQuoteTypeFromLines([{ item_type: 'dog' }, { item_type: 'board_train' }]),
  'dog_sale',
);
assert.equal(defaultQuoteTypeFromLines([{ item_type: 'board_train' }]), 'board_train');
assert.equal(defaultQuoteTypeFromLines([{ item_type: 'training' }]), 'training');
assert.equal(
  defaultQuoteTypeFromLines([{ item_type: 'board_train' }, { item_type: 'training' }]),
  'training',
);
assert.equal(
  defaultQuoteTypeFromLines([
    { item_type: 'board_train' },
    { item_type: 'board_train' },
    { item_type: 'other' },
  ]),
  'board_train',
);

assert.equal(parseRevenueTypeFilter(null), 'all');
assert.equal(parseRevenueTypeFilter('nope'), 'all');
assert.equal(matchesRevenueTypeFilter('training', 'all'), true);
assert.equal(matchesRevenueTypeFilter('training', 'dogs'), false);
assert.equal(matchesRevenueTypeFilter('board_train', 'training'), true);
assert.equal(matchesRevenueTypeFilter('stud_fee', 'other'), true);

console.log('quoteTypes.test.ts ok');
