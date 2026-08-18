import assert from 'node:assert/strict';

import type { WhelpTempRecord } from './constants';
import {
  dropAlertMessage,
  latestDropAndPrevious,
  previousThreeCaption,
  validateWhelpTempC,
  WHELP_TEMP_RANGE_MSG,
} from './whelpTempLogic';

function row(id: string, taken_at: string, temp_c: number): WhelpTempRecord {
  return { id, heat_cycle_id: 'cycle', taken_at, temp_c, notes: null, created_at: taken_at };
}

function main() {
  assert.equal(validateWhelpTempC(36.8), null);
  assert.equal(validateWhelpTempC(33), null);
  assert.equal(validateWhelpTempC(43), null);
  assert.equal(validateWhelpTempC(50), WHELP_TEMP_RANGE_MSG);
  assert.equal(validateWhelpTempC(32.9), WHELP_TEMP_RANGE_MSG);
  assert.equal(validateWhelpTempC(Number.NaN), WHELP_TEMP_RANGE_MSG);

  const t1 = row('1', '2026-09-25T22:00:00.000Z', 38.1);
  const t2 = row('2', '2026-09-26T00:10:00.000Z', 37.6);
  const t3 = row('3', '2026-09-26T02:14:00.000Z', 36.8);
  const t4 = row('4', '2026-09-26T04:00:00.000Z', 38.0);
  const { latestDrop, previousThree } = latestDropAndPrevious([t1, t2, t3, t4]);
  assert.equal(latestDrop?.id, '3');
  assert.deepEqual(
    previousThree.map((t) => t.id),
    ['3', '2', '1'],
  );
  assert.match(dropAlertMessage(t3), /36\.8 °C/);
  assert.match(dropAlertMessage(t3), /whelping likely within 24 hours/);
  assert.match(previousThreeCaption(previousThree), /38\.1 °C/);
  assert.match(previousThreeCaption(previousThree), /37\.6 °C/);
  assert.match(previousThreeCaption(previousThree), /36\.8 °C/);

  assert.equal(latestDropAndPrevious([t1, t2]).latestDrop, null);

  console.log('whelpTempLogic.test.ts: ok');
}

main();
