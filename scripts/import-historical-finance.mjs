/**
 * import-historical-finance.mjs
 *
 * Imports historical financial records (2019–2026) from historical-transactions.tsv into Supabase.
 *
 * Expenses → public.expenses table (mapped to expense_category_id + dog_id)
 * Income   → public.historical_income table
 *
 * Run from the project root:
 *   node scripts/import-historical-finance.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load env ────────────────────────────────────────────────────────────────
function loadEnv() {
  // Try multiple locations: CWD (where node is run from), script dir parent, script dir
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '.env.local'),
  ];

  for (const envPath of candidates) {
    try {
      const lines = readFileSync(envPath, 'utf-8').split('\n');
      const env = {};
      for (const line of lines) {
        const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
        if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
      // Only use this file if it has at least the URL
      if (env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL) {
        console.log(`  Using env: ${envPath}`);
        return env;
      }
    } catch {
      // Try next
    }
  }

  console.error('Could not find .env.local with SUPABASE_URL.');
  console.error('Add these two lines to diedericks-dobermanns/.env.local:');
  console.error('  SUPABASE_URL=https://nlmwxodvquwbjinhhbmr.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<your service role key from Supabase dashboard>');
  process.exit(1);
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Category mapping: historical name → expense_categories.id ───────────────
const EXPENSE_CATEGORY_MAP = {
  // Feed & Nutrition (19e35536-09ae-40d1-a7e8-612941cf91b3)
  'Animal Feed & Supplements':       '19e35536-09ae-40d1-a7e8-612941cf91b3',
  'Dog Food':                         '19e35536-09ae-40d1-a7e8-612941cf91b3',

  // Breeding (193b058a-6fbe-4b66-bf56-9c5bb733d8be)
  'Dog purchase':                     '193b058a-6fbe-4b66-bf56-9c5bb733d8be',

  // Equipment (8ce1c090-2119-475b-982c-9341b90795e7)
  'Blanket':                          '8ce1c090-2119-475b-982c-9341b90795e7',
  'Crate':                            '8ce1c090-2119-475b-982c-9341b90795e7',
  'Equipment':                        '8ce1c090-2119-475b-982c-9341b90795e7',
  'Fencing':                          '8ce1c090-2119-475b-982c-9341b90795e7',
  'Kennel Mattress':                  '8ce1c090-2119-475b-982c-9341b90795e7',
  'Toys':                             '8ce1c090-2119-475b-982c-9341b90795e7',
  'Training Equipment':               '8ce1c090-2119-475b-982c-9341b90795e7',

  // Insurance (aab26787-9103-40ec-8b8c-ca2dea9b39de)
  'Insurance':                        'aab26787-9103-40ec-8b8c-ca2dea9b39de',

  // Professional Fees (1c1b5a4a-6307-40f0-aafd-0a9ae383df96)
  'Rhuandi Services':                 '1c1b5a4a-6307-40f0-aafd-0a9ae383df96',

  // Staff (29d29518-ad0b-4e75-8c24-3436dabf3084)
  'Salaries':                         '29d29518-ad0b-4e75-8c24-3436dabf3084',
  'Staff Uniform':                    '29d29518-ad0b-4e75-8c24-3436dabf3084',
  'Staff Uniforms':                   '29d29518-ad0b-4e75-8c24-3436dabf3084',

  // Training (8479114d-54ce-4c33-b105-329c5b9b6735)
  'Accommodation / training':         '8479114d-54ce-4c33-b105-329c5b9b6735',
  'PSA':                              '8479114d-54ce-4c33-b105-329c5b9b6735',

  // Transport (6d3ea5fb-8e89-43a5-a2c2-4a505c1c2e1c)
  'Fuel':                             '6d3ea5fb-8e89-43a5-a2c2-4a505c1c2e1c',
  'R&M Vehicles':                     '6d3ea5fb-8e89-43a5-a2c2-4a505c1c2e1c',
  'Toll-Gate':                        '6d3ea5fb-8e89-43a5-a2c2-4a505c1c2e1c',
  'Transport costs':                  '6d3ea5fb-8e89-43a5-a2c2-4a505c1c2e1c',
  'Travel & Accommodation':           '6d3ea5fb-8e89-43a5-a2c2-4a505c1c2e1c',

  // Utilities (4ea8b936-e48c-4ccf-928f-0a94ab37ff5b)
  'Software Licenses':                '4ea8b936-e48c-4ccf-928f-0a94ab37ff5b',

  // Veterinary (a5b15583-ff04-4bdb-b243-492949a0e39e)
  "Health Test's":                    'a5b15583-ff04-4bdb-b243-492949a0e39e',
  'Medicines':                        'a5b15583-ff04-4bdb-b243-492949a0e39e',
  'Micro-Chips':                      'a5b15583-ff04-4bdb-b243-492949a0e39e',
  'Vaccinations':                     'a5b15583-ff04-4bdb-b243-492949a0e39e',
  'Veterinary':                       'a5b15583-ff04-4bdb-b243-492949a0e39e',
  'Veterinary costs':                 'a5b15583-ff04-4bdb-b243-492949a0e39e',

  // Other (3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7) — catch-all
  'Admin Fees':                       '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
  'Commission':                       '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
  'Donations':                        '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
  'Elite Pup Delivery Kit':           '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
  'Export costs':                     '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
  'FOOD & ENTERTAINMENT':             '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
  'General Expenses':                 '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
  'Inport Cost -ERS':                 '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
  'Registrations':                    '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
  'Stationary':                       '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7',
};

// ─── Dog name → UUID ─────────────────────────────────────────────────────────
const DOG_MAP = {
  'Ade':         '3d36733e-58e6-4fd2-91d5-1dce2aa868c1',
  'Bliksem':     '1c273986-8136-4199-9aeb-295ed422f0fa',
  'Boomer':      '841b37dc-a0ac-47ce-81c5-279af53e5ebf',
  'Bruce':       'f4fb4826-cb2a-4294-9f42-ce4b6ff20348',
  'Cait':        '3f5c6b20-98e5-4797-a1d7-c2c152183c78',
  'Celsea':      '22944bef-eb42-4d3b-9395-a926513406aa',
  'Cendra':      '7b8de2c4-6a98-441f-996e-71d19341a809',
  'Chester':     '01be0b46-6cd0-44b8-9378-e2e8443d6dd2',
  'Claire':      'bb08f772-5a26-47c5-94f1-8768907a191c',
  'Cleopatra':   'f0932f8d-c907-4f62-aa68-9334955927a7',
  'Cuba':        'b7d04552-fec1-43b3-b0a5-6ec6d0d81863',
  'Cyrus':       '1b9c5fdb-c30e-45d3-9cd9-1a1ff7e05d25',
  'Dexter':      '2f73003f-f649-43c4-9a6c-8128fcfd6ff9',
  'Dharka':      '506c9e4d-8a02-4750-af7a-f4340e65e7b0',
  'Eben':        '9323ac7c-3547-4576-9594-9d2b01ed7f0f',
  'Hailey':      'fb33005e-f4a6-4bf8-b0ff-a13a7c396d86',
  'Hannah':      'a37f2cfc-56df-4ab3-99a8-a41c4eda96c3',
  'Hazel':       'eab62ea0-5a41-4af8-8cdc-4b0f6dff8ef2',
  'Hugo':        'e1e419da-933a-45ec-9660-57dd2c6655c3',
  'Hunter-King': '930e1c41-807d-4e3a-9e4a-50a18c008acd',
  'Jazzmine':    '1f181a7d-c9d9-4d79-a4eb-54bc4dcf1e1d',
  'Liv':         '10a36427-d786-4e9e-af15-eccee2f3651a',
  'Loki':        'a674b31b-08a2-4f15-bda9-bf9562f06761',
  'Miles':       '5dafb461-3116-460e-b139-13d06919d148',
  'Odessa':      '9537e604-9aa2-456a-9d87-71dc3f093dc1',
  'Raptor':      '3c8c4ff6-c6b5-46a6-a089-a9b225ecc1ce',
  'Santini':     'c54ae0cf-dcba-4d83-a0eb-b6823132b0d1',
  'Shanti':      '3e9c384e-42c6-46d2-9f61-ae04960e3407',
  'Zara':        '9c6071f1-d465-4a2f-86fc-8f2089974828',
  'Zues':        '94fb5036-b7ff-4ed0-95c9-3fa8719c2d73',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Parse "DD/MM/YYYY" → "YYYY-MM-DD" */
