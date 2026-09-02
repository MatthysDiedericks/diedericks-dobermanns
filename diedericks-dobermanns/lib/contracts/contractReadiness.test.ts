import assert from 'node:assert/strict';

import {
  contractBlockers,
  contractUnresolvedTokens,
  hasZeroOrMissingPrice,
  sendBlockMessage,
  tokenLabel,
} from './contractReadiness';

/** Run: npx tsx lib/contracts/contractReadiness.test.ts */

assert.deepEqual(contractUnresolvedTokens('chip {{dog_microchip}} id {{buyer_id_number}}'), [
  'buyer_id_number',
  'dog_microchip',
]);
assert.equal(tokenLabel('dog_microchip'), 'Microchip number');
assert.equal(hasZeroOrMissingPrice('Purchase price R 0,00'), true);
assert.equal(hasZeroOrMissingPrice('Purchase price R 20 000,00'), false);

const incomplete = {
  body_html: 'Price R 0,00 and {{dog_microchip}}',
  dog_id: 'd1',
  client_id: null as string | null,
  contact_id: 'c1',
};
assert.deepEqual(contractBlockers(incomplete), ['unresolved_tokens', 'zero_price']);
assert.match(sendBlockMessage(incomplete) ?? '', /Microchip number/);

console.log('contractReadiness.test.ts ok');
