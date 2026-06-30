/**
 * Unit tests for Wright's COI calculator — run: npx tsx lib/breeding/coi.test.ts
 */
import { calculateCoi, plannerLineColour, severityFromCoi } from './coi';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Unrelated pedigrees → COI 0
const unrelated = calculateCoi(
  [{ ancestor_id: 'a1', depth: 1, path: 'sire' }],
  [{ ancestor_id: 'b1', depth: 1, path: 'sire' }],
);
assert(unrelated.coi === 0, 'unrelated should be 0%');
assert(unrelated.severity === 'excellent', 'unrelated severity');

// Shared grandparent: sire's dam == dam's dam at depth 2 → F = 0.5^(2+2+1) = 0.03125 = 3.125%
const shared = calculateCoi(
  [
    { ancestor_id: 'gp', depth: 2, path: 'sire>dam' },
    { ancestor_id: 'gp', depth: 2, path: 'sire>dam' },
  ],
  [{ ancestor_id: 'gp', depth: 2, path: 'dam>dam' }],
);
assert(shared.coi > 0, 'shared ancestor should raise COI');
assert(shared.common_ancestors.includes('gp'), 'gp is common');

assert(plannerLineColour(2) === '#22C55E', 'green under 3');
assert(plannerLineColour(4) === '#F59E0B', 'amber 3-5');
assert(plannerLineColour(6) === '#EF4444', 'red over 5');
assert(severityFromCoi(2) === 'excellent', 'severity excellent');

console.log('coi.test.ts — all assertions passed');
