#!/usr/bin/env node
/**
 * Fails if a Title Case (or any non-snake_case) literal is written to
 * documents.category. That is the bug that rejected a live applicant:
 * category: "Application Supporting Doc" vs application_supporting_doc.
 *
 *   node scripts/check-document-categories.mjs
 *
 * Wired from check-parity.mjs so it runs wherever parity runs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SNAKE = /^[a-z][a-z0-9_]*$/;
const FROM_DOCUMENTS = /(?<!storage\s*)\.from\(\s*['"]documents['"]\s*\)/g;
const CATEGORY_LITERAL = /category\s*:\s*['"]([^'"]+)['"]/g;
const SKIP_DIR = /(?:^|[\\/])(?:node_modules|\.next|\.git|dist|build)(?:[\\/]|$)/;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const startDir = path.resolve(scriptDir, '..');

function walk(dir, out = []) {
  if (!fs.existsSync(dir) || SKIP_DIR.test(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
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
  if (fs.existsSync(app)) roots.push(path.join(app, 'lib'), path.join(app, 'hooks'), path.join(app, 'components'), path.join(app, 'app'));
  if (fs.existsSync(web)) roots.push(path.join(web, 'src'));
  if (fs.existsSync(path.join(startDir, 'src'))) roots.push(path.join(startDir, 'src'));
  if (roots.length === 0) {
    roots.push(startDir);
  }
  return roots;
}

const hits = [];
for (const root of scanRoots()) {
  for (const file of walk(root)) {
    if (file.includes(`${path.sep}migrations${path.sep}`)) continue;
    const body = fs.readFileSync(file, 'utf8');
    if (!FROM_DOCUMENTS.test(body) && !body.includes('.from("documents")') && !body.includes(".from('documents')")) {
      continue;
    }
    FROM_DOCUMENTS.lastIndex = 0;
    const storageStripped = body.replace(/\.storage\s*\.from\(\s*['"]documents['"]\s*\)/g, '');
    if (!/\.from\(\s*['"]documents['"]\s*\)/.test(storageStripped)) continue;

    for (const m of storageStripped.matchAll(CATEGORY_LITERAL)) {
      const value = m[1];
      if (SNAKE.test(value)) continue;
      const rel = path.relative(startDir, file).split(path.sep).join('/');
      hits.push(`${rel}: category: "${value}"`);
    }
  }
}

if (hits.length > 0) {
  console.error('\nDocument category write uses a Title Case / non-snake_case literal:');
  for (const h of hits) console.error(`  ${h}`);
  console.error(
    '\nStore the lookup key (application_supporting_doc), never the label.\n' +
      'Source keys from lib/documents/categories.ts.\n',
  );
  process.exit(1);
}

console.log('  Document category writes: no Title Case literals.');
