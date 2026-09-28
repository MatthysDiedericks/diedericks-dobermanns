import assert from 'node:assert/strict';

import {
  addCalendarDays,
  attentionText,
  dismissBlockReason,
  dismissUntil,
  dismissalStillHides,
  duePhrase,
  hasDueDate,
  resolveLeadDays,
  selectExpiring,
  type ExpiringCandidate,
} from './expiring';

/** Run: npx tsx src/lib/alerts/expiring.test.ts */

const TODAY = '2026-09-22';

function item(partial: Partial<ExpiringCandidate> & Pick<ExpiringCandidate, 'kind' | 'dueOn'>): ExpiringCandidate {
  return {
    id: partial.id ?? partial.kind,
    label: partial.label ?? partial.kind,
    context: partial.context ?? null,
    href: partial.href ?? `/${partial.kind}`,
    ...partial,
  };
}

const vaccinationIn8 = item({
  kind: 'vaccination',
  id: 'v8',
  label: 'Rabies',
  context: 'Hannah',
  dueOn: '2026-09-30',
});

const vaccinationIn7 = item({
  kind: 'vaccination',
  id: 'v7',
  label: 'Rabies',
  context: 'Hannah',
  dueOn: '2026-09-29',
});

const lead7 = { alert_lead_days_vaccination: '7' };

const eightDaysOut = selectExpiring([vaccinationIn8], { today: TODAY, settings: lead7 });
assert.equal(eightDaysOut.length, 0, '8 days out stays hidden at a 7-day lead');

const sevenDaysOut = selectExpiring([vaccinationIn7], { today: TODAY, settings: lead7 });
assert.equal(sevenDaysOut.length, 1);
assert.equal(sevenDaysOut[0].daysLeft, 7);

const overdue = item({
  kind: 'vaccination',
  id: 'late',
  label: "Hannah's vaccination",
  context: 'Hannah',
  dueOn: '2026-09-19',
});
const kusa = item({
  kind: 'document',
  id: 'kusa',
  label: 'KUSA membership',
  dueOn: '2026-10-15',
});

const sorted = selectExpiring([kusa, overdue], {
  today: TODAY,
  settings: { alert_lead_days_vaccination: '7', alert_lead_days_document: '30' },
});
assert.equal(sorted[0].id, 'late');
assert.equal(sorted[0].daysLeft, -3);
assert.equal(duePhrase(sorted[0]), 'expired 3 days ago');
assert.equal(attentionText(sorted[1]), 'KUSA membership expires in 23 days');

const until = dismissUntil(TODAY);
assert.equal(until, addCalendarDays(TODAY, 7));
assert.equal(until, '2026-09-29');
const quote = item({ kind: 'quote', id: 'q1', label: 'Q-100', dueOn: '2026-10-20' });
const hidden = selectExpiring([quote], {
  today: TODAY,
  settings: { alert_lead_days_quote: '40' },
  dismissals: [{ itemKind: 'quote', itemId: 'q1', dismissedUntil: until }],
});
assert.equal(hidden.length, 0, 'dismissed for 7 days');
const returned = selectExpiring([quote], {
  today: until,
  settings: { alert_lead_days_quote: '40' },
  dismissals: [{ itemKind: 'quote', itemId: 'q1', dismissedUntil: until }],
});
assert.equal(returned.length, 1, 'returns on dismissed_until');
assert.ok(returned[0].daysLeft > 0, 'it returns while it is still in the future');
assert.equal(dismissalStillHides(until, '2026-09-28'), true);
assert.equal(dismissalStillHides(until, until), false);

assert.equal(dismissBlockReason(-3), 'An overdue item cannot be dismissed.');
assert.equal(dismissBlockReason(0), null);
const stillShown = selectExpiring([overdue], {
  today: TODAY,
  settings: { alert_lead_days_vaccination: '7' },
  dismissals: [{ itemKind: 'vaccination', itemId: 'late', dismissedUntil: '2099-01-01' }],
});
assert.equal(stillShown.length, 1, 'an overdue dismissal row does not hide it');

assert.equal(hasDueDate(null), false);
assert.equal(hasDueDate(''), false);
const undated = selectExpiring(
  [item({ kind: 'document', id: 'blank', label: 'Logo', dueOn: '' })],
  { today: TODAY, settings: { alert_lead_days_document: '30' } },
);
assert.equal(undated.length, 0, 'a document with no expiry date never appears');

const at30 = selectExpiring([kusa], {
  today: TODAY,
  settings: { alert_lead_days_document: '30' },
});
assert.equal(at30.length, 1);
assert.equal(at30[0].daysLeft, 23);
assert.equal(duePhrase(at30[0]), 'expires in 23 days');

const at7 = selectExpiring([kusa], {
  today: TODAY,
  settings: { alert_lead_days_document: '7' },
});
assert.equal(at7.length, 0, 'the same letter is hidden when the setting is 7');

const fromSettings = resolveLeadDays({ alert_lead_days_document: '12' }, 7);
assert.equal(fromSettings.document, 12);
assert.equal(resolveLeadDays({}, 7).document, 30);
assert.equal(resolveLeadDays({}, 7).vaccination, 7);
assert.equal(resolveLeadDays({}, 7).contract, 3);
assert.notEqual(fromSettings.document, resolveLeadDays({}, 7).document);

console.log('expiring.test.ts ok');
