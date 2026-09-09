import assert from 'node:assert/strict';

import {
  inviteFailPath,
  inviteFailUserMessage,
  reasonFromDiagnose,
} from './inviteFail';

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
assert.equal(inviteFailUserMessage('no-invite').includes('Request a new one'), true);
assert.equal(inviteFailUserMessage('wrong-code').includes('not right'), true);
assert.equal(inviteFailPath('expired'), '/portal/invite-expired');
assert.equal(
  inviteFailPath('no-invite', 'invite', 'buyer@example.com'),
  '/portal/invite-expired?reason=no-invite&email=buyer%40example.com',
);
assert.equal(
  inviteFailPath('used', 'signin', 'buyer@example.com'),
  '/portal/invite-expired?reason=used&link=signin&email=buyer%40example.com',
);

console.log('inviteFail.test.ts ok');
