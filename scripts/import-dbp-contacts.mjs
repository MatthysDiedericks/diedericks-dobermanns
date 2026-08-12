/**
 * import-dbp-contacts.mjs
 *
 * Imports the DogBreederPro contact export into public.contacts.
 *
 * Run from the project root:
 *   node scripts/import-dbp-contacts.mjs --dry-run    # report only, writes nothing
 *   node scripts/import-dbp-contacts.mjs              # import
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, and the
 * export at Downloads/contact_list_2026-08-11.xlsx (override with --file=...).
 *
 * Safe to re-run: every row is keyed on source_ref (the DBP row number), so a
 * second run updates rather than duplicates.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Env ─────────────────────────────────────────────────────────────────────
function loadEnv() {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'diedericksdobermann-web', '.env.local'),
    path.join(process.cwd(), 'diedericks-dobermanns', '.env.local'),
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', 'diedericksdobermann-web', '.env.local'),
    path.join(__dirname, '..', 'diedericks-dobermanns', '.env.local'),
    path.join(__dirname, '.env.local'),
  ];
  for (const envPath of candidates) {
    try {
      const env = {};
      // Strip BOM if PowerShell / editors wrote one.
      const text = readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '');
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
      const url =
        env.SUPABASE_URL ||
        env.NEXT_PUBLIC_SUPABASE_URL ||
        env.EXPO_PUBLIC_SUPABASE_URL;
      if (url) {
        console.log(`  env: ${envPath}`);
        return { ...env, SUPABASE_URL: url };
      }
    } catch { /* next */ }
  }
  console.error('No .env.local with SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL found.');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const fileArg = args.find((a) => a.startsWith('--file='));
const SRC = fileArg
  ? fileArg.slice('--file='.length)
  : path.join(os.homedir(), 'Downloads', 'contact_list_2026-08-11.xlsx');

