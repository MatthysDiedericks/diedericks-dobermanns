#!/usr/bin/env node
/**
 * Compares admin + portal screens on the website against the Expo app.
 *
 *   node scripts/check-parity.mjs           # report (exit 0)
 *   node scripts/check-parity.mjs --strict  # exit 1 on unrecorded drift
 *
 * Only route entry points count. A PascalCase file under app/ is a component.
 * Deliberate single-platform screens belong in scripts/parity-exceptions.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Same screen, names that normalisation cannot reach. Key is whichever side
 * we see first; value is the other. Comment on each is the reason they match.
 */
const ALIASES = {
  // Hyphen vs nested folder — also handled by normalize(); listed so the pair is documented.
  'portal/application-edit': 'portal/application/edit',
  'portal/application-another': 'portal/application/another',
  'admin/finance/invoices/recurring-new': 'admin/finance/invoices/recurring/new',
  // Owner health-change form — website nests it under the dog, app names the job.
  'portal/report-health/:dogId': 'portal/dogs/:id/health-change',
  'portal/dogs/:id/health-change': 'portal/dogs/:id/health-change',
  // Website preview catch-all vs the app's view-as screen.
  'admin/preview/clients/:id/view-as/::rest': 'admin/clients/:id/view-as',
  'admin/preview/clients/:id/view-as/:rest': 'admin/clients/:id/view-as',
  // Broadcast composer — website calls it messaging.
  'admin/broadcast/new': 'admin/messaging',
  // App reuses the log-expense form with ?expenseId= instead of a /:id URL.
  'admin/finance/expenses/:id': 'admin/finance/expenses/new',
  // Guide reader is the list row until the kennel publishes articles.
  'portal/training/guides/:slug': 'portal/training/guides',
};

const SKIP_FILE = /^(?:_layout|layout|loading|error|not-found|template)$/;
const SURFACES = ['admin', 'portal'];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const EXCEPTIONS_FILE = path.join(repoRoot, 'scripts', 'parity-exceptions.json');

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

/** Website: page.tsx is the screen. route.ts is an HTTP handler, not a screen. */
function isRouteFile(file, kind) {
  const base = path.basename(file);
  if (kind === 'web') return base === 'page.tsx';
  if (!file.endsWith('.tsx')) return false;
  const stem = base.replace(/\.tsx$/, '');
  if (SKIP_FILE.test(stem)) return false;
  return !/^[A-Z][a-zA-Z0-9]+$/.test(stem);
}

function routeKey(file, base) {
  let rel = path.relative(base, file).split(path.sep).join('/');
  rel = rel
    .replace(/\/(page|route)\.(tsx|ts)$/, '')
    .replace(/\.tsx$/, '')
    .replace(/\/index$/, '')
    .replace(/\((panel)\)\//g, '')
    .replace(/\(([a-z]+)\)/g, '$1')
    .replace(/\[\.\.\.[^\]]+\]/g, ':rest')
    .replace(/\[([^\]]+)\]/g, ':$1')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
  return rel;
}

/**
 * Collapse - and / to one separator, drop a leading preview/ segment, treat
 * :id / :dogId / :slug (and the other param names we actually use) as one token.
 */
function normalize(key) {
  return key
    .replace(/^(admin|portal)\/preview\//, '$1/')
    .replace(/\/:+rest$/, '')
    .replace(/-/g, '/')
    .replace(/:(?:id|dogId|slug|puppyId|categoryId|videoId|token)\b/g, ':id');
}

function collect(base, kind) {
  const keys = new Set();
  if (!base || !fs.existsSync(base)) return keys;
  for (const file of walk(base)) {
    if (!isRouteFile(file, kind)) continue;
    const key = routeKey(file, base);
    if (!key || SKIP_FILE.test(key.split('/').pop() ?? '')) continue;
    if (!SURFACES.some((s) => key === s || key.startsWith(`${s}/`))) continue;
    keys.add(key);
  }
  return keys;
}

function resolveTrees() {
  if (process.env.PARITY_WEB && process.env.PARITY_APP) {
    return { web: process.env.PARITY_WEB, app: process.env.PARITY_APP };
  }
  const candidates = [
    {
      web: path.join(repoRoot, 'diedericksdobermann-web', 'src', 'app'),
      app: path.join(repoRoot, 'diedericks-dobermanns', 'app'),
    },
    {
      web: path.join(repoRoot, 'src', 'app'),
      app: path.join(repoRoot, '..', 'diedericks-dobermanns', 'app'),
    },
    {
      web: path.join(repoRoot, 'src', 'app'),
      app: path.join(repoRoot, '_parity-app', 'diedericks-dobermanns', 'app'),
    },
  ];
  return candidates.find((c) => fs.existsSync(c.web) && fs.existsSync(c.app)) ?? null;
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
  const trees = resolveTrees();
  if (!trees) {
    console.error('\nBoth route trees must be present (website src/app and app/app).\n');
    process.exit(2);
  }

  const { webOnly = {}, appOnly = {}, aliases = {}, ignore = [] } = loadExceptions();
  const aliasOf = (k) => ALIASES[k] ?? aliases[k] ?? k;
  const canon = (k) => normalize(aliasOf(k));
  const ignored = new Set(ignore.map(canon));

  const webRaw = [...collect(trees.web, 'web')];
  const appRaw = [...collect(trees.app, 'app')];
  const display = new Map();
  const take = (raws) => {
    const set = new Set();
    for (const raw of raws) {
      const c = canon(raw);
      if (ignored.has(c)) continue;
      if (!display.has(c)) display.set(c, aliasOf(raw));
      set.add(c);
    }
    return set;
  };

  const web = take(webRaw);
  const app = take(appRaw);
  const lookup = (map, key) => {
    if (map[key]) return map[key];
    const hit = Object.entries(map).find(([k]) => canon(k) === key);
    return hit ? hit[1] : undefined;
  };
  const label = (k) => display.get(k) ?? k;

  const missingFromApp = [...web].filter((k) => !app.has(k)).sort();
  const missingFromWeb = [...app].filter((k) => !web.has(k)).sort();
  const unexpectedApp = missingFromApp.filter((k) => !lookup(webOnly, k)).map(label);
  const unexpectedWeb = missingFromWeb.filter((k) => !lookup(appOnly, k)).map(label);

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
      const why = lookup(exceptions, k);
      const shown = label(k);
      console.log(why ? `    ✓ ${shown}\n        allowed: ${why}` : `    ✗ ${shown}`);
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

  if (strict && total > 0) {
    console.error('Parity check failed. Unrecorded screens:');
    for (const k of unexpectedApp) console.error(`  app is missing: ${k}`);
    for (const k of unexpectedWeb) console.error(`  website is missing: ${k}`);
    console.error(
      'Build the other side, or record why not in scripts/parity-exceptions.json.',
    );
    process.exit(1);
  }
}

run();
