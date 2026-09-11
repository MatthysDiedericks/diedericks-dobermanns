/**
 * restore-supabase.mjs
 *
 * Loads a backup produced by backup-supabase.mjs back into a Supabase project.
 *
 * A backup you have never restored is not a backup — it is a hope. This script
 * exists so the restore path is a command you have run before, not something
 * you work out for the first time during an emergency.
 *
 *   node scripts/restore-supabase.mjs --from backups/<timestamp>            (dry run)
 *   node scripts/restore-supabase.mjs --from backups/<timestamp> --write    (for real)
 *
 * ORDER: tables are not restored in a fixed order. Rows that fail because the
 * row they point at does not exist yet are retried on the next pass, and the
 * script keeps passing until nothing improves. That way it works no matter how
 * the tables relate to each other, and it cannot go stale as the schema grows.
 *
 * SAFETY
 *  - Dry run by default. Nothing is written without --write.
 *  - Refuses to run against a project that already holds data, unless you pass
 *    --force. Restoring on top of a live database is how you make things worse.
 *  - Upserts on the primary key, so running it twice is harmless.
 *
 * BEFORE YOU RUN THIS: the tables must already exist. Create them first by
 * applying supabase/migrations/*.sql in numerical order. This script restores
 * DATA only, never structure.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const FORCE = argv.includes('--force');
const fromIdx = argv.indexOf('--from');
const FROM = fromIdx !== -1 ? argv[fromIdx + 1] : null;

if (!FROM) {
  console.error('\nUsage: node scripts/restore-supabase.mjs --from backups/<timestamp> [--write] [--force]\n');
  process.exit(1);
}
const BACKUP_DIR = path.resolve(process.cwd(), FROM);

function loadEnv() {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', 'diedericks-dobermanns', '.env.local'),
    path.join(__dirname, '..', 'diedericks-dobermanns', '.env'),
    path.join(__dirname, '..', 'diedericksdobermann-web', '.env.local'),
    path.join(__dirname, '..', 'diedericksdobermann-web', '.env'),
  ];
  for (const p of candidates) {
    try {
      const env = {};
      for (const line of readFileSync(p, 'utf-8').split('\n')) {
        const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
      const url = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
      if (url && env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log(`  Using env: ${p}`);
        return env;
      }
    } catch {
      /* next */
    }
  }
  console.error('No env file with a Supabase URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const env = loadEnv();
const SUPABASE_URL =
  env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function readBackup() {
  const files = readdirSync(BACKUP_DIR).filter(
    (f) => f.endsWith('.json') && f !== 'manifest.json' && f !== 'all-tables.json',
  );
  const data = {};
  for (const f of files) {
    const rows = JSON.parse(readFileSync(path.join(BACKUP_DIR, f), 'utf-8'));
    if (Array.isArray(rows) && rows.length > 0) data[f.replace(/\.json$/, '')] = rows;
  }
  return data;
}

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

async function main() {
  console.log(`\n  Target : ${SUPABASE_URL}`);
  console.log(`  Backup : ${BACKUP_DIR}`);
  console.log(`  Mode   : ${WRITE ? 'WRITE — this will change data' : 'dry run (nothing written)'}\n`);

  const data = readBackup();
  const tables = Object.keys(data).sort();
  const totalRows = tables.reduce((s, t) => s + data[t].length, 0);
  if (tables.length === 0) {
    console.error('That backup folder has no table files with rows in it.');
    process.exit(1);
  }
  console.log(`  ${tables.length} tables, ${totalRows} rows in the backup.\n`);

  // Refuse to restore over a database that already has content.
  const probes = ['dogs', 'contacts', 'invoices', 'applications'];
  let existing = 0;
  for (const t of probes) {
    const { count } = await supabase.from(t).select('*', { head: true, count: 'exact' });
    existing += count ?? 0;
  }
  if (existing > 0 && !FORCE) {
    console.error(`  STOP — the target already holds ${existing} rows across ${probes.join(', ')}.`);
    console.error('  Restoring on top of live data can overwrite good records with old ones.');
    console.error('  If you are certain, re-run with --force.\n');
    process.exit(1);
  }

  if (!WRITE) {
    for (const t of tables) console.log(`  would restore  ${t.padEnd(32)} ${data[t].length} rows`);
    console.log('\n  Dry run only. Add --write to actually restore.\n');
    return;
  }

  // Pass repeatedly. Rows whose parent does not exist yet fail on this pass and
  // succeed on a later one. Stop when a whole pass changes nothing.
  let pending = new Map(tables.map((t) => [t, data[t]]));
  const done = new Map();
  let pass = 0;

  while (pending.size > 0) {
    pass += 1;
    let progressed = false;
    const stillPending = new Map();
    console.log(`  --- pass ${pass} (${pending.size} tables left) ---`);

    for (const [table, rows] of pending) {
      let inserted = 0;
      let lastError = null;
      for (const batch of chunk(rows, 500)) {
        const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
        if (error) {
          lastError = error.message;
          break;
        }
        inserted += batch.length;
      }
      if (inserted === rows.length) {
        console.log(`    ok  ${table.padEnd(32)} ${inserted} rows`);
        done.set(table, inserted);
        progressed = true;
      } else {
        stillPending.set(table, rows);
        if (pass > 1) console.log(`    --  ${table.padEnd(32)} ${lastError}`);
      }
    }

    pending = stillPending;
    if (!progressed) break;
  }

  console.log(`\n  Restored ${done.size} tables in ${pass} pass(es).`);
  if (pending.size > 0) {
    console.error(`\n  ${pending.size} TABLE(S) COULD NOT BE RESTORED:`);
    for (const [t, rows] of pending) console.error(`    ${t} (${rows.length} rows)`);
    console.error('\n  Usually this means the tables do not exist yet — apply');
    console.error('  supabase/migrations/*.sql in order first — or a row points at');
    console.error('  something that was never in the backup. Check before carrying on.\n');
    process.exit(1);
  }

  console.log('\n  Data restored. Two things this did NOT do:');
  console.log('   1. Storage files — re-upload backups-storage/<timestamp>/<bucket>/ per bucket.');
  console.log('   2. Logins — auth users are separate; people may need new portal invites.\n');
}

main().catch((e) => {
  console.error('Restore failed:', e);
  process.exit(1);
});
