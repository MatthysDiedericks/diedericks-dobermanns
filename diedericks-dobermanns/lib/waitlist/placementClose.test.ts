import assert from 'node:assert/strict';

import {
  entriesSettledByBalance,
  entriesToClose,
  handoverClosePatch,
  linkPuppyPatch,
  reconcileWaitingList,
  shownOnDefaultWaitingList,
  stageAge,
  stageAgeHeadline,
  waitingClosedLine,
  waitingListCounts,
  type CloseCandidate,
} from './placementClose';

/** Run: npx tsx lib/waitlist/placementClose.test.ts */

const NOW = new Date('2026-09-29T12:00:00');

function row(patch: Partial<CloseCandidate> & { id: string }): CloseCandidate {
  return {
    pipeline_stage: 'reserved',
    assigned_dog_id: null,
    client_id: null,
    application_id: null,
    quote_id: null,
    enquirer_name: 'Miles Marshall',
    ...patch,
  };
}

const linked = row({ id: 'wl-1', client_id: 'client-a', enquirer_name: 'Miles Marshall' });
const closed = entriesToClose([linked], { dogId: 'dog-1', clientId: 'client-a' });
assert.equal(closed.length, 1);
assert.equal(closed[0]?.id, 'wl-1');

const sameName = row({
  id: 'wl-name',
  client_id: 'client-b',
  enquirer_name: 'Miles Marshall',
});
assert.deepEqual(entriesToClose([sameName], { clientId: 'client-a' }), []);
assert.deepEqual(entriesToClose([sameName], {}), []);
assert.deepEqual(entriesToClose([row({ id: 'wl-noname', enquirer_name: 'Deon Vlok' })], {}), []);

const byDog = entriesToClose(
  [row({ id: 'wl-dog', assigned_dog_id: 'dog-9', client_id: 'someone-else', enquirer_name: 'Other' })],
  { dogId: 'dog-9' },
);
assert.equal(byDog.length, 1);
assert.equal(byDog[0]?.id, 'wl-dog');

const siblings = [
  row({ id: 'sib-1', client_id: 'client-a' }),
  row({ id: 'sib-2', client_id: 'client-a' }),
];
assert.deepEqual(entriesToClose(siblings, { clientId: 'client-a', dogId: 'dog-1' }), []);
assert.deepEqual(
  entriesToClose(siblings, { entryId: 'sib-2', clientId: 'client-a', dogId: 'dog-1' }).map((e) => e.id),
  ['sib-2'],
);

assert.deepEqual(
  entriesToClose([row({ id: 'done', pipeline_stage: 'handover_complete', client_id: 'client-a' })], {
    clientId: 'client-a',
  }),
  [],
);

assert.equal(shownOnDefaultWaitingList('handover_complete'), false);
assert.equal(shownOnDefaultWaitingList('withdrawn'), false);
assert.equal(shownOnDefaultWaitingList('do_not_sell'), false);
assert.equal(shownOnDefaultWaitingList('reserved'), true);
assert.equal(shownOnDefaultWaitingList('deposit_paid'), true);
assert.equal(shownOnDefaultWaitingList('enquiry'), false);
assert.deepEqual(
  waitingListCounts(['reserved', 'handover_complete', 'withdrawn', 'deposit_paid', 'do_not_sell']),
  { waiting: 2, closed: 3 },
);
assert.equal(waitingClosedLine(16, 4), '16 waiting · 4 closed');

const moved = stageAge(
  { stage_updated_at: '2026-09-17T08:00:00.000Z', date_added: '2026-06-01' },
  NOW,
);
assert.equal(moved.source, 'stage_updated_at');
assert.equal(moved.importFallback, false);
assert.equal(moved.days, 12);
assert.equal(stageAgeHeadline('quote_sent', moved), 'Quote Sent · 12 days ago');

const imported = stageAge(
  { stage_updated_at: '2026-07-21T00:00:00.000Z', date_added: '2026-06-05' },
  NOW,
);
assert.equal(imported.importFallback, true);
assert.equal(imported.source, 'date_added');
assert.equal(imported.days, stageAge({ date_added: '2026-06-05' }, NOW).days);
assert.match(stageAgeHeadline('reserved', imported), /since they joined/);

const missingStage = stageAge({ stage_updated_at: null, date_added: '2026-08-01' }, NOW);
assert.equal(missingStage.source, 'date_added');
assert.equal(missingStage.days, stageAge({ date_added: '2026-08-01' }, NOW).days);

const pool = [
  row({ id: 'stale', pipeline_stage: 'reserved', date_added: '2026-06-01', stage_updated_at: '2026-07-21' } as CloseCandidate),
  row({ id: 'fresh', pipeline_stage: 'reserved', date_added: '2026-09-20', stage_updated_at: '2026-09-20' } as CloseCandidate),
  row({ id: 'deposit', pipeline_stage: 'deposit_paid' }),
  row({ id: 'deposit-dog', pipeline_stage: 'deposit_paid', assigned_dog_id: 'dog-1' }),
  row({ id: 'closed-open', pipeline_stage: 'handover_complete' }),
  row({ id: 'closed-dog', pipeline_stage: 'withdrawn', assigned_dog_id: 'dog-2' }),
];
const report = reconcileWaitingList(
  pool as Parameters<typeof reconcileWaitingList>[0],
  NOW,
);
assert.deepEqual(report.reservedStaleNoDog.map((e) => e.id), ['stale']);
assert.deepEqual(report.depositPaidNoDog.map((e) => e.id), ['deposit']);
assert.deepEqual(report.closedUnlinked.map((e) => e.id), ['closed-open']);

const patch = linkPuppyPatch({ id: 'dog-9', litter_id: 'lit-1' });
assert.equal(patch.assigned_dog_id, 'dog-9');
assert.equal(patch.assigned_litter_id, 'lit-1');
assert.equal('pipeline_stage' in patch, false);
assert.equal('status' in patch, false);
const stillClosed = { pipeline_stage: 'handover_complete', status: 'removed' };
assert.equal(stillClosed.pipeline_stage, 'handover_complete');
assert.equal(stillClosed.status, 'removed');

const closePatch = handoverClosePatch('Closed because the dog was marked sold.', '2026-09-29T00:00:00.000Z', 'staff-1');
assert.equal(closePatch.pipeline_stage, 'handover_complete');
assert.equal(closePatch.status, 'removed');
assert.equal(closePatch.stage_change_note, 'Closed because the dog was marked sold.');

assert.deepEqual(
  entriesSettledByBalance(
    [
      {
        id: 'bal',
        pipeline_stage: 'reserved',
        balance_invoice_id: 'inv-b',
        deposit_invoice_id: 'inv-d',
      },
      {
        id: 'same',
        pipeline_stage: 'deposit_paid',
        balance_invoice_id: 'inv-d',
        deposit_invoice_id: 'inv-d',
      },
    ],
    'inv-b',
    0,
  ),
  ['bal'],
);
assert.deepEqual(
  entriesSettledByBalance(
    [{ id: 'same', pipeline_stage: 'deposit_paid', balance_invoice_id: 'inv-d', deposit_invoice_id: 'inv-d' }],
    'inv-d',
    0,
  ),
  [],
);

console.log('placementClose tests passed');