function parseDate(raw) {
  const s = raw.trim();
  const [d, m, y] = s.split('/');
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Strip thousands commas + cast to float. Returns 0 for blank/invalid. */
function parseAmount(raw) {
  if (!raw || !raw.trim()) return 0;
  const n = parseFloat(raw.trim().replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Resolve dog name → UUID (case-insensitive, handles partial matches like "GUHNTER" → null) */
function resolveDog(name) {
  if (!name || !name.trim()) return null;
  const n = name.trim();
  // Direct match
  if (DOG_MAP[n]) return DOG_MAP[n];
  // Case-insensitive match
  const lower = n.toLowerCase();
  const key = Object.keys(DOG_MAP).find(k => k.toLowerCase() === lower);
  return key ? DOG_MAP[key] : null;
}

// ─── Parse TSV ───────────────────────────────────────────────────────────────
const tsvPath = path.join(__dirname, 'historical-transactions.tsv');
const lines = readFileSync(tsvPath, 'utf-8').split('\n').filter(l => l.trim());

const expenses = [];
const income   = [];
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t');
  if (cols.length < 12) { skipped++; continue; }

  const [date, type, category, invoiceNum, description, contact, dogName, litter, currency, amountRaw, taxRaw, totalRaw] = cols;

  const recordType = type.trim().toLowerCase();
  if (!['expense', 'income'].includes(recordType)) { skipped++; continue; }

  const parsedDate = parseDate(date);
  if (!parsedDate) { skipped++; continue; }

  const amount      = parseAmount(amountRaw);
  const tax         = Math.abs(parseAmount(taxRaw));   // stored negative in source — normalise
  const totalAmount = parseAmount(totalRaw);
  const dogId       = resolveDog(dogName);

  if (recordType === 'expense') {
    const categoryId = EXPENSE_CATEGORY_MAP[category.trim()] ?? '3dff9e9d-61dd-40ba-a10c-7ece8b3a58d7'; // fallback: Other

    expenses.push({
      expense_date:       parsedDate,
      category_id:        categoryId,
      description:        description.trim() || category.trim() || 'Historical import',
      supplier_name:      contact.trim() || null,
      invoice_reference:  invoiceNum.trim() || null,
      currency:           currency.trim() || 'ZAR',
      // amount = total paid (incl VAT); price_excl_vat = excl; vat_amount = VAT
      amount:             totalAmount > 0 ? totalAmount : amount,
      price_excl_vat:     amount > 0 ? amount : null,
      vat_applicable:     tax > 0,
      vat_amount:         tax > 0 ? tax : null,
      dog_id:             dogId,
      litter_id:          null,   // litter names not UUIDs — skip FK
      allocation_type:    'general',
      status:             'paid',
      is_recurring:       false,
    });
  } else {
    income.push({
      income_date:    parsedDate,
      category:       category.trim(),
      invoice_number: invoiceNum.trim() || null,
      description:    description.trim() || category.trim() || 'Historical import',
      contact_name:   contact.trim() || null,
      dog_name:       dogName.trim() || null,
      dog_id:         dogId,
      litter_name:    litter.trim() || null,
      currency:       currency.trim() || 'ZAR',
      amount:         amount,
      tax:            tax,
      total_amount:   totalAmount > 0 ? totalAmount : amount,
      source:         'historical_import',
    });
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────
async function importInBatches(table, rows, batchSize = 50) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`  ✗ Batch ${Math.floor(i/batchSize)+1} error:`, error.message);
      // Log first failing row for debugging
      console.error('  First row:', JSON.stringify(batch[0], null, 2));
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  ${table}: ${inserted}/${rows.length} inserted...`);
    }
  }
  console.log();
  return inserted;
}

async function run() {
  console.log('─────────────────────────────────────────────────');
  console.log('  Diedericks Dobermanns — Historical Finance Import');
  console.log('─────────────────────────────────────────────────');
  console.log(`  Parsed: ${expenses.length} expenses, ${income.length} income, ${skipped} skipped`);
  console.log();

  // Check for existing data
  const { count: existingExpenses } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'historical_import');

  const { count: existingIncome } = await supabase
    .from('historical_income')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'historical_import');

  if ((existingExpenses ?? 0) > 0 || (existingIncome ?? 0) > 0) {
    console.warn(`⚠  Records already exist: ${existingExpenses} expenses, ${existingIncome} income.`);
    console.warn('   Add --force to re-import (will insert duplicates).');
    if (!process.argv.includes('--force')) {
      console.log('\nAborted. Run with --force to import anyway.');
      process.exit(0);
    }
  }

  // Tag expenses with source for dedup detection
  const taggedExpenses = expenses.map(e => ({ ...e, source: 'historical_import' }));

  console.log('Importing expenses...');
  const expCount = await importInBatches('expenses', taggedExpenses);

  console.log('Importing income...');
  const incCount = await importInBatches('historical_income', income);

  console.log();
  console.log('─────────────────────────────────────────────────');
  console.log(`  ✅  Expenses inserted : ${expCount}`);
  console.log(`  ✅  Income inserted   : ${incCount}`);
  console.log('─────────────────────────────────────────────────');

  // ─── Balance check ───────────────────────────────────────────────────────
  console.log('\n📊  Balance check:');

  const { data: expenseSummary } = await supabase
    .from('expenses')
    .select('amount, vat_amount, price_excl_vat')
    .eq('source', 'historical_import');

  const { data: incomeSummary } = await supabase
    .from('historical_income')
    .select('amount, tax, total_amount');

  const totalExpenses = (expenseSummary ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalIncome   = (incomeSummary   ?? []).reduce((s, r) => s + Number(r.total_amount), 0);

  console.log(`  Total expenses (all): R ${totalExpenses.toLocaleString('en-ZA', {minimumFractionDigits: 2})}`);
  console.log(`  Total income:         R ${totalIncome.toLocaleString('en-ZA', {minimumFractionDigits: 2})}`);
  console.log(`  Net position:         R ${(totalIncome - totalExpenses).toLocaleString('en-ZA', {minimumFractionDigits: 2})}`);

  // ─── Category summary ───────────────────────────────────────────────────
  console.log('\n📋  Income by category:');
  const { data: catSummary } = await supabase
    .from('finance_category_summary')
    .select('*')
    .eq('record_type', 'income')
    .order('category');

  (catSummary ?? []).forEach(r => {
    console.log(`  ${r.category.padEnd(30)} R ${Number(r.total_amount).toLocaleString('en-ZA', {minimumFractionDigits: 2})}`);
  });

  // ─── Known reconciliation notes ─────────────────────────────────────────
  console.log('\n📌  Known reconciliation notes:');
  console.log('  • Puppy Sales: exported data shows R606,739 — your other app summary shows R626,739.');
  console.log('    Difference: R20,000. One Puppy Sales transaction was not included in the export.');
  console.log('    Review your records and add that transaction manually via the Finance screen.');

  console.log('\n✅  Import complete.');
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
