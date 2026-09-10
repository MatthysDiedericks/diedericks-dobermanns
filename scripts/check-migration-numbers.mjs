#!/usr/bin/env node
/**
 * Fails if the two supabase/migrations folders drift, or if a 0NNN prefix
 * is reused. Two repos hold one database — a same-name, different-content
 * file is how a constraint has already drifted once.
 *
 *   node scripts/check-migration-numbers.mjs
 *
 * Wired from check-parity.mjs so it runs wherever parity runs.
 */

import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 0171 is already duplicated on disk (receipts_bucket + dogs_anon_grant).
 * Live history is timestamp-keyed, so renaming an applied file risks
 * re-apply. Allow this pair only. A third 0171 must fail.
 */
const ALLOWED_DUPLICATE_PREFIXES = {
  '0171': '0171_receipts_bucket.sql + 0171_dogs_anon_grant_listing_columns.sql — already applied under timestamps; do not rename, do not add a third 0171.',
};

const PREFIX = /^(\d+[a-z]*)_/i;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const FOLDERS = [
  { label: 'app', dir: path.join(repoRoot, 'diedericks-dobermanns', 'supabase', 'migrations') },
  { label: 'web', dir: path.join(repoRoot, 'diedericksdobermann-web', 'supabase', 'migrations') },
];

function listSql(dir) {
  if (!fs.existsSync(dir)) return null;
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function hashFile(dir, name) {
  // Compare SQL text, not CRLF vs LF. A Windows checkout of one repo
  // against LF in the other must not look like a schema drift.
  const text = fs
    .readFileSync(path.join(dir, name), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  return crypto.createHash('sha256').update(text).digest('hex');
}

function prefixOf(name) {
  const m = name.match(PREFIX);
  return m ? m[1] : null;
}

const errors = [];
const present = FOLDERS.map((f) => ({ ...f, files: listSql(f.dir) }));

for (const folder of present) {
  if (!folder.files) {
    errors.push(`missing migrations folder: ${folder.label} (${folder.dir})`);
    continue;
  }
  const byPrefix = new Map();
  for (const name of folder.files) {
    const prefix = prefixOf(name);
    if (!prefix) continue;
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(name);
  }
  for (const [prefix, names] of byPrefix) {
    if (names.length < 2) continue;
    const allowed = ALLOWED_DUPLICATE_PREFIXES[prefix];
    if (allowed) {
      console.log(`  allow-listed duplicate ${prefix} in ${folder.label}: ${names.join(', ')}`);
      console.log(`    ${allowed}`);
      continue;
    }
    errors.push(`${folder.label}: prefix ${prefix} appears ${names.length} times: ${names.join(', ')}`);
  }
}

const app = present.find((f) => f.label === 'app');
const web = present.find((f) => f.label === 'web');
if (app?.files && web?.files) {
  const appSet = new Set(app.files);
  const webSet = new Set(web.files);
  for (const name of app.files) {
    if (!webSet.has(name)) errors.push(`in app, missing from web: ${name}`);
  }
  for (const name of web.files) {
    if (!appSet.has(name)) errors.push(`in web, missing from app: ${name}`);
  }
  for (const name of app.files) {
    if (!webSet.has(name)) continue;
    const a = hashFile(app.dir, name);
    const b = hashFile(web.dir, name);
    if (a !== b) errors.push(`same name, different content: ${name}`);
  }
}

if (errors.length > 0) {
  console.error('\nMigration number / parity check failed:');
  for (const e of errors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

console.log('  Migration numbers: prefixes unique (or allow-listed); folders in sync.');
