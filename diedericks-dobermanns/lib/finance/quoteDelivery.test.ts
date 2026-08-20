import assert from 'node:assert/strict';

import {
  isHandTypedDeliveryDescription,
  stockDeliveryLineIdsToDrop,
  syncDeliveryLine,
  type DraftishCatalogueLine,
} from './quoteDelivery';
import { assertDeliveryReadyToSend, DELIVERY_TBC_DESCRIPTION, CHARGED_DELIVERY_NO_AMOUNT_MESSAGE, defaultDeliveryDecision } from './catalogue';
import { prepareQuoteLinesForSave } from './prepareQuoteLines';
import { outstandingForSavedQuote } from './quoteOutstanding';

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

  const tbc = syncDeliveryLine([dogLine()], 'to_be_confirmed', [], nextKey);
  const tbcLine = tbc.find((it) => it.item_type === 'delivery');
  assert.equal(tbcLine?.description, DELIVERY_TBC_DESCRIPTION);
  assert.equal(
    assertDeliveryReadyToSend({ deliveryDecision: 'to_be_confirmed', deliveryLineAmount: 0 }),
    null,
  );
  const chargedBlock = assertDeliveryReadyToSend({
    deliveryDecision: 'charged',
    deliveryLineAmount: 0,
  });
  assert.equal(chargedBlock, CHARGED_DELIVERY_NO_AMOUNT_MESSAGE);

  const deliverySave = prepareQuoteLinesForSave([
    {
      description: 'Delivery / travel',
      quantity: 1,
      unit_price: 0,
      item_type: 'delivery',
    },
  ]);
  assert.equal(deliverySave.ok, false);
  if (!deliverySave.ok) {
    assert.match(deliverySave.error, /delivery line/i);
    assert.doesNotMatch(deliverySave.error, /Description and amount are required/);
  }

  const tbcOutstanding = outstandingForSavedQuote({
    items: [
      { id: '1', description: 'Elite', unit_price: 60000, item_type: 'dog' },
      { id: '2', description: DELIVERY_TBC_DESCRIPTION, unit_price: 0, item_type: 'delivery' },
    ],
    delivery_decision: 'to_be_confirmed',
  });
  assert.equal(tbcOutstanding.some((it) => it.target === 'price'), false);

  const eliteDefault = defaultDeliveryDecision(['elite_developed'], null);
  assert.equal(eliteDefault.decision, 'charged');
  assert.match(eliteDefault.reason ?? '', /Elite and protection dogs do not include delivery/);
  const puppyDefault = defaultDeliveryDecision(['puppy'], 'South Africa');
  assert.equal(puppyDefault.decision, 'included');

  console.log('quoteDelivery.test.ts: ok');
}

main();
