#!/usr/bin/env node
/**
 * upload-dog-photos.mjs
 * ─────────────────────
 * Converts HEIC/HEIF/JPG/PNG photos to JPEG, uploads them to Supabase Storage
 * (dog-media bucket), generates thumbnails, and inserts dog_media rows.
 *
 * Usage:
 *   node scripts/upload-dog-photos.mjs <photo-folder> <dog-id> [dog-name]
 *
 * Example:
 *   node scripts/upload-dog-photos.mjs "C:\Users\mathy\Downloads\Cendra" 7b8de2c4-6a98-441f-996e-71d19341a809 Cendra
 *
 * Requirements (run once):
 *   npm install @supabase/supabase-js sharp dotenv
 *
 * The script reads SUPABASE_SERVICE_ROLE_KEY from the environment or from
 * diedericksdobermann-web/.env.local automatically.
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── resolve project root ────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ─── load .env.local if no env key yet ──────────────────────────────────────
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = path.join(projectRoot, 'diedericksdobermann-web', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
    console.log('✓ Loaded .env.local');
  }
}

// ─── config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://nlmwxodvquwbjinhhbmr.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = 'dog-media';
const SUPPORTED    = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.gif']);

// ─── validate args ───────────────────────────────────────────────────────────
const [,, folderArg, dogId, dogName = 'dog'] = process.argv;

if (!folderArg || !dogId) {
  console.error('\nUsage: node scripts/upload-dog-photos.mjs <folder> <dog-id> [dog-name]\n');
  process.exit(1);
}

if (!SERVICE_KEY) {
  console.error('\nMissing SUPABASE_SERVICE_ROLE_KEY — set it as an env variable or add it to');
  console.error('diedericksdobermann-web/.env.local\n');
  process.exit(1);
}

const folderPath = path.resolve(folderArg);
if (!fs.existsSync(folderPath)) {
  console.error(`\nFolder not found: ${folderPath}\n`);
  process.exit(1);
}

// ─── supabase client (service role — server-side only) ───────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── helpers ─────────────────────────────────────────────────────────────────
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function getNextSortOrder() {
  const { data } = await supabase
    .from('dog_media')
    .select('sort_order')
    .eq('dog_id', dogId)
    .order('sort_order', { ascending: false })
    .limit(1);
  return (data?.[0]?.sort_order ?? -1) + 1;
}

async function uploadBuffer(storagePath, buffer, contentType = 'image/jpeg') {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return publicUrl;
}

// ─── main ────────────────────────────────────────────────────────────────────
async function run() {
  const files = (await fsp.readdir(folderPath))
    .filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log('No supported image files found in', folderPath);
    process.exit(0);
  }

  console.log(`\n📸  Found ${files.length} images for "${dogName}" (${dogId})`);
  console.log(`    Folder: ${folderPath}\n`);

  let sortOrder = await getNextSortOrder();
  let successCount = 0;
  const dogSlug = slugify(dogName);

  for (const file of files) {
    const filePath  = path.join(folderPath, file);
    const baseName  = path.basename(file, path.extname(file));
    const outName   = `${dogSlug}-${baseName}.jpg`;
    const mainPath  = `dogs/${dogId}/${outName}`;
    const thumbPath = `dogs/${dogId}/thumbs/${outName}`;

    process.stdout.write(`  [${String(successCount + 1).padStart(2)}/${files.length}] ${file} … `);

    try {
      // Convert to JPEG (sharp handles HEIC/HEIF/PNG/JPG/WEBP)
      const image = sharp(filePath).rotate(); // auto-rotate via EXIF

      const [mainBuf, thumbBuf] = await Promise.all([
        image.clone().jpeg({ quality: 88, progressive: true }).toBuffer(),
        image.clone().resize(480, 480, { fit: 'cover', position: 'centre' }).jpeg({ quality: 80 }).toBuffer(),
      ]);

      const [url, thumbnailUrl] = await Promise.all([
        uploadBuffer(mainPath, mainBuf),
        uploadBuffer(thumbPath, thumbBuf),
      ]);

      const { error: dbErr } = await supabase.from('dog_media').insert({
        dog_id:        dogId,
        url,
        thumbnail_url: thumbnailUrl,
        type:          'photo',
        is_primary:    sortOrder === 0,
        sort_order:    sortOrder,
        caption:       null,
      });

      if (dbErr) throw new Error(`DB insert: ${dbErr.message}`);

      console.log(`✓  (sort ${sortOrder}${sortOrder === 0 ? ', PRIMARY' : ''})`);
      sortOrder++;
      successCount++;
    } catch (e) {
      console.log(`✗  ${e.message}`);
    }
  }

  console.log(`\n✅  Done — ${successCount}/${files.length} photos uploaded for ${dogName}`);
  if (successCount < files.length) {
    console.log('   Some files failed — re-run to retry (upsert is safe).');
  }
}

run().catch((e) => {
  console.error('\nFatal:', e.message);
  process.exit(1);
});
