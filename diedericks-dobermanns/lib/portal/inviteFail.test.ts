import assert from 'node:assert/strict';

import { inviteFailUserMessage, reasonFromDiagnose } from './inviteFail';

assert.equal(reasonFromDiagnose(null), 'no-invite');
assert.equal(reasonFromDiagnose({ exists: false, expires_at: null, code_redeemed_at: null, invited_at: null }), 'no-invite');
assert.equal(
  reasonFromDiagnose({
    exists: true,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    code_redeemed_at: null,
    invited_at: new Date().toISOString(),
  }),
  'wrong-code',
);
assert.equal(
  reasonFromDiagnose({
    exists: true,
    expires_at: new Date(Date.now() - 86_400_000).toISOString(),
    code_redeemed_at: null,
    invited_at: new Date().toISOString(),
  }),
  'expired',
);
assert.equal(
  reasonFromDiagnose({
    exists: true,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    code_redeemed_at: new Date().toISOString(),
    invited_at: new Date().toISOString(),
  }),
  'used',
);
assert.equal(inviteFailUserMessage('no-invite').includes('No invite was issued'), true);
assert.equal(inviteFailUserMessage('wrong-code').includes('not right'), true);

console.log('inviteFail.test.ts ok');
