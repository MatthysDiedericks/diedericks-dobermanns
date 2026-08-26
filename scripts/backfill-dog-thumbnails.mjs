/**
 * Generates a real thumbnail file for every dog_media row that has none.
 *
 * RUN FROM THE WEBSITE FOLDER (sharp + @supabase/supabase-js live there):
 *   cd "...\diedericksdobermann App\diedericksdobermann-web"
 *   node ../scripts/backfill-dog-thumbnails.mjs
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY from diedericksdobermann-web/.env.local.
 * Idempotent: skips a row once thumbnail_url is set. Re-run is safe.
 *
 * Photos: download the original, write a 480×480 JPEG under
 * dogs/{dogId}/thumbs/{filename}, set thumbnail_url.
 * Videos: skipped — posters are a different pipeline
 * (diedericksdobermann-web/scripts/backfill-dog-video-posters.mts).
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = path.join(projectRoot, 'diedericksdobermann-web', '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nlmwxodvquwbjinhhbmr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'dog-media';
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

if (!SERVICE_KEY) {
  console.error('\nERROR: SUPABASE_SERVICE_ROLE_KEY not found. Run from the website folder.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function objectPathFromUrl(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

async function run() {
  const { data: rows, error } = await supabase
    .from('dog_media')
    .select('id, dog_id, type, url, thumbnail_url')
    .is('thumbnail_url', null);
  if (error) {
    console.error('QUERY FAILED:', error.message);
    process.exit(1);
  }

  console.log(`rows missing thumbnail_url: ${(rows ?? []).length}`);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const isVideo = row.type === 'video' || (row.url && !IMAGE_EXT.test(row.url));
    if (isVideo) {
      console.log(`skip video  ${row.id}`);
      skipped++;
      continue;
    }

    const objectPath = objectPathFromUrl(row.url ?? '');
    if (!objectPath) {
      console.error(`BAD URL  ${row.id}  ${row.url}`);
      failed++;
      continue;
    }

    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(objectPath);
    if (dlErr || !blob) {
      console.error(`DOWNLOAD FAILED  ${row.id}: ${dlErr?.message ?? 'empty'}`);
      failed++;
      continue;
    }

    const filename = path.posix.basename(objectPath).replace(/\.[^.]+$/, '.jpg');
    const thumbPath = `dogs/${row.dog_id}/thumbs/${filename}`;

    try {
      const bytes = Buffer.from(await blob.arrayBuffer());
      const thumbBuf = await sharp(bytes)
        .rotate()
        .resize(480, 480, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(thumbPath, thumbBuf, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath);
      const { error: dbErr } = await supabase
        .from('dog_media')
        .update({ thumbnail_url: pub.publicUrl })
        .eq('id', row.id);
      if (dbErr) throw new Error(dbErr.message);

      console.log(`thumb  ${row.dog_id}  ${filename}`);
      ok++;
    } catch (e) {
      console.error(`THUMB FAILED  ${row.id}: ${e.message}`);
      failed++;
    }
  }

  const { count } = await supabase
    .from('dog_media')
    .select('id', { count: 'exact', head: true })
    .is('thumbnail_url', null);

  console.log(`\nDone. ${ok} thumbs written, ${skipped} videos skipped, ${failed} failed.`);
  console.log(`dog_media.thumbnail_url still null: ${count ?? '?'}`);
}

run().catch((e) => {
  console.error('Unexpected failure:', e);
  process.exit(1);
});
