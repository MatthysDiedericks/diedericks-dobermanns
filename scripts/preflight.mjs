/**
 * App-repo preflight — fail on unrecorded website/app screen drift.
 * Cursor already runs `npm run preflight` before commits; without this,
 * the parity checker is a report nobody opens.
 *
 *   npm run preflight
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'check-parity.mjs');

const RED = '\x1b[31m';
const GRN = '\x1b[32m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

console.log(`\n${DIM}Preflight — platform parity --strict${OFF}\n`);
process.stdout.write(`${DIM}running parity --strict…${OFF}\n`);

const r = spawnSync(process.execPath, [script, '--strict'], {
  stdio: 'inherit',
  cwd: root,
});

if (r.status !== 0) {
  console.error(`${RED}✗ parity --strict failed${OFF}`);
  console.error(`${RED}Preflight FAILED — do not push.${OFF}\n`);
  process.exit(1);
}

console.log(`${GRN}✓ parity --strict passed${OFF}`);
console.log(`${GRN}Preflight passed.${OFF}\n`);
