/**
 * backup-supabase.mjs
 *
 * Full data backup of the Diedericks Dobermanns Supabase project.
 * Dumps every public table to timestamped JSON files under backups/<timestamp>/,
 * plus a manifest.json with row counts and a combined all-tables.json.
 *
 * This backs up DATA. The SCHEMA is versioned in supabase/migrations/*.sql (in git),
 * and uploaded FILES live in Supabase Storage buckets. Together those three cover a
 * full restore.
 *
 * Run from the project root:
 *   node scripts/backup-supabase.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * diedericks-dobermanns/.env.local (same file the import script uses).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 10 Sep 2026 — the table list is now discovered from the database at runtime.
 * It used to be a hard-coded array of 68 names. The database had grown to ~120
 * tables, so a restore from that backup would have silently lost pedigrees,
 * quotes, contract acknowledgements, employee records, the equipment catalogue
 * and every application child row. A hard-coded list of things that grows is a
 * backup that quietly stops being a backup.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadSupabaseEnv } from './load-supabase-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

const env = loadSupabaseEnv();
const SUPABASE_URL =
  env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/**
 * Ask PostgREST what exists. The REST root returns an OpenAPI document whose
 * `definitions` keys are every table and view exposed on the public schema.
 * No hard-coded list, so a new table is backed up the day it is created.
 */
async function discoverTables() {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`Could not read the API schema: ${res.status} ${res.statusText}`);
  const spec = await res.json();
  const names = Object.keys(spec.definitions ?? spec.components?.schemas ?? {});
  if (names.length === 0) throw new Error('The API schema returned no tables.');
  return names.filter((n) => !n.startsWith('(') && !n.includes('.')).sort();
}

/** Views cannot be restored by inserting rows — they are derived. Skip them. */
async function isView(name) {
  const { error } = await supabase.from(name).select('*', { head: true, count: 'exact' }).limit(0);
  return error ? true : false;
}

async function fetchAll(table) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(PROJECT_ROOT, 'backups', stamp);
  mkdirSync(outDir, { recursive: true });

  console.log('\n  Discovering tables from the live database…');
  const tables = await discoverTables();
  console.log(`  Found ${tables.length}.\n`);
  console.log(`Backing up → backups/${stamp}/\n`);

  const manifest = {
    project: SUPABASE_URL,
    created_at: new Date().toISOString(),
    table_count: tables.length,
    discovered_dynamically: true,
    tables: {},
  };
  const combined = {};
  let totalRows = 0;
  let empty = 0;
  const failed = [];

  for (const table of tables) {
    try {
      const rows = await fetchAll(table);
      writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
      manifest.tables[table] = rows.length;
      combined[table] = rows;
      totalRows += rows.length;
      if (rows.length) console.log(`  ok  ${table.padEnd(32)} ${rows.length} rows`);
      else empty += 1;
    } catch (e) {
      failed.push(table);
      manifest.tables[table] = `ERROR: ${e.message}`;
      console.warn(`  --  ${table.padEnd(32)} ${e.message}`);
    }
  }

  writeFileSync(path.join(outDir, 'all-tables.json'), JSON.stringify(combined, null, 2));
  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\nDone. ${totalRows} rows across ${tables.length - failed.length} tables.`);
  console.log(`${empty} tables were empty (still written, as empty arrays).`);
  if (failed.length) {
    console.log(`\nCOULD NOT READ ${failed.length}: ${failed.join(', ')}`);
    console.log('Check these before trusting this backup.');
  }
  console.log(`\nSaved to: backups/${stamp}/`);

  // A backup you have not counted is a backup you have not taken.
  const critical = [
    'dogs', 'litters', 'contacts', 'applications', 'application_dog_requests',
    'invoices', 'invoice_payments', 'quotes', 'quote_items', 'contracts',
    'contract_acknowledgements', 'documents', 'pedigree_ancestors', 'waiting_list',
    'reservations', 'weight_logs', 'employees', 'payslips', 'catalogue_items',
  ];
  console.log('\nCritical table check:');
  let missing = 0;
  for (const t of critical) {
    const n = manifest.tables[t];
    if (n === undefined) {
      console.log(`  MISSING  ${t} — not present in this backup`);
      missing += 1;
    } else if (typeof n === 'string') {
      console.log(`  FAILED   ${t} — ${n}`);
      missing += 1;
    } else {
      console.log(`  ok       ${t.padEnd(30)} ${n}`);
    }
  }
  if (missing > 0) {
    console.error(`\n${missing} critical table(s) missing or failed. DO NOT trust this backup.`);
    process.exit(1);
  }

  console.log('\nNOTE: uploaded images, videos and PDFs live in Supabase Storage, not in');
  console.log('these tables. Back those up separately: Supabase dashboard → Storage →');
  console.log('each bucket → download. The buckets are: documents, equipment, dog-media,');
  console.log('gallery, contracts. Check the dashboard for the current list.');
}

main().catch((e) => {
  console.error('Backup failed:', e);
  process.exit(1);
});
