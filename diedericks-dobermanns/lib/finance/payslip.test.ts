import assert from 'node:assert/strict';

import {
  deductionsForSave,
  payslipNet,
  suggestEnpfContribution,
} from './payslip';

/** Run: npx tsx lib/finance/payslip.test.ts */

assert.equal(payslipNet(15000, []), 15000);
assert.equal(payslipNet(15000, [{ label: 'PAYE', amount: 2500 }]), 12500);
assert.equal(
  payslipNet(15000, [
    { label: 'PAYE', amount: 2500 },
    { label: 'ENPF', amount: 215 },
  ]),
  12285,
);

const belowCeiling = suggestEnpfContribution(3000, 4300, 0.05);
assert.equal(belowCeiling, 150);

const aboveCeiling = suggestEnpfContribution(15000, 4300, 0.05);
assert.equal(aboveCeiling, 215);

const raisedCeiling = suggestEnpfContribution(15000, 4600, 0.05);
assert.equal(raisedCeiling, 230);

const afterRemovingEnpf = payslipNet(15000, [{ label: 'PAYE', amount: 2500 }]);
assert.equal(afterRemovingEnpf, 12500);

const persisted = deductionsForSave([
  { label: 'PAYE', amount: 0 },
  { label: 'ENPF', amount: 215 },
  { label: '  ', amount: 10 },
]);
assert.deepEqual(persisted, [{ label: 'ENPF', amount: 215 }]);

console.log('payslip.test.ts ok');
