/**
 * backup-storage.mjs
 *
 * Downloads every file out of Supabase Storage to your computer.
 *
 * The table backup (backup-supabase.mjs) copies the ROWS. It does not copy the
 * photos, pedigree PDFs, signed contracts or uploaded IDs — those live in
 * Storage buckets, which are a separate system. Restoring rows without these
 * gives you a database full of links pointing at files that no longer exist.
 *
 * Run from the project root:
 *   node scripts/backup-storage.mjs
 *
 * Writes to backups-storage/<timestamp>/<bucket>/<original path>.
 * Needs SUPABASE_SERVICE_ROLE_KEY — private buckets cannot be read otherwise.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

function loadEnv() {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', 'diedericks-dobermanns', '.env.local'),
    path.join(__dirname, '..', 'diedericks-dobermanns', '.env'),
    path.join(__dirname, '..', 'diedericksdobermann-web', '.env.local'),
    path.join(__dirname, '..', 'diedericksdobermann-web', '.env'),
    path.join(__dirname, '..', '.env.local'),
  ];
  const tried = [];
  for (const p of candidates) {
    let raw;
    try {
      raw = readFileSync(p, 'utf-8');
    } catch {
      tried.push(`  not found  ${p}`);
      continue;
    }
    const env = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    const url = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    if (url && env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`  Using env: ${p}`);
      return env;
    }
    tried.push(`  incomplete ${p}`);
  }
  console.error('\nNo env file with a Supabase URL and SUPABASE_SERVICE_ROLE_KEY.');
  for (const t of tried) console.error(t);
  process.exit(1);
}

const env = loadEnv();
const SUPABASE_URL =
  env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Storage list() is one folder at a time, so walk the tree. */
async function listAll(bucket, prefix = '') {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      // A folder has no id; a file does.
      if (item.id === null || item.id === undefined) out.push(...(await listAll(bucket, full)));
      else out.push({ path: full, size: Number(item.metadata?.size ?? 0) });
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

function human(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${bytes} B`;
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outRoot = path.join(PROJECT_ROOT, 'backups-storage', stamp);
  mkdirSync(outRoot, { recursive: true });

  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Could not list buckets: ${error.message}`);
  console.log(`\nFound ${buckets.length} buckets. Writing to backups-storage/${stamp}/\n`);

  const manifest = { created_at: new Date().toISOString(), buckets: {} };
  let grandTotal = 0;
  let grandBytes = 0;
  const failures = [];

  for (const bucket of buckets) {
    const files = await listAll(bucket.name);
    if (files.length === 0) {
      console.log(`  ${bucket.name.padEnd(22)} empty`);
      manifest.buckets[bucket.name] = { files: 0, bytes: 0, public: bucket.public };
      continue;
    }
    let done = 0;
    let bytes = 0;
    for (const file of files) {
      const dest = path.join(outRoot, bucket.name, ...file.path.split('/'));
      if (existsSync(dest)) {
        done += 1;
        bytes += file.size;
        continue; // resume-friendly: never re-download
      }
      mkdirSync(path.dirname(dest), { recursive: true });

      // A dropped connection part-way through 900 files must not end the run.
      // Retry a few times with a growing pause, then record it and carry on.
      let saved = false;
      let lastProblem = 'unknown';
      for (let attempt = 1; attempt <= 4 && !saved; attempt += 1) {
        try {
          const { data, error: dlErr } = await supabase.storage
            .from(bucket.name)
            .download(file.path);
          if (dlErr) throw new Error(dlErr.message);
          writeFileSync(dest, Buffer.from(await data.arrayBuffer()));
          saved = true;
        } catch (e) {
          lastProblem = e?.cause?.code || e?.message || String(e);
          if (attempt < 4) {
            console.log(`     retrying ${file.path} (${lastProblem}) — attempt ${attempt + 1}`);
            await new Promise((r) => setTimeout(r, attempt * 2000));
          }
        }
      }
      if (!saved) {
        failures.push(`${bucket.name}/${file.path}: ${lastProblem}`);
        continue;
      }

      done += 1;
      bytes += file.size;
      if (done % 25 === 0) console.log(`  ${bucket.name.padEnd(22)} ${done}/${files.length}…`);
    }
    console.log(`  ${bucket.name.padEnd(22)} ${done}/${files.length} files, ${human(bytes)}`);
    manifest.buckets[bucket.name] = { files: done, bytes, public: bucket.public };
    grandTotal += done;
    grandBytes += bytes;
  }

  writeFileSync(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\nDone. ${grandTotal} files, ${human(grandBytes)}.`);
  console.log(`Saved to: backups-storage/${stamp}/`);
  if (failures.length) {
    console.error(`\n${failures.length} FILE(S) COULD NOT BE DOWNLOADED:`);
    for (const f of failures) console.error(`  ${f}`);
    console.error('\nDo not treat this backup as complete.');
    process.exit(1);
  }
  console.log('\nThe folder layout matches the buckets exactly, so a restore is a');
  console.log('straight re-upload of each bucket folder.');
}

main().catch((e) => {
  console.error('Storage backup failed:', e);
  process.exit(1);
});
