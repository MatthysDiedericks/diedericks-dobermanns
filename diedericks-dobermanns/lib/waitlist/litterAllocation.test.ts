import assert from 'node:assert/strict';

import type { WaitingListEntry } from '@/types/app.types';

import {
  assignBuyer,
  rankedBuyersForPuppy,
  siblingGroupLines,
  suggestLitterAllocation,
  undoAllocation,
  type AllocationPuppy,
} from './litterAllocation';

/** Run: npx tsx lib/waitlist/litterAllocation.test.ts */

function buyer(partial: Partial<WaitingListEntry> & { id: string }): WaitingListEntry {
  return {
    client_id: null,
    list_type_id: null,
    application_id: null,
    litter_id: null,
    enquirer_name: partial.id,
    enquirer_email: null,
    enquirer_phone: null,
    enquirer_country: null,
    source: null,
    preferred_category: 'standard',
    preferred_sex: 'male',
    preferred_colour: 'black_tan',
    ear_preference: null,
    tail_preference: 'docked',
    registration_preference: null,
    priority: 'normal',
    payment_status: 'none',
    deposit_amount: null,
    deposit_paid_date: null,
    deposit_invoice_id: null,
    quoted_price: null,
    quote_id: null,
    quote_sent_date: null,
    quote_expires_date: null,
    balance_invoice_id: null,
    assigned_dog_id: null,
    assigned_litter_id: null,
    last_contact_date: null,
    preference_notes: null,
    admin_notes: null,
    client_visible_note: null,
    internal_flags: [],
    do_not_sell_reason: null,
    position: null,
    status: 'active',
    pipeline_stage: 'approved',
    follow_up_date: null,
    feedback: null,
    expected_delivery_date: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function puppy(
  partial: Partial<AllocationPuppy> & { id: string; name: string; birth_order: number },
): AllocationPuppy {
  return {
    sex: 'male',
    colour: 'black_tan',
    status: 'available',
    programme_tier: null,
    category: 'puppy',
    tail_type: 'docked',
    ...partial,
  };
}

function main() {
  const alex = buyer({ id: 'alex', enquirer_name: 'Alex' });
  const sam = buyer({ id: 'sam', enquirer_name: 'Sam', created_at: '2026-06-01T00:00:00.000Z' });
  const k1 = puppy({ id: 'k1', name: 'K1', birth_order: 1 });
  const k2 = puppy({ id: 'k2', name: 'K2', birth_order: 2 });
  const entries = [alex, sam];

  const placed = assignBuyer([], k1.id, alex.id);
  assert.equal(
    rankedBuyersForPuppy(entries, k2, placed.allocations).some((c) => c.entry.id === 'alex'),
    false,
  );

  const undone = undoAllocation(placed.allocations, k1.id, []);
  assert.equal(
    rankedBuyersForPuppy(entries, k2, undone).some((c) => c.entry.id === 'alex'),
    true,
  );

  const snapshot = entries.map((entry) => ({ ...entry }));
  const suggestion = suggestLitterAllocation([k2, k1], entries, []);
  assert.deepEqual(entries, snapshot);
  assert.ok(suggestion.every((line) => line.source === 'proposed'));
  assert.equal(new Set(suggestion.map((line) => line.entryId)).size, 2);

  const lines = siblingGroupLines([
    buyer({ id: 'a', enquirer_name: 'Anna', sibling_group_id: 'grp' }),
    buyer({ id: 'b', enquirer_name: 'Ben', sibling_group_id: 'grp' }),
    buyer({ id: 'c', enquirer_name: 'Cara' }),
  ]);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /Anna and Ben/);

  console.log('litterAllocation.test.ts ok');
}

main();
