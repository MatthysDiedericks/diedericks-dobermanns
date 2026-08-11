/**
 * link-dog-owners.mjs
 *
 * Links sold dogs to contacts using buyer names from DogBreederPro naming.
 * Exact + normalised matches only. Ambiguous / weak matches go to a review file.
 *
 *   node scripts/link-dog-owners.mjs --dry-run
 *   node scripts/link-dog-owners.mjs
 *
 * Does not touch import-dbp-contacts.mjs. Does not send any messages.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'diedericksdobermann-web', '.env.local'),
    path.join(process.cwd(), 'diedericks-dobermanns', '.env.local'),
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', 'diedericksdobermann-web', '.env.local'),
    path.join(__dirname, '..', 'diedericks-dobermanns', '.env.local'),
  ];
  for (const envPath of candidates) {
    try {
      const env = {};
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
    } catch {
      /* next */
    }
  }
  console.error('No .env.local with SUPABASE_URL found.');
  process.exit(1);
}

const DRY = process.argv.includes('--dry-run');
const env = loadEnv();
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing.');
  process.exit(1);
}

const supabase = createClient(
  env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function normaliseName(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NOISE =
  /\b(puppy\s*\d+|std-?black|std\s*pup|elite\s*pup|elite|standard|std|purpule|purple|pink|gold|yellow|red|grey|gray|orange|black|blue|green|white|von\s+diedericks)\b/gi;

function cleanPersonCandidate(raw) {
  if (!raw) return null;
  let s = raw
    .replace(NOISE, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Drop a leading call-name token when at least two name parts remain.
  const parts = s.split(' ').filter(Boolean);
  if (parts.length >= 3) s = parts.slice(1).join(' ');
  const words = s.split(' ').filter(Boolean);
  if (words.length < 2) return null;
  if (/^puppy$/i.test(words[0])) return null;
  return s;
}

function trailingNameFromDogName(name) {
  if (!name) return null;
  const bracket = name.match(/\)\s+(.+)$/);
  if (bracket) {
    const fromBracket = cleanPersonCandidate(bracket[1]);
    if (fromBracket) return fromBracket;
  }
  return cleanPersonCandidate(name);
}

function candidateName(dog) {
  const fromFields = [dog.new_owner_name, dog.reserved_for_name]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .find((v) => v.length >= 3);
  if (fromFields) return fromFields;
  return trailingNameFromDogName(dog.name);
}

function surnameInitialKey(full) {
  const parts = normaliseName(full).split(' ').filter(Boolean);
  if (parts.length < 2) return null;
  const surname = parts[parts.length - 1];
  const initial = parts[0][0];
  return `${surname}|${initial}`;
}

async function fetchAll(table, select) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

console.log(DRY ? '=== DRY RUN (no writes) ===' : '=== LINKING OWNERS ===');

const contacts = await fetchAll(
  'contacts',
  'id, full_name, phone, whatsapp_number, email',
);
const dogs = (
  await fetchAll(
    'dogs',
    'id, name, status, new_owner_name, reserved_for_name, owner_contact_id',
  )
).filter((d) => d.status === 'sold' && !d.owner_contact_id);

const byExact = new Map();
const byNorm = new Map();
const bySurnameInitial = new Map();

for (const c of contacts) {
  if (!c.full_name) continue;
  const exact = c.full_name.trim();
  const norm = normaliseName(exact);
  const si = surnameInitialKey(exact);
  if (!byExact.has(exact)) byExact.set(exact, []);
  byExact.get(exact).push(c);
  if (!byNorm.has(norm)) byNorm.set(norm, []);
  byNorm.get(norm).push(c);
  if (si) {
    if (!bySurnameInitial.has(si)) bySurnameInitial.set(si, []);
    bySurnameInitial.get(si).push(c);
  }
}

const linked = [];
const ambiguous = [];
const noCandidate = [];
const noMatch = [];

for (const dog of dogs) {
  const name = candidateName(dog);
  if (!name) {
    noCandidate.push({ dog_id: dog.id, dog_name: dog.name });
    continue;
  }

  let matches = byExact.get(name.trim()) ?? [];
  let strength = 'exact';
  if (matches.length === 0) {
    matches = byNorm.get(normaliseName(name)) ?? [];
    strength = 'normalised';
  }

  if (matches.length === 1 && (strength === 'exact' || strength === 'normalised')) {
    linked.push({
      dog_id: dog.id,
      dog_name: dog.name,
      candidate: name,
      contact_id: matches[0].id,
      contact_name: matches[0].full_name,
      strength,
    });
    continue;
  }

  if (matches.length > 1) {
    ambiguous.push({
      dog_id: dog.id,
      dog_name: dog.name,
      candidate: name,
      reason: `multiple_${strength}`,
      contacts: matches.map((m) => ({ id: m.id, full_name: m.full_name })),
    });
    continue;
  }

  // Weak: surname + first initial — review only, never auto-write
  const si = surnameInitialKey(name);
  const weak = si ? bySurnameInitial.get(si) ?? [] : [];
  if (weak.length >= 1) {
    ambiguous.push({
      dog_id: dog.id,
      dog_name: dog.name,
      candidate: name,
      reason: 'surname_initial_review_only',
      contacts: weak.map((m) => ({ id: m.id, full_name: m.full_name })),
    });
    continue;
  }

  noMatch.push({ dog_id: dog.id, dog_name: dog.name, candidate: name });
}

const outDir = path.join(__dirname, 'output');
mkdirSync(outDir, { recursive: true });
const reviewPath = path.join(outDir, 'link-dog-owners-review.json');
writeFileSync(
  reviewPath,
  JSON.stringify({ generated_at: new Date().toISOString(), ambiguous, noMatch, noCandidate }, null, 2),
  'utf8',
);

console.log(`Sold dogs without owner_contact_id: ${dogs.length}`);
console.log(`Would link (exact/normalised):       ${linked.length}`);
console.log(`Ambiguous / weak (review file):      ${ambiguous.length}`);
console.log(`No candidate name:                   ${noCandidate.length}`);
console.log(`No matching contact:                 ${noMatch.length}`);
console.log(`Review file: ${reviewPath}`);

if (DRY) {
  console.log('\nSample links:');
  for (const row of linked.slice(0, 15)) {
    console.log(`  ${row.dog_name} → ${row.contact_name} (${row.strength})`);
  }
  console.log('\nAmbiguous sample:');
  for (const row of ambiguous.slice(0, 10)) {
    console.log(
      `  ${row.dog_name} · "${row.candidate}" · ${row.reason} · ${row.contacts.map((c) => c.full_name).join(' | ')}`,
    );
  }
  process.exit(0);
}

if (linked.length === 0) {
  console.log('Nothing to write.');
  process.exit(0);
}

await supabase.rpc('pause_audit', { p_reason: 'linking historical dog owners' });
let written = 0;
let errors = 0;
try {
  for (const row of linked) {
    const { error } = await supabase
      .from('dogs')
      .update({
        owner_contact_id: row.contact_id,
        ownership_status: 'unknown',
      })
      .eq('id', row.dog_id)
      .is('owner_contact_id', null);
    if (error) {
      console.error(`  fail ${row.dog_id}: ${error.message}`);
      errors += 1;
    } else {
      written += 1;
    }
  }
} finally {
  const { data } = await supabase.rpc('resume_audit');
  console.log(`resume_audit: ${data ?? 'ok'}`);
}

console.log(`\nLinked: ${written}`);
console.log(`Errors: ${errors}`);
console.log(`Ambiguous (not written): ${ambiguous.length}`);
console.log(`No candidate name: ${noCandidate.length}`);
console.log(`No matching contact: ${noMatch.length}`);
