import assert from 'node:assert/strict';

import type { WaitingListEntry } from '@/types/app.types';

import {
  explainEmptyDogsForBuyer,
  isMatchableDogStatus,
  rankBuyersForDog,
  rankDogsForBuyer,
  type MatchableDog,
} from './matching';

/** Run: npx tsx lib/waitlist/matching.test.ts */

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

function dog(partial: Partial<MatchableDog> & { id: string; name: string }): MatchableDog {
  return {
    sex: 'male',
    colour: 'black_tan',
    status: 'available',
    programme_tier: null,
    category: 'puppy',
    tail_type: null,
    ...partial,
  };
}

function main() {
  const k4 = dog({ id: 'k4', name: 'K4' });
  const ranked = rankBuyersForDog([buyer({ id: 'docked-male', enquirer_name: 'Alex' })], k4);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].perfectFit, true);
  assert.ok(ranked[0].warnings.includes('Tail not recorded'));
  assert.equal(ranked[0].mismatches.length, 0);
  assert.equal(ranked[0].criteria.find((c) => c.key === 'tail')?.points, 0);

  const elite = buyer({
    id: 'elite',
    preferred_category: 'elite_developed',
    enquirer_name: 'Elite buyer',
  });
  assert.equal(rankDogsForBuyer(elite, [k4]).length, 0);
  const reason = explainEmptyDogsForBuyer(elite, [k4]);
  assert.ok(reason);
  assert.match(reason, /Elite developed/);
  assert.match(reason, /no available dog carries that tier/);

  const intended = dog({
    id: 'k1',
    name: 'K1',
    litter_default_programme_tier: 'elite_developed',
  });
  assert.equal(rankDogsForBuyer(elite, [intended]).length, 1);

  assert.equal(isMatchableDogStatus('available'), true);
  assert.equal(isMatchableDogStatus('puppy'), false);
  assert.doesNotMatch(isMatchableDogStatus.toString(), /puppy/);

  console.log('matching.test.ts ok');
}

main();
