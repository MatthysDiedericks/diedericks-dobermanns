import assert from 'node:assert/strict';

import {
  accountsFromSettings,
  bankAudienceFor,
  bankBlocksFromSettings,
  formatBankBlocksText,
  paymentCountryFor,
  settingEnabled,
  visibleBankKinds,
} from './bankDetails';

/** Run: npx tsx lib/finance/bankDetails.test.ts */

const SETTINGS: Record<string, string> = {
  bank_account_name: 'MR M DIEDERICKS',
  bank_account_number: '27 311 907 9',
  bank_name: 'Standard Bank',
  bank_branch_code: '2749',
  bank_swift: 'SBZAZAJJ',
  bank_account_note: 'Use the quote number as reference.',
  bank_domestic_label: 'South African clients',
  bank_intl_enabled: 'true',
  bank_intl_account_name: 'MATTHYS DIEDERICKS',
  bank_intl_account_number: '16916528231',
  bank_intl_bank_name: 'Discovery Bank',
  bank_intl_branch_code: '679000',
  bank_intl_swift: 'DISCZAJJXXX',
  bank_intl_address: 'Discovery Place, 1 Discovery Place, Sandton, 2196',
  bank_intl_branch_name: 'Sandton',
  bank_intl_account_type: 'Gold Credit Card',
  bank_intl_note: 'Please include SWIFT and the bank address on the wire.',
  bank_intl_label: 'International & SADC clients',
};

function rendered(country: string | null | undefined, settings = SETTINGS): string {
  return formatBankBlocksText(bankBlocksFromSettings(country, settings), 'DD-TEST');
}

assert.equal(bankAudienceFor('South Africa'), 'domestic');
assert.equal(bankAudienceFor('south africa'), 'domestic');
assert.equal(bankAudienceFor('  SOUTH AFRICA  '), 'domestic');
assert.equal(bankAudienceFor('ZA'), 'domestic');
assert.equal(bankAudienceFor('za'), 'domestic');
assert.equal(bankAudienceFor('RSA'), 'domestic');
assert.equal(bankAudienceFor('rsa'), 'domestic');

for (const country of [
  'Eswatini',
  '  eswatini  ',
  'Swaziland',
  'SWAZILAND',
  'Namibia',
  'Zambia',
  'Germany',
  'United States',
]) {
  assert.equal(bankAudienceFor(country), 'international', country);
}

assert.equal(bankAudienceFor(null), 'both');
assert.equal(bankAudienceFor(undefined), 'both');
assert.equal(bankAudienceFor(''), 'both');
assert.equal(bankAudienceFor('   '), 'both');

assert.deepEqual(visibleBankKinds('international', false), ['domestic']);
assert.deepEqual(visibleBankKinds('both', false), ['domestic']);
assert.deepEqual(visibleBankKinds('domestic', true), ['domestic']);
assert.deepEqual(visibleBankKinds('international', true), ['international']);
assert.deepEqual(visibleBankKinds('both', true), ['domestic', 'international']);

assert.equal(settingEnabled('true'), true);
assert.equal(settingEnabled('false'), false);

const sa = rendered('South Africa');
assert.match(sa, /South African clients/);
assert.match(sa, /27 311 907 9/);
assert.equal(sa.includes('16916528231'), false);
assert.equal(sa.includes('International & SADC clients'), false);

const eswatini = rendered('Eswatini');
assert.match(eswatini, /International & SADC clients/);
assert.match(eswatini, /16916528231/);
assert.match(eswatini, /Account type: Gold Credit Card/);
assert.match(eswatini, /Bank address:/);
assert.equal(eswatini.includes('27 311 907 9'), false);
assert.equal(eswatini.includes('South African clients'), false);

const both = rendered(null);
assert.match(both, /South African clients/);
assert.match(both, /International & SADC clients/);
assert.match(both, /27 311 907 9/);
assert.match(both, /16916528231/);
assert.ok(
  both.indexOf('South African clients') < both.indexOf('International & SADC clients'),
  'domestic block comes first when both are shown',
);

const intlOff = rendered('Eswatini', { ...SETTINGS, bank_intl_enabled: 'false' });
assert.match(intlOff, /27 311 907 9/);
assert.equal(intlOff.includes('16916528231'), false);
assert.equal(intlOff.includes('International & SADC clients'), false);

assert.equal(
  paymentCountryFor({
    contactCountry: 'Eswatini',
    applicationCountry: 'South Africa',
    clientCountry: 'South Africa',
  }),
  'Eswatini',
);

const accounts = accountsFromSettings(SETTINGS);
assert.equal(accounts.intlEnabled, true);
assert.equal(accounts.international.accountType, 'Gold Credit Card');

for (const block of bankBlocksFromSettings(null, SETTINGS)) {
  assert.ok(block.heading.trim().length > 0, 'never render an unlabelled account block');
}

console.log('bankDetails.test.ts ok');
