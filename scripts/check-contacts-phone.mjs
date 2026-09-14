#!/usr/bin/env node
/**
 * Fails if a TypeScript/JavaScript path inserts into `contacts` without
 * going through the shared phone validator (parsePhone / requirePhone /
 * phoneField from lib/phone.ts).
 *
 *   node scripts/check-contacts-phone.mjs
 *
 * Wired from check-parity.mjs so it runs wherever parity runs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FROM_CONTACTS = /\.from\(\s*['"]contacts['"](?:\s+as\s+[^)]+)?\s*\)/g;
const FIRST_METHOD = /^\s*\.\s*(insert|upsert|select|update|delete|not|eq|is|filter|in)\b/;
const PHONE_IMPORT = /from\s+['"][^'"]*\/phone['"]/;
const PHONE_VALIDATOR = /\b(?:parsePhone|requirePhone|phoneField)\b/;
const SKIP_DIR = /(?:^|[\\/])(?:node_modules|\.next|\.git|dist|build|_archive_buildcheck|_idbuildcheck)(?:[\\/]|$)/;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const startDir = path.resolve(scriptDir, '..');

function walk(dir, out = []) {
  if (!fs.existsSync(dir) || SKIP_DIR.test(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'migrations') {
        continue;
      }
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function scanRoots() {
  const roots = [];
  const app = path.join(startDir, 'diedericks-dobermanns');
  const web = path.join(startDir, 'diedericksdobermann-web');
  if (fs.existsSync(app)) {
    roots.push(
      path.join(app, 'lib'),
      path.join(app, 'hooks'),
      path.join(app, 'components'),
      path.join(app, 'app'),
    );
  }
  if (fs.existsSync(web)) roots.push(path.join(web, 'src'));
  if (fs.existsSync(path.join(startDir, 'src'))) roots.push(path.join(startDir, 'src'));
  if (roots.length === 0) roots.push(startDir);
  return roots;
}

function contactInserts(body) {
  const hits = [];
  FROM_CONTACTS.lastIndex = 0;
  let m;
  while ((m = FROM_CONTACTS.exec(body))) {
    const after = body.slice(m.index + m[0].length, m.index + m[0].length + 240);
    const method = after.match(FIRST_METHOD);
    if (method && (method[1] === 'insert' || method[1] === 'upsert')) {
      hits.push(method[1]);
    }
  }
  return hits;
}

function usesSharedValidator(body) {
  return PHONE_IMPORT.test(body) && PHONE_VALIDATOR.test(body);
}

const hits = [];
for (const root of scanRoots()) {
  for (const file of walk(root)) {
    const body = fs.readFileSync(file, 'utf8');
    if (!body.includes("from('contacts')") && !body.includes('from("contacts")')) continue;
    const inserts = contactInserts(body);
    if (inserts.length === 0) continue;
    if (usesSharedValidator(body)) continue;
    const rel = path.relative(startDir, file).split(path.sep).join('/');
    hits.push(`${rel}: contacts.${inserts.join('/')} without parsePhone/requirePhone/phoneField`);
  }
}

if (hits.length > 0) {
  console.error('\nContacts insert does not go through the shared phone validator:');
  for (const h of hits) console.error(`  ${h}`);
  console.error(
    '\nValidate with parsePhone, requirePhone, or phoneField from lib/phone.ts.\n' +
      'Do not write a second phone validator.\n',
  );
  process.exit(1);
}

console.log('  Contacts inserts: every path uses the shared phone validator.');
