/**
 * backup-supabase.mjs
 *
 * Full data backup of the Diedericks Dobermanns Supabase project.
 * Dumps every public table to timestamped JSON files under backups/<timestamp>/,
 * plus a single manifest.json with row counts and a combined all-tables.json.
 *
 * This backs up DATA. The SCHEMA is already versioned in supabase/migrations/*.sql
 * (in git), and uploaded FILES live in Supabase Storage buckets (see note at bottom).
 * Together those three cover a full restore.
 *
 * Run from the project root:
 *   node scripts/backup-supabase.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * diedericks-dobermanns/.env.local (same file the import script uses).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// ─── Load env (same resolution order as import-historical-finance.mjs) ────────
function loadEnv() {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', 'diedericks-dobermanns', '.env.local'),
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '.env.local'),
  ];
  for (const envPath of candidates) {
    try {
      const lines = readFileSync(envPath, 'utf-8').split('\n');
      const env = {};
      for (const line of lines) {
        const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
      if (env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL) {
        console.log(`  Using env: ${envPath}`);
        return env;
      }
    } catch {
      /* try next */
    }
  }
  console.error('Could not find .env.local with SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Every public table in the project. Keep this list in sync if new tables are added.
const TABLES = [
  'achievements', 'app_settings', 'applications', 'breed_heat_defaults',
  'broadcast_messages', 'budgets', 'calendar_events', 'client_dog_notes',
  'client_group_members', 'client_groups', 'contact_interactions', 'contacts',
  'contract_templates', 'contracts', 'deworming_records', 'document_access_log',
  'documents', 'dog_media', 'dog_shows', 'dog_temperament_scores', 'dogs',
  'enquiries', 'expense_categories', 'expenses', 'faq', 'gallery_items',
  'health_products', 'health_tests', 'heat_cycles', 'historical_income',
  'invoice_items', 'invoice_payments', 'invoices', 'kennel_documents',
  'litter_media', 'litter_todos', 'litter_transaction_items', 'litter_transactions',
  'litters', 'medical_conditions', 'notifications_log', 'pairings',
  'payment_accounts', 'payment_orders', 'project_backups', 'puppy_health_records',
  'puppy_sharing', 'reservations', 'testimonials', 'todo_items',
  'training_availability', 'training_booking_media', 'training_bookings',
  'training_logs', 'training_session_types', 'training_video_categories',
  'training_videos', 'users', 'vaccinations', 'vet_practices', 'vet_visits',
  'video_bundle_purchases', 'video_bundles', 'video_watch_progress',
  'waiting_list', 'waiting_list_history', 'waiting_list_types', 'weight_logs',
];

async function fetchAll(table) {
  // Page through in case any table grows beyond the default 1000-row cap.
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
  console.log(`\nBacking up ${TABLES.length} tables → backups/${stamp}/\n`);

  const manifest = { project: SUPABASE_URL, created_at: new Date().toISOString(), tables: {} };
  const combined = {};
  let totalRows = 0;
  const failed = [];

  for (const table of TABLES) {
    try {
      const rows = await fetchAll(table);
      writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
      manifest.tables[table] = rows.length;
      combined[table] = rows;
      totalRows += rows.length;
      if (rows.length) console.log(`  ✓ ${table.padEnd(28)} ${rows.length} rows`);
    } catch (e) {
      failed.push(table);
      manifest.tables[table] = `ERROR: ${e.message}`;
      console.warn(`  ✗ ${table.padEnd(28)} ${e.message}`);
    }
  }

  writeFileSync(path.join(outDir, 'all-tables.json'), JSON.stringify(combined, null, 2));
  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\nDone. ${totalRows} rows across ${TABLES.length - failed.length} tables.`);
  if (failed.length) console.log(`Failed: ${failed.join(', ')}`);
  console.log(`\nSaved to: backups/${stamp}/`);
  console.log('\nNOTE: uploaded images/videos live in Supabase Storage, not these tables.');
  console.log('To back those up too, download the storage buckets from the Supabase');
  console.log('dashboard (Storage → each bucket → download), or add a storage-dump step.');
}

main().catch((e) => {
  console.error('Backup failed:', e);
  process.exit(1);
});
