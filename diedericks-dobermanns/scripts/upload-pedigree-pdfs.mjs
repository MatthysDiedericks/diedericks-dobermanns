/**
 * upload-pedigree-pdfs.mjs
 *
 * One-time import of pedigree PDFs that Matt dropped loose into various
 * "Dobermann Photo's" subfolders (not zipped, not necessarily in the folder
 * matching the dog's name — several were found sitting inside the Cleopatra
 * folder but named for other dogs). Confirmed name-to-dog matches only; see
 * FILE_MAP below and the accompanying chat message for what was excluded
 * and why (ambiguous "Puppy 4" x11 dogs, a litter-pedigrees zip, etc.).
 *
 * Same pattern as import-dbp-documents.mjs: uploads to the private
 * `documents` storage bucket, inserts one `documents` row per file
 * (entity_type='dog', category='pedigree'), skips anything already
 * imported for that dog (checked by original_filename), safe to re-run.
 *
 * WHY this runs on your machine, not Claude's sandbox: Claude's sandbox has
 * no outbound network route to Supabase's API.
 *
 * Usage:
 *   node scripts/upload-pedigree-pdfs.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (secret key, starts with sb_secret_)
 * in .env
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Load .env manually (matches the pattern used by the other scripts here)
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) env[match[1].trim()] = match[2].trim();
    });
}

const SUPABASE_URL = env['EXPO_PUBLIC_SUPABASE_URL'] || env['SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SERVICE_ROLE_KEY.startsWith('sb_secret_')) {
  console.error('\n❌ Missing or invalid SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('   It must be the SECRET key (starts with sb_secret_...), not the publishable key.');
  console.error('   Get it from: Supabase Dashboard → Project Settings → API → service_role (secret)\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = 'documents';

// ---------------------------------------------------------------------------
// File -> dog mapping (Supabase dogs.id, confirmed 2026-07-28)
// Only confident 1:1 name matches are listed here — see chat for the ones
// deliberately left out.
// ---------------------------------------------------------------------------
const DESKTOP_PHOTOS = "C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's";

const FILE_MAP = [
  { file: `${DESKTOP_PHOTOS}\\Cendra\\pedigree_Cendra Diedericks_2026-06-01.pdf`, entityId: '7b8de2c4-6a98-441f-996e-71d19341a809', label: 'Cendra' },
  { file: `${DESKTOP_PHOTOS}\\Claire\\pedigree_Claire_2026-06-01.pdf`, entityId: 'bb08f772-5a26-47c5-94f1-8768907a191c', label: 'Claire' },
  { file: `${DESKTOP_PHOTOS}\\Cleopatra\\pedigree_Cleopatra_2026-06-01.pdf`, entityId: 'f0932f8d-c907-4f62-aa68-9334955927a7', label: 'Cleopatra (adds alongside existing Cleo Pedigree.docx)' },
  { file: `${DESKTOP_PHOTOS}\\Cleopatra\\pedigree_Hannah_2026-06-01.pdf`, entityId: 'a37f2cfc-56df-4ab3-99a8-a41c4eda96c3', label: 'Hannah (file was misfiled in the Cleopatra folder)' },
  { file: `${DESKTOP_PHOTOS}\\Cleopatra\\pedigree_Kim von Diedericks_2026-06-01.pdf`, entityId: '2be75604-740f-4076-954d-53d434f3455d', label: 'Kim (file was misfiled in the Cleopatra folder)' },
  { file: `${DESKTOP_PHOTOS}\\Cleopatra\\pedigree_Hailey De Zelig_2026-06-01.pdf`, entityId: 'fb33005e-f4a6-4bf8-b0ff-a13a7c396d86', label: 'Hailey (file was misfiled in the Cleopatra folder — confirm "Hailey De Zelig" is Hailey\'s full registered name)' },
  { file: `${DESKTOP_PHOTOS}\\Cleopatra\\pedigree_Hillo Betelges_2026-06-01.pdf`, entityId: '930e1c41-807d-4e3a-9e4a-50a18c008acd', label: 'Hunter-King (Hillo Betelges = Hunter-King\'s registered pedigree name, per prior import)' },
  { file: `${DESKTOP_PHOTOS}\\Cleopatra\\pedigree_Santini Betelges_2026-06-01.pdf`, entityId: 'c54ae0cf-dcba-4d83-a0eb-b6823132b0d1', label: 'Santini (adds alongside existing Santini Export Pedigree.pdf)' },
  { file: 'C:\\Users\\mathy\\OneDrive\\Desktop\\Personal\\Diedericks Dobermanns\\pedigree_Hugo von Diedericks_2026-03-20.pdf', entityId: 'e1e419da-933a-45ec-9660-57dd2c6655c3', label: 'Hugo' },
  { file: 'C:\\Users\\mathy\\OneDrive\\Desktop\\Personal\\Diedericks Dobermanns\\pedigree_Puppy 1 Gunter Elite Pup_2025-09-18.pdf', entityId: '5e3ed29e-5ff1-41d8-9a8c-dd171a31bb59', label: 'Puppy 1 Gunter Elite Pup' },
];

// NOT included — flagged for Matt to resolve manually, do not guess:
//   - "pedigree_Puppy 4_2025-11-14.pdf" and "pedigree_Puppy 4_2024-09-18.pdf"
//     — 11 different dogs named "Puppy 4" exist in the DB, no reliable way
//     to tell which one from the filename alone.
//   - "litter_3913431156405569219_pedigrees.zip" in Downloads — a zip of
//     per-puppy pedigrees for one litter, needs its own unzip + per-puppy
//     matching pass, not a simple file-to-dog map.

const MIME_BY_EXT = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._ -]/g, '_').trim();
}

async function run() {
  console.log(`\n📜 Uploading ${FILE_MAP.length} pedigree file(s)\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let missing = 0;

  for (const entry of FILE_MAP) {
    const label = entry.label;
    if (!fs.existsSync(entry.file)) {
      console.warn(`⚠️  ${label} — file not found at ${entry.file}`);
      missing++;
      continue;
    }

    const originalFilename = path.basename(entry.file);

    const { data: existingDocs, error: existingErr } = await supabase
      .from('documents')
      .select('original_filename')
      .eq('entity_type', 'dog')
      .eq('entity_id', entry.entityId);

    if (existingErr) {
      console.error(`❌ ${label} — could not check existing documents: ${existingErr.message}`);
      failed++;
      continue;
    }

    const existingNames = new Set((existingDocs ?? []).map((d) => d.original_filename));
    if (existingNames.has(originalFilename)) {
      console.log(`⏭  ${label} — already imported (${originalFilename})`);
      skipped++;
      continue;
    }

    const nextIdx = (existingDocs ?? []).length + 1;
    const buffer = fs.readFileSync(entry.file);
    const ext = path.extname(originalFilename).replace('.', '').toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
    const safeFilename = sanitizeFilename(originalFilename);
    const storagePath = `dog/${entry.entityId}/${String(nextIdx).padStart(2, '0')}_${safeFilename}`;
    const documentName = originalFilename.replace(/\.[^.]+$/, '').trim();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mime, upsert: false });

    if (uploadError && !uploadError.message?.includes('already exists')) {
      console.error(`❌ ${label} — upload failed: ${uploadError.message}`);
      failed++;
      continue;
    }

    const { error: insertError } = await supabase.from('documents').insert({
      entity_type: 'dog',
      entity_id: entry.entityId,
      document_name: documentName,
      original_filename: originalFilename,
      storage_path: storagePath,
      file_type: ext,
      file_size_bytes: buffer.length,
      mime_type: mime,
      category: 'pedigree',
      is_public: false,
      client_visible: true,
      requires_auth: true,
    });

    if (insertError) {
      console.error(`❌ ${label} — DB insert failed: ${insertError.message}`);
      failed++;
      continue;
    }

    console.log(`✅ ${label} — ${originalFilename}`);
    uploaded++;
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Uploaded: ${uploaded}`);
  console.log(`⏭  Skipped:  ${skipped}`);
  if (missing > 0) console.log(`⚠️  Missing:  ${missing}`);
  if (failed > 0) console.log(`❌ Failed:   ${failed}`);
  console.log('─────────────────────────────────\n');
}

run().catch((e) => {
  console.error('\n❌ Unexpected error:', e.message);
  process.exit(1);
});
