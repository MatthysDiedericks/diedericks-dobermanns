#!/usr/bin/env node
/**
 * check-parity.mjs
 * ────────────────
 * Compares the admin + client-portal screens in the WEBSITE repo against the
 * MOBILE APP repo and reports anything that exists on only one side.
 *
 * Why this exists: every feature since June was built on one platform and
 * "mirrored later". Nothing enforced the mirror, so the gap compounded silently
 * until the app was 35 screens ahead — then the website overtook it on quotes.
 * A written rule did not hold. This is the mechanical version.
 *
 * Usage (from the project root):
 *   node scripts/check-parity.mjs           # report
 *   node scripts/check-parity.mjs --strict  # exit 1 on unexpected divergence
 *
 * Deliberate single-platform screens go in scripts/parity-exceptions.json with
 * a reason. Anything not listed there is treated as accidental drift.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(root, 'diedericksdobermann-web', 'src', 'app');
const APP = path.join(root, 'diedericks-dobermanns', 'app');

const EXCEPTIONS_FILE = path.join(root, 'scripts', 'parity-exceptions.json');

/** Recursively collect files under dir, ignoring node_modules. */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Reduce a file path to a comparable route key.
 * Both platforms express the same screen differently:
 *   web: src/app/admin/(panel)/quotes/[id]/page.tsx  -> admin/quotes/:id
 *   app: app/(admin)/quotes/[id].tsx                 -> admin/quotes/:id
 */
function routeKey(file, base) {
  let rel = path.relative(base, file).split(path.sep).join('/');

  rel = rel
    .replace(/\/page\.tsx$/, '')      // web route file
    .replace(/\.tsx$/, '')            // app screen file
    .replace(/\/index$/, '')          // app folder index
    .replace(/\((panel)\)\//g, '')    // web route group, not part of the URL
    .replace(/\(([a-z]+)\)/g, '$1')   // (admin) -> admin, (portal) -> portal
    .replace(/\[\.\.\.[^\]]+\]/g, ':rest')
    .replace(/\[([^\]]+)\]/g, ':$1')  // [id] -> :id
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');

  return rel;
}

const SKIP = /(_layout|layout|loading|error|not-found|template|route)$/;

function collect(base, surfaces) {
  const keys = new Set();
  for (const file of walk(base)) {
    if (!file.endsWith('.tsx')) continue;
    const key = routeKey(file, base);
    if (!key || SKIP.test(key)) continue;
    if (!surfaces.some((s) => key === s || key.startsWith(`${s}/`))) continue;
    keys.add(key);
  }
  return keys;
}

function loadExceptions() {
  if (!fs.existsSync(EXCEPTIONS_FILE)) {
    return { webOnly: {}, appOnly: {}, aliases: {}, ignore: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(EXCEPTIONS_FILE, 'utf8'));
  } catch (e) {
    console.error(`Could not parse ${EXCEPTIONS_FILE}: ${e.message}`);
    process.exit(2);
  }
}

function run() {
  const strict = process.argv.includes('--strict');

  if (!fs.existsSync(WEB) || !fs.existsSync(APP)) {
    console.error('\nRun this from the project root — both repo folders must be present.\n');
    process.exit(2);
  }

  const surfaces = ['admin', 'portal'];
  const { webOnly = {}, appOnly = {}, aliases = {}, ignore = [] } = loadExceptions();
  const ignored = new Set(ignore);

  // The same screen is often named differently on each platform (the app's
  // "pairing-builder" is the website's "pairings"). Without aliasing, the check
  // reports dozens of false gaps — and a checker that cries wolf gets ignored,
  // which is exactly how the written parity rule failed.
  const canon = (k) => aliases[k] ?? k;

  const web = new Set([...collect(WEB, surfaces)].map(canon).filter((k) => !ignored.has(k)));
  const app = new Set([...collect(APP, surfaces)].map(canon).filter((k) => !ignored.has(k)));

  const missingFromApp = [...web].filter((k) => !app.has(k)).sort();
  const missingFromWeb = [...app].filter((k) => !web.has(k)).sort();

  const unexpectedApp = missingFromApp.filter((k) => !webOnly[k]);
  const unexpectedWeb = missingFromWeb.filter((k) => !appOnly[k]);

  const line = '─'.repeat(64);
  console.log(`\n${line}`);
  console.log('  PLATFORM PARITY — admin + client portal');
  console.log(line);
  console.log(`  Website screens : ${web.size}`);
  console.log(`  App screens     : ${app.size}`);
  console.log(line);

  const section = (title, items, exceptions) => {
    console.log(`\n  ${title}  (${items.length})`);
    if (items.length === 0) {
      console.log('    — none —');
      return;
    }
    for (const k of items) {
      const why = exceptions[k];
      console.log(why ? `    ✓ ${k}\n        allowed: ${why}` : `    ✗ ${k}`);
    }
  };

  section('ON THE WEBSITE BUT NOT THE APP', missingFromApp, webOnly);
  section('IN THE APP BUT NOT ON THE WEBSITE', missingFromWeb, appOnly);

  const total = unexpectedApp.length + unexpectedWeb.length;
  console.log(`\n${line}`);
  if (total === 0) {
    console.log('  ✅  In parity (or every difference is a recorded exception).');
  } else {
    console.log(`  ⚠️   ${total} screen(s) exist on one platform only, with no recorded reason.`);
    console.log('      Either build the missing side, or add an entry with a reason to');
    console.log('      scripts/parity-exceptions.json.');
  }
  console.log(`${line}\n`);

  if (strict && total > 0) process.exit(1);
}

run();
