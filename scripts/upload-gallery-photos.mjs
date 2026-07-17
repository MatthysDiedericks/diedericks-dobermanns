#!/usr/bin/env node
/**
 * upload-gallery-photos.mjs
 * ──────────────────────────
 * Uploads photos to the PUBLIC gallery (not tied to a specific dog) —
 * the "gallery" Storage bucket + gallery_items table used by the
 * public Gallery / homepage section of the app and website.
 *
 * This is a different system from dog_media (dog profile photos) —
 * use upload-all-breeding-dogs.mjs for individual dog profiles instead.
 *
 * Usage:
 *   node scripts/upload-gallery-photos.mjs
 *
 * Or upload a single category by folder name:
 *   node scripts/upload-gallery-photos.mjs Puppies
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

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
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
const BUCKET        = 'gallery';
const SUPPORTED     = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);
const PHOTO_BASE    = process.env.PHOTO_BASE_OVERRIDE || `C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's`;

// ─── CATEGORY MANIFEST ────────────────────────────────────────────────────────
// folder:   subfolder name inside PHOTO_BASE
// category: matches gallery_items.category — used for storage folder + tag
const CATEGORIES = [
  { folder: 'Puppies', category: 'puppies', title: 'Puppies' },
];

if (!SERVICE_KEY) {
  console.error('\n❌  Missing SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function getNextSortOrder(category) {
  const { data } = await supabase
    .from('gallery_items')
    .select('sort_order')
    .eq('category', category)
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

async function getExistingOutNames(category) {
  const { data } = await supabase
    .from('gallery_items')
    .select('image_url')
    .eq('category', category);
  return new Set((data ?? []).map(row => row.image_url?.split('/').pop()).filter(Boolean));
}

async function processCategory(cat) {
  const folderPath = path.join(PHOTO_BASE, cat.folder);
  if (!fs.existsSync(folderPath)) {
    console.log(`  ⚠  Folder not found: ${folderPath} — skipping`);
    return { uploaded: 0, failed: 0, skipped: 0 };
  }

  const files = (await fsp.readdir(folderPath))
    .filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log(`  ⚠  No images found — skipping`);
    return { uploaded: 0, failed: 0, skipped: 0 };
  }

  let sortOrder = await getNextSortOrder(cat.category);
  let uploaded = 0, failed = 0, skipped = 0;
  const existingOutNames = await getExistingOutNames(cat.category);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const baseName = path.basename(file, path.extname(file))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 60);
    const outName     = `${cat.category}-${baseName}.jpg`;
    const storagePath = `${cat.category}/${outName}`;

    process.stdout.write(`    ${file.substring(0, 50).padEnd(52)} `);

    if (existingOutNames.has(outName)) {
      console.log('↷  already uploaded');
      skipped++;
      continue;
    }

    try {
      const buffer = await sharp(filePath).rotate().jpeg({ quality: 88, progressive: true }).toBuffer();
      const imageUrl = await uploadBuffer(storagePath, buffer);

      const { error } = await supabase.from('gallery_items').insert({
        title: cat.title,
        category: cat.category,
        image_url: imageUrl,
        is_featured: false,
        sort_order: sortOrder,
      });
      if (error) throw new Error(error.message);

      console.log('✓');
      sortOrder++;
      uploaded++;
    } catch (e) {
      console.log(`✗  ${e.message}`);
      failed++;
    }
  }
  return { uploaded, failed, skipped };
}

async function run() {
  const filterArg = process.argv[2]?.toLowerCase();
  const targets = filterArg
    ? CATEGORIES.filter(c => c.folder.toLowerCase() === filterArg)
    : CATEGORIES;

  if (targets.length === 0) {
    console.error(`\nNo category folder named "${process.argv[2]}" in manifest.\n`);
    console.log('Available:', CATEGORIES.map(c => c.folder).join(', '));
    process.exit(1);
  }

  console.log(`\n🖼️   Uploading gallery photos for ${targets.length} categor${targets.length === 1 ? 'y' : 'ies'}\n`);
  let totalUploaded = 0, totalFailed = 0, totalSkipped = 0;

  for (const cat of targets) {
    console.log(`\n── ${cat.folder} (${cat.category}) ──`);
    const { uploaded, failed, skipped } = await processCategory(cat);
    totalUploaded += uploaded;
    totalFailed   += failed;
    totalSkipped  += skipped;
    console.log(`   ${uploaded} uploaded, ${skipped} already uploaded (skipped), ${failed} failed`);
  }

  console.log(`\n✅  Complete — ${totalUploaded} total uploaded, ${totalSkipped} skipped (already existed), ${totalFailed} failed\n`);
}

run().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
