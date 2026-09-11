#!/usr/bin/env node
/**
 * Read-only: what is on disk under Dobermann Photo's vs documents.original_filename.
 * Uploads nothing. Changes nothing. Never infers the dog from the folder name.
 *
 *   node scripts/check-dog-documents.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readdirSync, statSync } from 'fs';
import path from 'path';

import { loadSupabaseEnv } from './load-supabase-env.mjs';

const ROOT = String.raw`C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's`;
const EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    console.error(`Could not read ${dir}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function keyOf(name) {
  return name.trim().toLowerCase();
}

const env = loadSupabaseEnv();
const url = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from('documents')
  .select('id, original_filename, entity_type, entity_id')
  .not('original_filename', 'is', null);
if (error) {
  console.error(error.message);
  process.exit(1);
}

const byName = new Map();
for (const row of data ?? []) {
  const k = keyOf(row.original_filename ?? '');
  if (!k) continue;
  const list = byName.get(k) ?? [];
  list.push(row);
  byName.set(k, list);
}

const diskFiles = walk(ROOT);
const byBasename = new Map();
for (const full of diskFiles) {
  const base = path.basename(full);
  const k = keyOf(base);
  const list = byBasename.get(k) ?? [];
  list.push(full);
  byBasename.set(k, list);
}

const duplicateNames = [...byBasename.entries()].filter(([, paths]) => paths.length > 1);

function classify(full) {
  const k = keyOf(path.basename(full));
  return (byName.get(k) ?? []).length > 0;
}

const pdfs = diskFiles.filter((f) => path.extname(f).toLowerCase() === '.pdf');
const images = diskFiles.filter((f) => path.extname(f).toLowerCase() !== '.pdf');
const pdfIn = pdfs.filter(classify);
const pdfOut = pdfs.filter((f) => !classify(f));
const imgIn = images.filter(classify);
const imgOut = images.filter((f) => !classify(f));

const diskKeys = new Set([...byBasename.keys()]);
const inSystemNotOnDisk = (data ?? []).filter((row) => {
  const k = keyOf(row.original_filename ?? '');
  return k && !diskKeys.has(k);
});

console.log('\nDog documents: disk vs system');
console.log(`  Scanned: ${ROOT}`);
console.log(`  Disk files (.pdf/.jpg/.jpeg/.png): ${diskFiles.length}  (${pdfs.length} PDF, ${images.length} image)`);
console.log(`  documents rows with original_filename: ${(data ?? []).length}`);

if (duplicateNames.length > 0) {
  console.log('\n⚠ Same filename in more than one folder — not treated as one document:');
  for (const [name, paths] of duplicateNames) {
    console.log(`  ${name}`);
    for (const p of paths) console.log(`    ${p}`);
  }
}

console.log(`\nIn the system: ${pdfIn.length + imgIn.length} file(s) on disk have a matching original_filename.`);
console.log(`  PDFs: ${pdfIn.length}    images: ${imgIn.length}`);

console.log(`\nOn disk, not in the system — PDFs: ${pdfOut.length}`);
for (const p of pdfOut) console.log(`  ${p}`);
console.log(`On disk, not in the system — images: ${imgOut.length} (photos in this folder are not documents; not listed)`);

console.log(`\nIn the system, not on disk: ${inSystemNotOnDisk.length} (uploads from elsewhere are expected)`);
if (inSystemNotOnDisk.length > 0 && inSystemNotOnDisk.length <= 20) {
  for (const row of inSystemNotOnDisk) {
    console.log(`  ${row.original_filename}  (${row.entity_type}/${row.entity_id})`);
  }
} else if (inSystemNotOnDisk.length > 20) {
  console.log(`  (${inSystemNotOnDisk.length} rows — not listed)`);
}

console.log('');
