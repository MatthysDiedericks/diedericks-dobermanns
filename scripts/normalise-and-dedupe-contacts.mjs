/**
 * normalise-and-dedupe-contacts.mjs
 *
 *   node scripts/normalise-and-dedupe-contacts.mjs --dry-run
 *   node scripts/normalise-and-dedupe-contacts.mjs
 *
 * Does not modify import-dbp-contacts.mjs.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { applyDedupeWrites } from './lib/contactDedupeWrite.mjs';
import { detectDuplicates } from './lib/contactUnionFind.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');

function loadEnv() {
  for (const envPath of [
    path.join(process.cwd(), 'diedericksdobermann-web', '.env.local'),
    path.join(process.cwd(), '.env.local'),
    path.join(__dirname, '..', 'diedericksdobermann-web', '.env.local'),
  ]) {
    try {
      const env = {};
      for (const line of readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
        const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
      const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL;
      if (url && env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log(`  env: ${envPath}`);
        return { ...env, SUPABASE_URL: url };
      }
    } catch { /* next */ }
  }
  console.error('No .env.local with URL + SERVICE_ROLE_KEY');
  process.exit(1);
}

async function fetchAllContacts(sb) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from('contacts').select('*').range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

const env = loadEnv();
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

console.log(DRY ? '\n  DRY RUN — no writes\n' : '\n  LIVE RUN\n');

const all = await fetchAllContacts(sb);
const active = all.filter((c) => !c.merged_into_contact_id);
console.log(`  contacts: ${all.length} total, ${active.length} active`);

const plan = detectDuplicates(active);
console.log(`  phone patches : ${plan.phonePatches.length}`);
console.log(`  unresolvable  : ${plan.unresolvable.length}`);
for (const u of plan.unresolvable.slice(0, 40)) {
  console.log(`    ${u.name}: ${u.phone}`);
}

console.log(`\n  auto-merges : ${plan.autoMerges.length}`);
for (const m of plan.autoMerges) {
  const loser = m.survivor.id === m.a.id ? m.b : m.a;
  console.log(
    `    MERGE ${m.survivor.full_name} ← ${loser.full_name}  (${m.reason}: ${m.detail})`,
  );
}
console.log(`  queue medium: ${plan.queueMedium.length}`);
for (const q of plan.queueMedium) {
  console.log(`    REVIEW ${q.a.full_name} / ${q.b.full_name}  (${q.reason}: ${q.detail})`);
}
console.log(`  queue low   : ${plan.queueLow.length}`);

if (DRY) {
  console.log('\n  DRY RUN complete — nothing written.\n');
  process.exit(0);
}

console.log('\n  pausing audit…');
await sb.rpc('pause_audit', { p_reason: 'contact de-duplication' });

let normalised = 0;
let merged = 0;
let queued = 0;
try {
  ({ normalised, merged, queued } = await applyDedupeWrites(sb, plan));
} finally {
  const { data } = await sb.rpc('resume_audit');
  console.log(`\n  ${data ?? 'audit resumed'}`);
}

const { count: activeCount } = await sb
  .from('contacts')
  .select('id', { count: 'exact', head: true })
  .is('merged_into_contact_id', null);
const { count: totalCount } = await sb
  .from('contacts')
  .select('id', { count: 'exact', head: true });

console.log(`\n  done:`);
console.log(`    normalised : ${normalised}`);
console.log(`    auto-merged: ${merged}`);
console.log(`    queued     : ${queued}`);
console.log(`    unresolvable phones: ${plan.unresolvable.length}`);
console.log(`    active / total: ${activeCount} / ${totalCount}\n`);
