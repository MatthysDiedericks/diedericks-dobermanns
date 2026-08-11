/**
 * Uploads litter announcement posters to Supabase Storage and links them to a litter.
 *
 * WHY THIS EXISTS
 * The announcement poster is a designed asset (sire/dam, expected date, health
 * results, contact) that acts as the headline image for a litter on the public
 * site. It lives in `litters.announcement_image_url`.
 *
 * HOW TO RUN — must be run from the WEBSITE folder, which is where
 * @supabase/supabase-js is actually installed (the project root has no
 * node_modules of its own):
 *
 *   cd "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App\diedericksdobermann-web"
 *   node ../scripts/upload-litter-announcement.mjs
 *
 * No key needs setting by hand: the service role key is read from
 * diedericksdobermann-web/.env.local automatically (same behaviour as
 * scripts/upload-dog-photos.mjs). Falls back to the SUPABASE_SERVICE_ROLE_KEY
 * environment variable if that file is missing.
 *
 * TO ADD MORE LITTERS LATER: add another entry to UPLOADS below. The script is
 * idempotent — re-running it overwrites the stored file and re-links the same URL.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

// Load .env.local if the key isn't already in the environment — mirrors the
// loader in upload-dog-photos.mjs so both scripts behave identically.
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
const BUCKET = 'dog-media';

const ANNOUNCEMENTS_DIR =
  "C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's\\Litter Anouncements";

/** One entry per litter. `file` is relative to ANNOUNCEMENTS_DIR. */
const UPLOADS = [
  {
    litterId: 'e434905e-3769-43fe-9506-ce28e6158dcb', // Hannah × Hunter-King – Jul 2026
    label: 'Hannah x Hunter-King',
    file: 'WhatsApp Image 2026-07-29 at 16.30.47.jpeg',
  },
  {
    // Santini × Odessa, also expecting 24 Sep 2026. The litter record and its
    // waiting list are already live; only the poster artwork is missing.
    litterId: '81378dfc-4bbb-4f0f-8ee9-66faf277b2b9',
    label: 'Santini x Odessa',
    file: 'WhatsApp Image 2026-08-06 at 16.56.47.jpeg',
  },
];

if (!SERVICE_KEY) {
  console.error('\nERROR: could not find SUPABASE_SERVICE_ROLE_KEY.\n');
  console.error('Expected it in: diedericksdobermann-web\\.env.local');
  console.error('Run this script from the website folder:\n');
  console.error('  cd "...\\diedericksdobermann App\\diedericksdobermann-web"');
  console.error('  node ../scripts/upload-litter-announcement.mjs\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function run() {
  let ok = 0;

  for (const item of UPLOADS) {
    const localPath = path.join(ANNOUNCEMENTS_DIR, item.file);
    console.log(`\n--- ${item.label} ---`);

    let bytes;
    try {
      bytes = await readFile(localPath);
    } catch {
      console.error(`  SKIPPED - file not found:\n    ${localPath}`);
      continue;
    }

    // Deterministic path keyed on litter id, so re-running replaces rather than
    // accumulating orphaned files.
    const ext = path.extname(item.file).toLowerCase() || '.jpeg';
    const storagePath = `litters/${item.litterId}/announcement${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: contentTypeFor(item.file),
        upsert: true,
      });

    if (upErr) {
      console.error(`  UPLOAD FAILED: ${upErr.message}`);
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const { error: updErr } = await supabase
      .from('litters')
      .update({ announcement_image_url: publicUrl })
      .eq('id', item.litterId);

    if (updErr) {
      console.error(`  DB LINK FAILED: ${updErr.message}`);
      continue;
    }

    console.log(`  uploaded -> ${storagePath}`);
    console.log(`  linked   -> ${publicUrl}`);
    ok++;
  }

  console.log(`\nDone. ${ok}/${UPLOADS.length} announcement(s) uploaded and linked.`);
  console.log('The website picks these up within ~60s (ISR revalidate).\n');
}

run().catch((e) => {
  console.error('\nUnexpected failure:', e);
  process.exit(1);
});
