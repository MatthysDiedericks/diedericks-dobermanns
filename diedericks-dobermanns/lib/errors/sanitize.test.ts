import assert from 'node:assert/strict';
import { assertDetailSafe, FORBIDDEN_DETAIL_KEY, sanitizeDetail } from './sanitize';

/** Run: npx tsx lib/errors/sanitize.test.ts */

function main() {
  assert.ok(FORBIDDEN_DETAIL_KEY.test('password'));
  assert.ok(FORBIDDEN_DETAIL_KEY.test('access_token'));
  assert.ok(FORBIDDEN_DETAIL_KEY.test('apiKey'));
  assert.ok(FORBIDDEN_DETAIL_KEY.test('otp_code'));
  assert.ok(FORBIDDEN_DETAIL_KEY.test('client_secret'));
  assert.ok(FORBIDDEN_DETAIL_KEY.test('id_number'));

  assert.doesNotThrow(() =>
    assertDetailSafe({ specific_code: 'AUTH_PASSWORD_POLICY', kind: 'password' }),
  );

  assert.throws(
    () => assertDetailSafe({ password: 'hunter2', reason: 'test' }),
    /password/i,
  );

  assert.throws(
    () => assertDetailSafe({ id_number: '8306030160082' }),
    /id_number/i,
  );

  const cleaned = sanitizeDetail({
    password: 'x',
    token: 'y',
    id_number: '8306030160082',
    specific_code: 'AUTH_PASSWORD_POLICY',
    nested: { secret: 1, ok: true },
  });
  assert.equal(cleaned?.password, undefined);
  assert.equal(cleaned?.token, undefined);
  assert.equal(cleaned?.id_number, undefined);
  assert.equal(cleaned?.specific_code, 'AUTH_PASSWORD_POLICY');
  assert.deepEqual(cleaned?.nested, { ok: true });

  console.log('sanitize.test.ts: ok');
}

main();
