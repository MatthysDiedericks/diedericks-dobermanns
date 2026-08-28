/**
 * apply-dbp-litter-owners.mjs
 *
 * Applies the human-curated DBP Litters (155) capture (22 Aug 2026) onto dogs.
 * Matches by litter whelp date + collar / birth order / call name.
 * Never re-parses concatenated DBP dog.name strings.
 *
 * Contact links: unique exact or normalised name only. Surname-only and
 * multi-match names go to the review file. Does not send messages.
 *
 *   node scripts/apply-dbp-litter-owners.mjs --dry-run
 *   node scripts/apply-dbp-litter-owners.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'data', 'dbp-litter-owners-2026-08-22.json');

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

const capture = JSON.parse(readFileSync(DATA_PATH, 'utf8'));

function normaliseName(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normCollar(s) {
  if (!s) return null;
  return String(s)
    .toLowerCase()
    .replace(/purpule/g, 'purple')
    .replace(/\bgray\b/g, 'grey')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, '')
    .trim() || null;
}

function nameWordCount(s) {
  return normaliseName(s).split(' ').filter(Boolean).length;
}

function isPlaceholderName(s) {
  return /^\s*(puppy|pup)(\s*\d+)?\s*$/i.test(s ?? '');
}

function nameMatch(dog, callName) {
  if (!callName || isPlaceholderName(callName)) return false;
  const want = normaliseName(callName);
  if (!want) return false;
  const fields = [dog.call_name, dog.name].filter(Boolean).map(normaliseName);
  return fields.some((have) => {
    if (!have) return false;
    if (have === want) return true;
    if (have.startsWith(want + ' ')) return true;
    const wantFirst = want.split(' ')[0];
    const haveFirst = have.split(' ')[0];
    // Single-token call names only: "Hugo" matches "Hugo Hugo von Diedericks"
    if (!want.includes(' ') && haveFirst === wantFirst) return true;
    return false;
  });
}

function pupLabel(litter, pup) {
  const bits = [
    litter.whelped,
    litter.letter ? `L${litter.letter}` : null,
    pup.birth_order != null ? `#${pup.birth_order}` : null,
    pup.collar ?? null,
    pup.call_name ?? null,
    pup.owner ? `→ ${pup.owner}` : pup.retained ? 'retained' : pup.no_owner ? 'no owner' : null,
  ].filter(Boolean);
  return bits.join(' · ');
}

function matchConfidence(pup) {
  let c = 0;
  if (pup.birth_order != null) c += 2;
  if (pup.collar) c += 2;
  if (pup.call_name && !isPlaceholderName(pup.call_name)) c += 1;
  return c;
}

function matchLitter(litters, captureLitter) {
  const sameDate = litters.filter((l) => l.actual_date === captureLitter.whelped);
  const withParents = sameDate.filter((l) => {
    const dam = normaliseName(l.mother?.name ?? '');
    const sire = normaliseName(l.father?.name ?? '');
    const wantDam = normaliseName(captureLitter.dam ?? '');
    const wantSire = normaliseName(captureLitter.sire ?? '');
    const damOk = !wantDam || dam.includes(wantDam.split(' ')[0]);
    const sireOk = !wantSire || sire.includes(wantSire.split(' ')[0]);
    return damOk && sireOk;
  });
  const pool = withParents.length ? withParents : sameDate;
  if (captureLitter.letter) {
    const byLetter = pool.filter(
      (l) => (l.litter_letter ?? '').toUpperCase() === captureLitter.letter.toUpperCase(),
    );
    if (byLetter.length === 1) return { litter: byLetter[0] };
    if (byLetter.length > 1) return { error: 'multiple_letter', candidates: byLetter };
  }
  if (pool.length === 1) return { litter: pool[0] };
  if (pool.length === 0) return { error: 'not_found' };
  return { error: 'multiple', candidates: pool };
}

function matchPuppy(available, pup) {
  if (pup.match_hint && pup.birth_order == null && !pup.collar && (!pup.call_name || isPlaceholderName(pup.call_name))) {
    return { status: 'unmatched', reason: pup.match_hint };
  }

  const byOrder =
    pup.birth_order != null
      ? available.filter((d) => d.birth_order === pup.birth_order)
      : [];
  const wantCollar = normCollar(pup.collar);
  const byCollar = wantCollar
    ? available.filter((d) => normCollar(d.collar_colour) === wantCollar)
    : [];
  const byName = pup.call_name ? available.filter((d) => nameMatch(d, pup.call_name)) : [];

  if (byOrder.length === 1) {
    const dog = byOrder[0];
    if (wantCollar && dog.collar_colour && normCollar(dog.collar_colour) !== wantCollar) {
      return {
        status: 'conflict',
        reason: 'order_collar_mismatch',
        dogs: [dog],
      };
    }
    return { status: 'matched', dog, via: 'birth_order' };
  }
  if (byOrder.length > 1) {
    const narrowed = wantCollar
      ? byOrder.filter((d) => normCollar(d.collar_colour) === wantCollar)
      : byName.length
        ? byOrder.filter((d) => nameMatch(d, pup.call_name))
        : byOrder;
    if (narrowed.length === 1) return { status: 'matched', dog: narrowed[0], via: 'birth_order+narrow' };
    return { status: 'conflict', reason: 'multiple_birth_order', dogs: narrowed.length ? narrowed : byOrder };
  }

  if (byCollar.length === 1) return { status: 'matched', dog: byCollar[0], via: 'collar' };
  if (byCollar.length > 1) {
    const narrowed = byName.length ? byCollar.filter((d) => nameMatch(d, pup.call_name)) : byCollar;
    if (narrowed.length === 1) return { status: 'matched', dog: narrowed[0], via: 'collar+name' };
    return { status: 'conflict', reason: 'multiple_collar', dogs: narrowed };
  }

  if (byName.length === 1) return { status: 'matched', dog: byName[0], via: 'call_name' };
  if (byName.length > 1) return { status: 'conflict', reason: 'multiple_name', dogs: byName };

  return { status: 'unmatched', reason: 'no_match' };
}

function empty(v) {
  return v == null || String(v).trim() === '';
}

async function fetchAll(table, select) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

console.log(DRY ? '=== DRY RUN (no writes) ===' : '=== APPLY DBP LITTER OWNERS ===');

const contacts = (
  await fetchAll('contacts', 'id, full_name, phone, email, merged_into_contact_id')
).filter((c) => !c.merged_into_contact_id);

const byExact = new Map();
const byNorm = new Map();
const bySurnameInitial = new Map();
for (const c of contacts) {
  if (!c.full_name) continue;
  const exact = c.full_name.trim();
  const norm = normaliseName(exact);
  const parts = norm.split(' ').filter(Boolean);
  if (!byExact.has(exact)) byExact.set(exact, []);
  byExact.get(exact).push(c);
  if (!byNorm.has(norm)) byNorm.set(norm, []);
  byNorm.get(norm).push(c);
  if (parts.length >= 2) {
    const si = `${parts[parts.length - 1]}|${parts[0][0]}`;
    if (!bySurnameInitial.has(si)) bySurnameInitial.set(si, []);
    bySurnameInitial.get(si).push(c);
  }
}

function resolveContact(owner) {
  if (!owner) return { kind: 'none' };
  const trimmed = owner.trim();
  let matches = byExact.get(trimmed) ?? [];
  let strength = 'exact';
  if (matches.length === 0) {
    matches = byNorm.get(normaliseName(trimmed)) ?? [];
    strength = 'normalised';
  }
  if (matches.length === 1 && nameWordCount(trimmed) >= 2) {
    return { kind: 'link', contact: matches[0], strength };
  }
  if (matches.length > 1) {
    return {
      kind: 'ambiguous_contact',
      contacts: matches,
      reason: `multiple_${strength}`,
    };
  }
  const parts = normaliseName(trimmed).split(' ').filter(Boolean);
  if (parts.length >= 2) {
    const si = `${parts[parts.length - 1]}|${parts[0][0]}`;
    const weak = bySurnameInitial.get(si) ?? [];
    if (weak.length >= 1) {
      return { kind: 'review_contact', contacts: weak, reason: 'surname_initial_review_only' };
    }
  }
  if (nameWordCount(trimmed) < 2) {
    return { kind: 'review_contact', contacts: [], reason: 'single_token_owner' };
  }
  return { kind: 'no_contact' };
}

const litters = await fetchAll(
  'litters',
  'id, litter_letter, actual_date, name, go_home_weeks, go_home_date, default_programme_tier, mother:dogs!litters_mother_id_fkey(name), father:dogs!litters_father_id_fkey(name)',
);
const dogs = await fetchAll(
  'dogs',
  'id, name, call_name, litter_id, birth_order, collar_colour, status, programme_tier, owner_contact_id, owner_id, new_owner_name, reserved_for_name, ownership_status, deceased_at, microchip_number, registration_number',
);

const dogsByLitter = new Map();
for (const d of dogs) {
  if (!d.litter_id) continue;
  if (!dogsByLitter.has(d.litter_id)) dogsByLitter.set(d.litter_id, []);
  dogsByLitter.get(d.litter_id).push(d);
}

const litterUpdates = [];
const dogUpdates = [];
const review = {
  generated_at: new Date().toISOString(),
  source: capture.source,
  litter_not_found: [],
  unmatched_puppies: [],
  conflicts: [],
  confirmed_no_owner: [],
  contact_review: [],
  would_write: [],
};

for (const cap of capture.litters) {
  const found = matchLitter(litters, cap);
  if (!found.litter) {
    review.litter_not_found.push({
      whelped: cap.whelped,
      letter: cap.letter ?? null,
      dam: cap.dam,
      sire: cap.sire,
      reason: found.error,
      candidates: (found.candidates ?? []).map((l) => ({
        id: l.id,
        actual_date: l.actual_date,
        letter: l.litter_letter,
        dam: l.mother?.name,
        sire: l.father?.name,
      })),
    });
    continue;
  }

  const litter = found.litter;
  const litterPatch = {};
  if (cap.go_home_weeks != null && litter.go_home_weeks == null) {
    litterPatch.go_home_weeks = cap.go_home_weeks;
  }
  if (cap.go_home_date && empty(litter.go_home_date)) {
    litterPatch.go_home_date = cap.go_home_date;
  }
  if (Object.keys(litterPatch).length) {
    litterUpdates.push({ id: litter.id, patch: litterPatch, label: `${cap.whelped} ${cap.letter ?? ''}`.trim() });
  }

  const available = [...(dogsByLitter.get(litter.id) ?? [])];
  const pups = [...cap.puppies].sort((a, b) => matchConfidence(b) - matchConfidence(a));

  for (const pup of pups) {
    const hit = matchPuppy(available, pup);
    if (hit.status !== 'matched') {
      const row = {
        label: pupLabel(cap, pup),
        reason: hit.reason,
        dogs: (hit.dogs ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          birth_order: d.birth_order,
          collar_colour: d.collar_colour,
        })),
      };
      if (hit.status === 'conflict') review.conflicts.push(row);
      else review.unmatched_puppies.push(row);
      continue;
    }

    const dog = hit.dog;
    const idx = available.findIndex((d) => d.id === dog.id);
    if (idx >= 0) available.splice(idx, 1);

    const patch = {};
    const notes = [];

    if (pup.tier && empty(dog.programme_tier)) {
      patch.programme_tier = pup.tier;
      notes.push(`tier=${pup.tier}`);
    }
    if (typeof pup.died === 'string' && empty(dog.deceased_at)) {
      patch.deceased_at = pup.died;
      notes.push(`died=${pup.died}`);
    }
    if (pup.registration_number && empty(dog.registration_number)) {
      patch.registration_number = pup.registration_number;
      notes.push(`reg=${pup.registration_number}`);
    }

    if (pup.no_owner) {
      review.confirmed_no_owner.push({
        label: pupLabel(cap, pup),
        dog_id: dog.id,
        dog_name: dog.name,
        status: dog.status,
        ownership_status: dog.ownership_status,
        owner_contact_id: dog.owner_contact_id,
        via: hit.via,
      });
    } else if (pup.retained) {
      notes.push('retained');
    } else if (pup.owner) {
      const soldLike = dog.status === 'sold' || dog.status === 'placed';
      const reservedLike = dog.status === 'reserved' || dog.status === 'available' || dog.status === 'keep';
      if (soldLike && empty(dog.new_owner_name)) {
        patch.new_owner_name = pup.owner;
        notes.push(`new_owner_name=${pup.owner}`);
      } else if (reservedLike && empty(dog.reserved_for_name)) {
        patch.reserved_for_name = pup.owner;
        notes.push(`reserved_for_name=${pup.owner}`);
      } else if (empty(dog.new_owner_name) && empty(dog.reserved_for_name)) {
        patch.new_owner_name = pup.owner;
        notes.push(`new_owner_name=${pup.owner}`);
      }

      const resolved = resolveContact(pup.owner);
      if (resolved.kind === 'link' && empty(dog.owner_contact_id) && !pup.retained) {
        patch.owner_contact_id = resolved.contact.id;
        if (empty(dog.ownership_status) || dog.ownership_status === 'unknown') {
          // Keep unknown until a reply — same as link-dog-owners.mjs
        }
        notes.push(`link ${resolved.contact.full_name} (${resolved.strength})`);
      } else if (resolved.kind === 'ambiguous_contact' || resolved.kind === 'review_contact') {
        review.contact_review.push({
          label: pupLabel(cap, pup),
          dog_id: dog.id,
          dog_name: dog.name,
          owner: pup.owner,
          ambiguous_line: !!pup.ambiguous,
          reason: resolved.reason,
          contacts: (resolved.contacts ?? []).map((c) => ({ id: c.id, full_name: c.full_name })),
        });
      } else if (resolved.kind === 'no_contact') {
        review.contact_review.push({
          label: pupLabel(cap, pup),
          dog_id: dog.id,
          dog_name: dog.name,
          owner: pup.owner,
          ambiguous_line: !!pup.ambiguous,
          reason: 'no_matching_contact',
          contacts: [],
        });
      }
    }

    if ((pup.died === true || pup.died_note) && empty(dog.deceased_at)) {
      review.unmatched_puppies.push({
        label: pupLabel(cap, pup),
        reason: `died_without_exact_date: ${pup.died_note || 'capture marked died'}`,
        dog_id: dog.id,
        dog_name: dog.name,
      });
    }

    if (Object.keys(patch).length) {
      dogUpdates.push({
        id: dog.id,
        patch,
        label: `${dog.name} ← ${pupLabel(cap, pup)}`,
        via: hit.via,
        notes,
      });
    }
  }
}

const outDir = path.join(__dirname, 'output');
mkdirSync(outDir, { recursive: true });
const reviewPath = path.join(outDir, 'apply-dbp-litter-owners-review.json');
review.would_write = {
  litters: litterUpdates,
  dogs: dogUpdates,
};
writeFileSync(reviewPath, JSON.stringify(review, null, 2), 'utf8');

console.log(`Capture litters:                 ${capture.litters.length}`);
console.log(`Litters not found:               ${review.litter_not_found.length}`);
console.log(`Puppy match conflicts:           ${review.conflicts.length}`);
console.log(`Unmatched puppies:               ${review.unmatched_puppies.length}`);
console.log(`Confirmed no owner in DBP:       ${review.confirmed_no_owner.length}`);
console.log(`Contact review (not auto-link):  ${review.contact_review.length}`);
console.log(`Litter field updates:            ${litterUpdates.length}`);
console.log(`Dog field updates:               ${dogUpdates.length}`);
console.log(`Review file: ${reviewPath}`);

const sample = dogUpdates.filter((u) => u.patch.owner_contact_id).slice(0, 20);
if (sample.length) {
  console.log('\nContact links:');
  for (const row of sample) console.log(`  ${row.label}  [${row.notes.join('; ')}]`);
}
const nameOnly = dogUpdates.filter((u) => !u.patch.owner_contact_id && (u.patch.new_owner_name || u.patch.reserved_for_name)).slice(0, 15);
if (nameOnly.length) {
  console.log('\nOwner names without contact link:');
  for (const row of nameOnly) console.log(`  ${row.label}  [${row.notes.join('; ')}]`);
}
const tiers = dogUpdates.filter((u) => u.patch.programme_tier);
if (tiers.length) {
  console.log(`\nProgramme tiers to set: ${tiers.length}`);
  for (const row of tiers) console.log(`  ${row.label} → ${row.patch.programme_tier}`);
}

if (DRY) {
  if (review.litter_not_found.length) {
    console.log('\nLitters not found:');
    for (const row of review.litter_not_found) {
      console.log(`  ${row.whelped} ${row.letter ?? ''} ${row.dam} × ${row.sire} (${row.reason})`);
    }
  }
  if (review.conflicts.length) {
    console.log('\nConflicts:');
    for (const row of review.conflicts.slice(0, 15)) console.log(`  ${row.label} · ${row.reason}`);
  }
  process.exit(0);
}

if (litterUpdates.length === 0 && dogUpdates.length === 0) {
  console.log('Nothing to write.');
  process.exit(0);
}

await supabase.rpc('pause_audit', { p_reason: 'applying curated DBP litter owners' });
let written = 0;
let errors = 0;
try {
  for (const row of litterUpdates) {
    const { error } = await supabase.from('litters').update(row.patch).eq('id', row.id);
    if (error) {
      console.error(`  litter fail ${row.label}: ${error.message}`);
      errors += 1;
    } else {
      written += 1;
    }
  }
  for (const row of dogUpdates) {
    const { error } = await supabase.from('dogs').update(row.patch).eq('id', row.id);
    if (error) {
      console.error(`  dog fail ${row.label}: ${error.message}`);
      errors += 1;
    } else {
      written += 1;
    }
  }
} finally {
  const { data } = await supabase.rpc('resume_audit');
  console.log(`resume_audit: ${data ?? 'ok'}`);
}

console.log(`\nWritten: ${written}`);
console.log(`Errors: ${errors}`);
console.log(`Contact review (not written as links): ${review.contact_review.length}`);
