/**
 * Uploads the three scanned Santini documents to Supabase Storage and links them
 * to Santini's dog profile.
 *
 * WHY THIS EXISTS
 * Matt scanned three documents on 21 Aug 2026 into
 *   Dobermann Photo's\Santini Doc's
 * They are scanned images with no text layer, so their contents could not be read
 * to name them. They are uploaded with neutral placeholder names and Matt will
 * rename and categorise them from the dog profile later.
 *
 * HOW TO RUN — must be run from the WEBSITE folder, which is where
 * @supabase/supabase-js is installed (the project root has no node_modules):
 *
 *   cd "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App\diedericksdobermann-web"
 *   node ../scripts/upload-santini-docs.mjs
 *
 * The service role key is read from diedericksdobermann-web/.env.local automatically,
 * same as upload-litter-announcement.mjs. Nothing to set by hand.
 *
 * SAFETY
 * - Idempotent: the storage path is derived from the source filename, so re-running
 *   overwrites the same object rather than piling up duplicates.
 * - Skips inserting a documents row if one already points at that storage path.
 * - Santini already has 12 documents. These three are ADDED; nothing is replaced or
 *   deleted. If any turn out to be rescans of what is already there, delete the
 *   duplicate from the dog profile afterwards.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = path.join(projectRoot, 'diedericksdobermann-web', '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
    console.log('Loaded .env.local');
  }
}

const SUPABASE_URL = 'https://nlmwxodvquwbjinhhbmr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'documents';

// Santini — verified against the live database 21 Aug 2026.
const SANTINI_ID = 'c54ae0cf-dcba-4d83-a0eb-b6823132b0d1';

const SOURCE_DIR =
  "C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's\\Santini Doc's";

const FILES = [
  'doc07862320260821081858.pdf',
  'doc07862520260821082011.pdf',
  'doc07862620260821082038.pdf',
];

if (!SERVICE_KEY) {
  console.error('\nERROR: could not find SUPABASE_SERVICE_ROLE_KEY.\n');
  console.error('Expected it in: diedericksdobermann-web\\.env.local');
  console.error('Run this script from the website folder:\n');
  console.error('  cd "...\\diedericksdobermann App\\diedericksdobermann-web"');
  console.error('  node ../scripts/upload-santini-docs.mjs\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  let ok = 0;
  let skipped = 0;

  for (const [i, file] of FILES.entries()) {
    const localPath = path.join(SOURCE_DIR, file);
    const label = `Santini — scanned document ${i + 1} (to be labelled)`;
    console.log(`\n--- ${file} ---`);

    let bytes;
    try {
      bytes = await readFile(localPath);
    } catch {
      console.error(`  SKIPPED - file not found:\n    ${localPath}`);
      continue;
    }

    // Deterministic path so a re-run replaces rather than duplicates.
    const storagePath = `dog/${SANTINI_ID}/${file}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (upErr) {
      console.error(`  UPLOAD FAILED: ${upErr.message}`);
      continue;
    }

    // Do not create a second documents row for the same object on a re-run.
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('storage_path', storagePath)
      .maybeSingle();

    if (existing) {
      console.log(`  uploaded -> ${storagePath}`);
      console.log('  documents row already exists — left alone');
      skipped++;
      continue;
    }

    const { error: insErr } = await supabase.from('documents').insert({
      entity_type: 'dog',
      entity_id: SANTINI_ID,
      document_name: label,
      original_filename: file,
      storage_path: storagePath,
      file_type: 'pdf',
      mime_type: 'application/pdf',
      file_size_bytes: bytes.length,
      category: 'other',          // Matt will re-categorise from the profile
      is_public: false,           // private until he confirms what each one is
      client_visible: false,
      description:
        'Scanned 21 Aug 2026. Contents not machine-readable, so it was uploaded ' +
        'unlabelled. Rename and set the correct category from the dog profile.',
    });

    if (insErr) {
      console.error(`  DB LINK FAILED: ${insErr.message}`);
      continue;
    }

    console.log(`  uploaded -> ${storagePath}`);
    console.log(`  linked   -> Santini's profile as "${label}"`);
    ok++;
  }

  console.log(`\nDone. ${ok} uploaded and linked, ${skipped} already present.`);
  console.log('Open Santini at /admin/dogs/' + SANTINI_ID + ' to rename and categorise them.\n');
}

run().catch((e) => {
  console.error('\nUnexpected failure:', e);
  process.exit(1);
});
