#!/usr/bin/env node
/**
 * Lists the kennel documents and a suggested expiry only when the stored
 * record already states one. Does not open or parse PDFs. Writes nothing
 * until Matt confirms and this is run with --apply.
 *
 *   node scripts/list-kennel-document-expiries.mjs
 *   node scripts/list-kennel-document-expiries.mjs --apply answers.json
 *
 * answers.json is { "<document uuid>": "YYYY-MM-DD" }. Rows that already
 * have an expiry date (the KUSA letter) are left alone.
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

import { loadSupabaseEnv } from './load-supabase-env.mjs';

const MONTHS = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
};

function statedDate(text) {
  if (!text) return null;
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const long = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
  );
  if (long) {
    const month = MONTHS[long[2].toLowerCase()];
    return `${long[3]}-${month}-${String(long[1]).padStart(2, '0')}`;
  }
  return null;
}

const env = loadSupabaseEnv();
const url = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase URL or service role key.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from('documents')
  .select(
    'id, document_name, original_filename, category, date_of_document, expiry_date, issued_by, document_number, description',
  )
  .eq('entity_type', 'kennel')
  .order('document_name', { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = data ?? [];
const applyPath = process.argv.includes('--apply')
  ? process.argv[process.argv.indexOf('--apply') + 1]
  : null;

if (!applyPath) {
  console.log(`Kennel documents: ${rows.length}`);
  console.log('Nothing will be written. Confirm dates, then re-run with --apply answers.json.\n');
  for (const row of rows) {
    const blob = [row.document_name, row.description, row.document_number, row.issued_by]
      .filter(Boolean)
      .join(' ');
    const suggested = row.expiry_date ? null : statedDate(blob);
    console.log(`- ${row.document_name}`);
    console.log(`  id: ${row.id}`);
    console.log(`  category: ${row.category}`);
    console.log(`  file: ${row.original_filename}`);
    console.log(`  issued by: ${row.issued_by ?? '—'}`);
    console.log(`  document date: ${row.date_of_document ?? '—'}`);
    console.log(`  expiry on record: ${row.expiry_date ?? '—'}`);
    if (row.expiry_date) {
      console.log('  suggestion: already dated — leave alone');
    } else if (suggested) {
      console.log(`  suggestion: ${suggested} (stated in the stored name or notes, not read from the file)`);
    } else {
      console.log('  suggestion: none — the stored record does not state an expiry. Not guessing.');
    }
    console.log('');
  }
  process.exit(0);
}

const answers = JSON.parse(readFileSync(applyPath, 'utf8'));
const byId = new Map(rows.map((row) => [row.id, row]));
let written = 0;
for (const [id, raw] of Object.entries(answers)) {
  const row = byId.get(id);
  if (!row) {
    console.error(`Skip ${id}: not a kennel document.`);
    continue;
  }
  if (row.expiry_date) {
    console.log(`Leave ${row.document_name}: expiry already ${row.expiry_date}.`);
    continue;
  }
  const date = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`Skip ${row.document_name}: ${raw} is not YYYY-MM-DD.`);
    continue;
  }
  const { error: writeError } = await supabase
    .from('documents')
    .update({ expiry_date: date })
    .eq('id', id)
    .eq('entity_type', 'kennel')
    .is('expiry_date', null);
  if (writeError) {
    console.error(`${row.document_name}: ${writeError.message}`);
    continue;
  }
  written += 1;
  console.log(`Set ${row.document_name} to ${date}.`);
}
console.log(`Wrote ${written}. Did not create any documents.`);