const env = loadEnv();
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing from env.');
  process.exit(1);
}
const supabase = createClient(
  env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ─── Read the export ─────────────────────────────────────────────────────────
let XLSX;
try {
  XLSX = require('xlsx');
} catch {
  console.error('Missing dependency. From the project root run:\n  npm install xlsx --prefix scripts');
  process.exit(1);
}

const wb = XLSX.readFile(SRC);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
console.log(`  source: ${SRC}\n  rows  : ${rows.length}\n`);

const S = (v) => String(v ?? '').trim();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

// Businesses and staff are tagged, not dropped. Losing a vet's number because
// it was not a buyer would be its own kind of data loss.
const SUPPLIER = ['animal clinic', 'state vet', 'farm services', 'vet 66'];
const BREEDER  = ['betelges', 'raconti', 'de zelig'];
const STAFF    = ['felicia03@rocketmail.com', 'matt@bastionsecurity.org', 'diedericksdobermannssa@gmail.com'];

const cleanPhone = (p) => (S(p).replace(/[^\d+]/g, '') || null);

function classify(name, email, kennel) {
  const n = name.toLowerCase(), k = S(kennel).toLowerCase();
  if (email && STAFF.includes(email)) return 'staff';
  if (SUPPLIER.some((w) => n.includes(w))) return 'supplier';
  if (BREEDER.some((w) => n.includes(w) || k.includes(w))) return 'breeder';
  if (n.includes('matthys') && n.includes('diedericks')) return 'staff';
  return 'client';
}

const recs = [];
rows.forEach((r, i) => {
  const name = `${S(r['First Name'])} ${S(r['Last Name'])}`.replace(/\s+/g, ' ').trim();
  const notes = [];

  // A handful of DBP rows have a phone number typed into the name field.
  const nameIsPhone = /^[+\d][\d\s+-]{6,}$/.test(name);

  let email = S(r['Email']).toLowerCase();
  if (email && !EMAIL_RE.test(email)) {
    // Never repair an email by guessing. A wrong address sends someone's
    // contract to a stranger. Keep the raw value and flag it for a human.
    notes.push(`NEEDS CHECKING — email in DogBreederPro was: ${S(r['Email'])}`);
    email = null;
  }
  if (!email) email = null;

  const address = (S(r['Street Address Complete']) || S(r['Postal Address Complete']) || '')
    .replace(/\n{2,}/g, '\n').trim() || null;

  // The Country column disagrees with the address on dozens of rows —
  // "Swaziland" is DogBreederPro's default. The address is the better source.
  const country = S(r['Street Address Country']) || S(r['Postal Address Country']) || S(r['Country']) || null;

  if (S(r['Notes']))            notes.push(`DBP note: ${S(r['Notes'])}`);
  if (S(r['Title']))            notes.push(`Title: ${S(r['Title'])}`);
  if (S(r['Landline Number']))  notes.push(`Landline: ${S(r['Landline Number'])}`);
  if (nameIsPhone)              notes.push('DogBreederPro row had a phone number in the name field.');

  recs.push({
    full_name: nameIsPhone ? 'Unnamed contact' : (name || 'Unnamed contact'),
    email,
    phone: nameIsPhone ? cleanPhone(name) : cleanPhone(r['Mobile Number']),
    whatsapp_number: cleanPhone(r['Mobile Number']),
    address,
    city: S(r['Street Address City']) || null,
    country,
    company: S(r['Kennel Name']) || null,
    contact_type: classify(name, email, r['Kennel Name']),
    source: 'dogbreederpro',
    notes: notes.join('\n') || null,
    tags: ['dbp-import'],
    _row: i + 2,
  });
});

// ─── Merge: same email or same phone is the same person ──────────────────────
const richness = (r) => ['full_name', 'email', 'phone', 'address', 'city', 'country']
  .filter((f) => r[f]).length;

const groups = new Map();
for (const r of recs) {
  const key = r.email ? `e:${r.email}` : r.phone ? `p:${r.phone}` : `n:${r.full_name.toLowerCase()}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const merged = [];
const mergeLog = [];
for (const [, g] of groups) {
  if (g.length === 1) { merged.push(g[0]); continue; }
  g.sort((a, b) => richness(b) - richness(a));
  const best = { ...g[0] };

  // Richness alone picks the row with the most filled columns, which can be the
  // one whose name field held a phone number. A real name beats a placeholder
  // regardless of how complete the rest of the row is.
  if (best.full_name === 'Unnamed contact') {
    const named = g.find((x) => x.full_name !== 'Unnamed contact');
    if (named) best.full_name = named.full_name;
  }

  const extra = [];
  for (const other of g.slice(1)) {
    for (const f of ['email', 'phone', 'address', 'city', 'country', 'company', 'whatsapp_number']) {
      if (!best[f] && other[f]) best[f] = other[f];
    }
    // Two different email addresses on one person is not a merge conflict to
    // resolve silently — one of them is where their contract will be sent.
    if (other.email && best.email && other.email !== best.email) {
      extra.push(`NEEDS CHECKING — a merged DogBreederPro row had a different email: ${other.email}`);
    }
    if (other.full_name && other.full_name.toLowerCase() !== best.full_name.toLowerCase()) {
      extra.push(`Also recorded in DogBreederPro as: ${other.full_name}`);
    }
    if (other.notes) extra.push(other.notes);
  }
  if (extra.length) best.notes = [best.notes, ...extra].filter(Boolean).join('\n');
  best.source_ref = g.map((x) => x._row).join(',');
  merged.push(best);
  mergeLog.push([best.full_name, g.map((x) => x.full_name)]);
}
for (const m of merged) if (!m.source_ref) m.source_ref = String(m._row);

// ─── Report ──────────────────────────────────────────────────────────────────
const byType = merged.reduce((a, r) => ({ ...a, [r.contact_type]: (a[r.contact_type] || 0) + 1 }), {});
console.log(`  after merge : ${merged.length}  (${recs.length - merged.length} duplicates folded in)`);
console.log(`  by type     :`, byType);
console.log(`  with email  : ${merged.filter((r) => r.email).length}`);
console.log(`  with phone  : ${merged.filter((r) => r.phone).length}`);
console.log(`  with address: ${merged.filter((r) => r.address).length}`);

if (mergeLog.length) {
  console.log('\n  merged:');
  for (const [keep, all] of mergeLog) console.log(`    ${keep}  <=  ${all.join(' | ')}`);
}

const flagged = merged.filter((r) => r.notes?.includes('NEEDS CHECKING'));
if (flagged.length) {
  console.log(`\n  ${flagged.length} contacts need an email checked by hand:`);
  for (const r of flagged) console.log(`    ${r.full_name}: ${r.notes.split('\n')[0]}`);
}

if (DRY) { console.log('\n  DRY RUN — nothing written.\n'); process.exit(0); }

// ─── Write ───────────────────────────────────────────────────────────────────
// Auditing is paused for the import: logging 238 inserts records "system added
// 238 rows", which buries the changes that matter under noise nobody will read.
// resume_audit() writes one row explaining the gap.
console.log('\n  pausing audit…');
await supabase.rpc('pause_audit', { p_reason: 'DogBreederPro contact import' });

/**
 * Upsert by source_ref without requiring a UNIQUE constraint (the live DB
 * has the column but may not yet have contacts_source_ref_uidx). Prefer
 * onConflict when the index exists; fall back to select → update/insert.
 */
async function upsertBatch(batch) {
  const viaConflict = await supabase
    .from('contacts')
    .upsert(batch, { onConflict: 'source_ref', ignoreDuplicates: false });
  if (!viaConflict.error) return null;
  if (!/ON CONFLICT|unique or exclusion constraint/i.test(viaConflict.error.message)) {
    return viaConflict.error.message;
  }

  const refs = batch.map((r) => r.source_ref).filter(Boolean);
  const { data: existing, error: selErr } = await supabase
    .from('contacts')
    .select('id, source_ref')
    .in('source_ref', refs);
  if (selErr) return selErr.message;

  const idByRef = new Map((existing ?? []).map((r) => [r.source_ref, r.id]));
  const toInsert = [];
  const toUpdate = [];
  for (const row of batch) {
    const id = idByRef.get(row.source_ref);
    if (id) toUpdate.push({ id, ...row });
    else toInsert.push(row);
  }

  if (toInsert.length) {
    const { error } = await supabase.from('contacts').insert(toInsert);
    if (error) return error.message;
  }
  for (const row of toUpdate) {
    const { id, ...rest } = row;
    const { error } = await supabase.from('contacts').update(rest).eq('id', id);
    if (error) return error.message;
  }
  return null;
}

let ok = 0, failed = 0;
try {
  for (let i = 0; i < merged.length; i += 50) {
    const batch = merged.slice(i, i + 50).map(({ _row, ...rest }) => rest);
    const errMsg = await upsertBatch(batch);
    if (errMsg) {
      console.error(`  batch ${i / 50 + 1} failed:`, errMsg);
      failed += batch.length;
    } else {
      ok += batch.length;
      process.stdout.write(`  imported ${ok}/${merged.length}\r`);
    }
  }
} finally {
  // Always resume, even if the import threw — leaving auditing off silently
  // would be far worse than a failed import.
  const { data } = await supabase.rpc('resume_audit');
  console.log(`\n  ${data ?? 'audit resumed'}`);
}

console.log(`\n  done: ${ok} imported, ${failed} failed\n`);
if (failed === 0) {
  console.log('  Tip: apply migration 0061_contacts_source_ref_unique.sql so future');
  console.log('  runs can use native ON CONFLICT upserts.\n');
}
