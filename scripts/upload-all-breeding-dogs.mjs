#!/usr/bin/env node
/**
 * upload-all-breeding-dogs.mjs
 * ─────────────────────────────
 * Uploads photos for all breeding stock dogs from the local
 * "Dobermann Photo's" folder to Supabase Storage.
 *
 * Usage:
 *   node scripts/upload-all-breeding-dogs.mjs
 *
 * Or upload a single dog by name:
 *   node scripts/upload-all-breeding-dogs.mjs HunterKing
 *
 * Requirements (run once in project root):
 *   npm install @supabase/supabase-js sharp
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── resolve paths ────────────────────────────────────────────────────────────
const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ─── load .env.local ─────────────────────────────────────────────────────────
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = path.join(projectRoot, 'diedericksdobermann-web', '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key?.trim() && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

// ─── config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://nlmwxodvquwbjinhhbmr.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = 'dog-media';
const SUPPORTED    = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);

// ─── PHOTO BASE FOLDERS ───────────────────────────────────────────────────────
// PHOTO_BASE_OVERRIDE lets this run from a non-Windows shell (e.g. a sandbox)
// without touching the default path used on Matt's own machine.
const PHOTO_BASE      = process.env.PHOTO_BASE_OVERRIDE || `C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's`;
const PHOTO_BASE_SOLD = process.env.PHOTO_BASE_OVERRIDE ? `${process.env.PHOTO_BASE_OVERRIDE}/Sold` : `C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's\\Sold`;

// ─── DOG MANIFEST ─────────────────────────────────────────────────────────────
// folder:     subfolder name inside PHOTO_BASE (or PHOTO_BASE_SOLD for sold dogs)
// id:         UUID from Supabase dogs table
// status:     matches dogs.status in DB
// baseFolder: override the root folder (for sold dogs in the Sold subfolder)
const DOGS = [
  // ── Active breeding females ──────────────────────────────────────────────────
  { folder: 'Cendra',    id: '7b8de2c4-6a98-441f-996e-71d19341a809', status: 'keep' },
  { folder: 'Hailey',   id: 'fb33005e-f4a6-4bf8-b0ff-a13a7c396d86', status: 'keep' },
  { folder: 'Claire',   id: 'bb08f772-5a26-47c5-94f1-8768907a191c', status: 'keep' },
  { folder: 'Cyrus',    id: '1b9c5fdb-c30e-45d3-9cd9-1a1ff7e05d25', status: 'keep' },
  { folder: 'Cleopatra',id: 'f0932f8d-c907-4f62-aa68-9334955927a7', status: 'keep' },
  { folder: 'Hannah',   id: 'a37f2cfc-56df-4ab3-99a8-a41c4eda96c3', status: 'keep' },
  { folder: 'Odessa',   id: '9537e604-9aa2-456a-9d87-71dc3f093dc1', status: 'keep' },
  { folder: 'Kim',      id: '2be75604-740f-4076-954d-53d434f3455d', status: 'keep' },
  { folder: 'Shanti',   id: '3e9c384e-42c6-46d2-9f61-ae04960e3407', status: 'sold', baseFolder: PHOTO_BASE_SOLD },

  // ── Active studs ─────────────────────────────────────────────────────────────
  { folder: 'HunterKing', id: '930e1c41-807d-4e3a-9e4a-50a18c008acd', status: 'stud' },
  { folder: 'Hugo',       id: 'e1e419da-933a-45ec-9660-57dd2c6655c3', status: 'stud' },
  { folder: 'Santini',    id: 'c54ae0cf-dcba-4d83-a0eb-b6823132b0d1', status: 'stud' },
  { folder: 'Dharka',     id: '506c9e4d-8a02-4750-af7a-f4340e65e7b0', status: 'stud' },

  // ── Dogs in training ─────────────────────────────────────────────────────────
  { folder: 'Bruce',    id: 'f4fb4826-cb2a-4294-9f42-ce4b6ff20348', status: 'in_training' },
  { folder: 'Jazzmine', id: '1f181a7d-c9d9-4d79-a4eb-54bc4dcf1e1d', status: 'in_training' },

  // ── Deceased (legacy) ────────────────────────────────────────────────────────
  { folder: 'Celsea',  id: '22944bef-eb42-4d3b-9395-a926513406aa', status: 'deceased' },
  { folder: 'Cuba',    id: 'b7d04552-fec1-43b3-b0a5-6ec6d0d81863', status: 'deceased' },
  { folder: 'Cait',   id: '3f5c6b20-98e5-4797-a1d7-c2c152183c78', status: 'deceased' },
  { folder: 'Chester', id: '01be0b46-6cd0-44b8-9378-e2e8443d6dd2', status: 'deceased' },

  // ── Sold dogs (photos inside Sold subfolder) ─────────────────────────────────
  { folder: 'Ade',    id: '3d36733e-58e6-4fd2-91d5-1dce2aa868c1', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Bliksem',id: '1c273986-8136-4199-9aeb-295ed422f0fa', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Boomer', id: '841b37dc-a0ac-47ce-81c5-279af53e5ebf', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Dexter', id: '2f73003f-f649-43c4-9a6c-8128fcfd6ff9', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Eben',   id: '9323ac7c-3547-4576-9594-9d2b01ed7f0f', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Hazel',  id: 'eab62ea0-5a41-4af8-8cdc-4b0f6dff8ef2', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Liv',    id: '10a36427-d786-4e9e-af15-eccee2f3651a', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Loki',   id: 'a674b31b-08a2-4f15-bda9-bf9562f06761', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Miles',  id: '5dafb461-3116-460e-b139-13d06919d148', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Raptor', id: '3c8c4ff6-c6b5-46a6-a089-a9b225ecc1ce', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Zara',   id: '9c6071f1-d465-4a2f-86fc-8f2089974828', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
  { folder: 'Zues',   id: '94fb5036-b7ff-4ed0-95c9-3fa8719c2d73', status: 'sold', baseFolder: PHOTO_BASE_SOLD },
];

if (!SERVICE_KEY) {
  console.error('\n❌  Missing SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── helpers ─────────────────────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function getNextSortOrder(dogId) {
  const { data } = await supabase
    .from('dog_media')
    .select('sort_order')
    .eq('dog_id', dogId)
    .order('sort_order', { ascending: false })
    .limit(1);
  return (data?.[0]?.sort_order ?? -1) + 1;
}

async function uploadBuffer(storagePath, buffer) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function getExistingOutNames(dogId) {
  const { data } = await supabase
    .from('dog_media')
    .select('url')
    .eq('dog_id', dogId)
    .eq('type', 'photo');
  // url looks like .../dogs/{dogId}/{outName} — pull the last path segment.
  return new Set((data ?? []).map(row => row.url.split('/').pop()));
}

async function processdog(dog) {
  const folderPath = path.join(dog.baseFolder ?? PHOTO_BASE, dog.folder);
  if (!fs.existsSync(folderPath)) {
    console.log(`  ⚠  Folder not found: ${folderPath} — skipping`);
    return { uploaded: 0, failed: 0 };
  }

  const files = (await fsp.readdir(folderPath))
    .filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log(`  ⚠  No images found — skipping`);
    return { uploaded: 0, failed: 0 };
  }

  let sortOrder = await getNextSortOrder(dog.id);
  let uploaded = 0, failed = 0, skipped = 0;
  const slug = slugify(dog.folder);
  const existingOutNames = await getExistingOutNames(dog.id);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const baseName = path.basename(file, path.extname(file))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 60);
    const outName   = `${slug}-${baseName}.jpg`;
    const mainPath  = `dogs/${dog.id}/${outName}`;
    const thumbPath = `dogs/${dog.id}/thumbs/${outName}`;

    process.stdout.write(`    ${file.substring(0, 50).padEnd(52)} `);

    // Skip files already linked in dog_media for this dog — prevents duplicate
    // rows when this script is re-run over a folder that has new + old photos mixed.
    if (existingOutNames.has(outName)) {
      console.log('↷  already uploaded');
      skipped++;
      continue;
    }

    try {
      const image = sharp(filePath).rotate();
      const [mainBuf, thumbBuf] = await Promise.all([
        image.clone().jpeg({ quality: 88, progressive: true }).toBuffer(),
        image.clone().resize(480, 480, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer(),
      ]);

      const [url, thumbnailUrl] = await Promise.all([
        uploadBuffer(mainPath, mainBuf),
        uploadBuffer(thumbPath, thumbBuf),
      ]);

      const { error } = await supabase.from('dog_media').insert({
        dog_id: dog.id,
        url,
        thumbnail_url: thumbnailUrl,
        type: 'photo',
        is_primary: sortOrder === 0,
        sort_order: sortOrder,
      });
      if (error) throw new Error(error.message);

      console.log(`✓`);
      sortOrder++;
      uploaded++;
    } catch (e) {
      console.log(`✗  ${e.message}`);
      failed++;
    }
  }
  return { uploaded, failed, skipped };
}

// ─── main ────────────────────────────────────────────────────────────────────
async function run() {
  const filterArg = process.argv[2]?.toLowerCase();
  const targets = filterArg
    ? DOGS.filter(d => d.folder.toLowerCase() === filterArg)
    : DOGS;

  if (targets.length === 0) {
    console.error(`\nNo dog named "${process.argv[2]}" in manifest.\n`);
    console.log('Available:', DOGS.map(d => d.folder).join(', '));
    process.exit(1);
  }

  console.log(`\n🐾  Uploading photos for ${targets.length} dog(s)\n`);
  let totalUploaded = 0, totalFailed = 0, totalSkipped = 0;

  for (const dog of targets) {
    console.log(`\n── ${dog.folder} (${dog.status}) ──`);
    const { uploaded, failed, skipped } = await processdog(dog);
    totalUploaded += uploaded;
    totalFailed   += failed;
    totalSkipped  += skipped;
    console.log(`   ${uploaded} uploaded, ${skipped} already uploaded (skipped), ${failed} failed`);
  }

  console.log(`\n✅  Complete — ${totalUploaded} total uploaded, ${totalSkipped} skipped (already existed), ${totalFailed} failed\n`);
}

run().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
