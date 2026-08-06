/**
 * upload-gallery-photos.mjs
 *
 * Uploads photos from a local folder to Supabase storage (bucket: gallery)
 * and registers them in the gallery_items table under a category.
 *
 * Usage:
 *   node scripts/upload-gallery-photos.mjs "<category>" "<Display Title>" "<Path to folder>"
 *
 * Examples:
 *   node scripts/upload-gallery-photos.mjs "competitions" "Competitions" "C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's\Compititions"
 *
 * Idempotent: skips any file whose public URL is already in gallery_items,
 * so it's safe to re-run after adding new photos to the folder.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set in .env
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Load .env manually (no dotenv dependency needed)
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

const SUPABASE_URL = env['EXPO_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'your-service-role-key-here') {
  console.error('\n❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('   Get it from: Supabase Dashboard → Project Settings → API → service_role');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const [, , category, displayTitle, photoFolder] = process.argv;

if (!category || !displayTitle || !photoFolder) {
  console.error('\nUsage: node scripts/upload-gallery-photos.mjs "<category>" "<Display Title>" "<Path to folder>"\n');
  process.exit(1);
}

if (!fs.existsSync(photoFolder)) {
  console.error(`\n❌ Folder not found: ${photoFolder}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supported image extensions
// ---------------------------------------------------------------------------
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = 'gallery';
const safeCategory = category.toLowerCase().trim();

// Matches the sanitization already used for existing gallery_items rows:
// spaces/punctuation -> underscores, keep alnum, force .jpg extension.
function sanitizeFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  const cleaned = base.replace(/[^a-zA-Z0-9]/g, '_');
  return `${cleaned}.jpg`;
}

async function run() {
  console.log(`\n🖼  Uploading gallery photos for category: ${safeCategory}`);
  console.log(`📁 Source folder: ${photoFolder}\n`);

  // 1. Get existing media URLs in this category to avoid duplicates
  const { data: existing, error: existingError } = await supabase
    .from('gallery_items')
    .select('image_url, sort_order')
    .eq('category', safeCategory);

  if (existingError) {
    console.error(`❌ Could not read existing gallery_items: ${existingError.message}`);
    process.exit(1);
  }

  const existingUrls = new Set((existing ?? []).map((m) => m.image_url));
  const startSortOrder = (existing ?? []).length
    ? Math.max(...existing.map((m) => m.sort_order ?? 0)) + 1
    : 0;

  // 2. Read photo files from folder
  const files = fs.readdirSync(photoFolder).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTS.includes(ext);
  });

  if (files.length === 0) {
    console.warn('⚠️  No image files found in folder.');
    process.exit(0);
  }

  console.log(`📸 Found ${files.length} image(s) in folder\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let nextSortOrder = startSortOrder;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const cleanName = sanitizeFilename(filename);
    const storagePath = `${safeCategory}/${safeCategory}-${cleanName}`;
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    // Skip if already in gallery_items
    if (existingUrls.has(publicUrl)) {
      console.log(`  ⏭  [${i + 1}/${files.length}] Already uploaded — ${filename}`);
      skipped++;
      continue;
    }

    const filePath = path.join(photoFolder, filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError && !uploadError.message?.includes('already exists')) {
      console.error(`  ❌ [${i + 1}/${files.length}] Upload failed — ${filename}: ${uploadError.message}`);
      failed++;
      continue;
    }

    // Insert into gallery_items
    const { error: insertError } = await supabase.from('gallery_items').insert({
      category: safeCategory,
      title: displayTitle,
      image_url: publicUrl,
      is_featured: false,
      sort_order: nextSortOrder,
    });

    if (insertError) {
      console.error(`  ❌ [${i + 1}/${files.length}] DB insert failed — ${filename}: ${insertError.message}`);
      failed++;
      continue;
    }

    console.log(`  ✅ [${i + 1}/${files.length}] ${filename}`);
    uploaded++;
    nextSortOrder++;
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Uploaded:  ${uploaded}`);
  console.log(`⏭  Skipped:   ${skipped}`);
  if (failed > 0) console.log(`❌ Failed:    ${failed}`);
  console.log('─────────────────────────────────\n');

  if (uploaded > 0) {
    console.log(`🎉 ${displayTitle} photos are live in the app!\n`);
  }
}

run().catch((e) => {
  console.error('\n❌ Unexpected error:', e.message);
  process.exit(1);
});
