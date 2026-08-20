import assert from 'node:assert/strict';

import {
  isHandTypedDeliveryDescription,
  stockDeliveryLineIdsToDrop,
  syncDeliveryLine,
  type DraftishCatalogueLine,
} from './quoteDelivery';

/** Run: npx tsx lib/finance/quoteDelivery.test.ts */

let n = 0;
const nextKey = () => `k${n++}`;

function dogLine(): DraftishCatalogueLine {
  return {
    key: nextKey(),
    item_type: 'dog',
    dog_id: null,
    litter_id: null,
    subject_kind: 'unallocated',
    description: 'Elite Developed Dobermann',
    quantity: 1,
    unit_price: 60000,
  };
}

function deliveryLine(patch: Partial<DraftishCatalogueLine> = {}): DraftishCatalogueLine {
  return {
    key: nextKey(),
    item_type: 'delivery',
    dog_id: null,
    litter_id: null,
    subject_kind: 'unallocated',
    description: 'Delivery / travel',
    quantity: 1,
    unit_price: 0,
    catalogue_code: 'delivery_travel',
    allowZeroPrice: false,
    ...patch,
  };
}

function main() {
  n = 0;
  const collected = syncDeliveryLine([dogLine(), deliveryLine()], 'collection', [], nextKey);
  assert.equal(collected.length, 1, 'collection removes the stock delivery line');
  assert.equal(collected[0]?.item_type, 'dog');

  n = 0;
  const na = syncDeliveryLine([dogLine(), deliveryLine()], 'not_applicable', [], nextKey);
  assert.equal(na.length, 1, 'not_applicable removes the stock delivery line');

  n = 0;
  const typed = syncDeliveryLine(
    [dogLine(), deliveryLine({ description: 'Meet halfway at Middelburg' })],
    'collection',
    [],
    nextKey,
  );
  assert.equal(typed.length, 2, 'hand-typed description is kept');
  assert.equal(typed[1]?.allowZeroPrice, true);

  assert.equal(isHandTypedDeliveryDescription('Delivery / travel'), false);
  assert.equal(isHandTypedDeliveryDescription('Meet halfway at Middelburg'), true);

  assert.deepEqual(
    stockDeliveryLineIdsToDrop('not_applicable', [
      { id: 'drop', description: 'Delivery / travel', item_type: 'delivery' },
      { id: 'typed', description: 'Buyer collects Friday', item_type: 'delivery' },
    ]),
    ['drop'],
  );

  console.log('quoteDelivery.test.ts: ok');
}

main();
