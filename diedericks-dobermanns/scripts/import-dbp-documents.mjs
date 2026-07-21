/**
 * import-dbp-documents.mjs
 *
 * One-time import of documents fetched from DogBreederPro (DBP) into
 * Supabase Storage + the `documents` table, so they show up in the app
 * under each dog's Documents tab (and the kennel-wide Documents screen).
 *
 * WHY this script exists (not run from Claude's sandbox):
 * Claude's sandbox has no outbound network route to Supabase's API — any
 * script that uploads files or writes data must be run here, on your own
 * machine, where normal internet access works.
 *
 * WHAT it does:
 *   1. Reads each dog's/kennel's zip file straight out of your Downloads
 *      folder (no need to unzip anything yourself — and unzipping onto a
 *      OneDrive-synced folder is unsafe here anyway, since a couple of the
 *      DBP filenames collide once Windows' case-insensitive filesystem
 *      gets involved, e.g. "hannah.jpg" vs "HANNAH.jpg").
 *   2. For every file inside each zip: guesses a sensible `documents.category`
 *      from the filename, uploads the raw bytes to the private `documents`
 *      storage bucket, and inserts one row into the `documents` table
 *      (entity_type='dog'|'kennel', entity_id=<uuid>).
 *   3. Skips anything already imported (checked by entity + original
 *      filename), so it's safe to re-run if it stops partway through.
 *
 * Usage:
 *   npm install jszip --save-dev      (one-time, if not already installed)
 *   node scripts/import-dbp-documents.mjs
 *
 * Optional: point at a different folder than the default Downloads path:
 *   node scripts/import-dbp-documents.mjs "C:\path\to\zips"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set in .env (the real secret
 * key from Supabase Dashboard → Project Settings → API → service_role,
 * not the publishable/anon key).
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

// ---------------------------------------------------------------------------
// Load .env manually (matches the pattern used by upload-dog-photos.mjs)
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
// Zip -> dog mapping (Supabase dogs.id, confirmed 2026-07-21)
// ---------------------------------------------------------------------------
const KENNEL_ENTITY_ID = '50fe30fb-8c93-4018-9ac9-21a808efc49b';

const IMPORT_MAP = [
  { zip: 'dog_3074215802535150658_Cendra.zip', entityType: 'dog', entityId: '7b8de2c4-6a98-441f-996e-71d19341a809', label: 'Cendra' },
  { zip: 'dog_2669849266976982670_Claire_retry.zip', entityType: 'dog', entityId: 'bb08f772-5a26-47c5-94f1-8768907a191c', label: 'Claire' },
  { zip: 'dog_3223310987935352494_Cleopatra.zip', entityType: 'dog', entityId: 'f0932f8d-c907-4f62-aa68-9334955927a7', label: 'Cleopatra' },
  { zip: 'dog_2669842483269076499_Cyrus.zip', entityType: 'dog', entityId: '1b9c5fdb-c30e-45d3-9cd9-1a1ff7e05d25', label: 'Cyrus' },
  { zip: 'dog_2690090248901232447_Dharka.zip', entityType: 'dog', entityId: '506c9e4d-8a02-4750-af7a-f4340e65e7b0', label: 'Dharka' },
  { zip: 'dog_2669851702357656606_Hailey.zip', entityType: 'dog', entityId: 'fb33005e-f4a6-4bf8-b0ff-a13a7c396d86', label: 'Hailey' },
  { zip: 'dog_3191770985615328724_Hannah.zip', entityType: 'dog', entityId: 'a37f2cfc-56df-4ab3-99a8-a41c4eda96c3', label: 'Hannah' },
  { zip: 'dog_2669125589423621159_HunterKing.zip', entityType: 'dog', entityId: '930e1c41-807d-4e3a-9e4a-50a18c008acd', label: 'Hunter-King' },
  { zip: 'dog_2690058054371640572_Odessa.zip', entityType: 'dog', entityId: '9537e604-9aa2-456a-9d87-71dc3f093dc1', label: 'Odessa' },
  { zip: 'dog_3759203744890225882_Santini.zip', entityType: 'dog', entityId: 'c54ae0cf-dcba-4d83-a0eb-b6823132b0d1', label: 'Santini' },
  { zip: 'kennel_documents_DiedericksDobermanns.zip', entityType: 'kennel', entityId: KENNEL_ENTITY_ID, label: 'Kennel (company documents)' },
];

// ---------------------------------------------------------------------------
// Category guessing — must match the documents_category_check constraint
// ---------------------------------------------------------------------------
function guessCategory(filename) {
  const n = filename.toLowerCase();
  if (/cardiomyopathy|dcm|rbm20|titin|pdk4|von willebrand/.test(n)) return 'dna_test';
  if (/hip.*elbow|elbow.*hip/.test(n)) return 'hip_elbow_score';
  if (/pedigree/.test(n)) return 'pedigree';
  if (/kusa|regcert|register a single dog|breed register|registration/.test(n)) return 'registration';
  if (/microchip/.test(n)) return 'microchip';
  if (/vaccination/.test(n)) return 'vaccination_record';
  if (/eye test|cerf/.test(n)) return 'eye_test';
  if (/heart.*test/.test(n)) return 'heart_test';
  if (/import permit/.test(n)) return 'import_permit';
  if (/export permit/.test(n)) return 'export_permit';
  if (/insurance/.test(n)) return 'insurance';
  if (/show certificate/.test(n)) return 'show_certificate';
  return 'other';
}

// ---------------------------------------------------------------------------
// Magic-byte sniffing for the handful of DBP files with no extension
// ---------------------------------------------------------------------------
function sniffExtAndMime(buffer, fallbackExt) {
  if (buffer.length >= 4) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return { ext: 'jpg', mime: 'image/jpeg' };
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return { ext: 'png', mime: 'image/png' };
    if (buffer.slice(0, 4).toString('ascii') === '%PDF') return { ext: 'pdf', mime: 'application/pdf' };
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) return { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }
  return { ext: fallbackExt || 'bin', mime: 'application/octet-stream' };
}

const MIME_BY_EXT = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._ -]/g, '_').trim();
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const zipFolder = process.argv[2] || path.join(os.homedir(), 'Downloads');

async function run() {
  console.log(`\n📂 Reading zips from: ${zipFolder}\n`);

  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const entry of IMPORT_MAP) {
    const zipPath = path.join(zipFolder, entry.zip);
    if (!fs.existsSync(zipPath)) {
      console.warn(`⚠️  Skipping ${entry.label} — zip not found at ${zipPath}`);
      continue;
    }

    console.log(`\n🐕 ${entry.label}`);
    console.log(`   ${entry.zip}`);

    const { data: existingDocs, error: existingErr } = await supabase
      .from('documents')
      .select('original_filename')
      .eq('entity_type', entry.entityType)
      .eq('entity_id', entry.entityId);

    if (existingErr) {
      console.error(`   ❌ Could not check existing documents: ${existingErr.message}`);
      continue;
    }
    const existingNames = new Set((existingDocs ?? []).map((d) => d.original_filename));

    const zipBuffer = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipBuffer);
    const fileEntries = Object.values(zip.files).filter((f) => !f.dir);

    let idx = 0;
    for (const fileEntry of fileEntries) {
      idx++;
      const originalFilename = fileEntry.name;

      if (existingNames.has(originalFilename)) {
        console.log(`   ⏭  [${idx}/${fileEntries.length}] Already imported — ${originalFilename}`);
        totalSkipped++;
        continue;
      }

      const buffer = Buffer.from(await fileEntry.async('nodebuffer'));
      const extFromName = path.extname(originalFilename).replace('.', '').toLowerCase();

      let ext = extFromName;
      let mime = MIME_BY_EXT[extFromName];
      if (!ext || !mime) {
        const sniffed = sniffExtAndMime(buffer, extFromName);
        ext = sniffed.ext;
        mime = sniffed.mime;
      }

      const baseName = originalFilename.replace(/\.[^.]+$/, '');
      const documentName = baseName.trim() || originalFilename;
      const safeFilename = sanitizeFilename(originalFilename);
      const storagePath = `${entry.entityType}/${entry.entityId}/${String(idx).padStart(2, '0')}_${safeFilename}`;
      const category = guessCategory(originalFilename);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: mime, upsert: false });

      if (uploadError && !uploadError.message?.includes('already exists')) {
        console.error(`   ❌ [${idx}/${fileEntries.length}] Upload failed — ${originalFilename}: ${uploadError.message}`);
        totalFailed++;
        continue;
      }

      const { error: insertError } = await supabase.from('documents').insert({
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        document_name: documentName,
        original_filename: originalFilename,
        storage_path: storagePath,
        file_type: ext,
        file_size_bytes: buffer.length,
        mime_type: mime,
        category,
        is_public: false,
        client_visible: entry.entityType === 'dog',
        requires_auth: true,
      });

      if (insertError) {
        console.error(`   ❌ [${idx}/${fileEntries.length}] DB insert failed — ${originalFilename}: ${insertError.message}`);
        totalFailed++;
        continue;
      }

      console.log(`   ✅ [${idx}/${fileEntries.length}] ${originalFilename}  →  ${category}`);
      totalUploaded++;
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Uploaded: ${totalUploaded}`);
  console.log(`⏭  Skipped:  ${totalSkipped}`);
  if (totalFailed > 0) console.log(`❌ Failed:   ${totalFailed}`);
  console.log('─────────────────────────────────\n');
}

run().catch((e) => {
  console.error('\n❌ Unexpected error:', e.message);
  process.exit(1);
});
