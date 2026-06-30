/**
 * upload-dog-photos.mjs
 *
 * Uploads photos for a single dog from a local folder to Supabase storage
 * and registers them in the dog_media table.
 *
 * Usage:
 *   node scripts/upload-dog-photos.mjs "<Dog Name>" "<Path to folder>"
 *
 * Examples:
 *   node scripts/upload-dog-photos.mjs "Dharka" "C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's\Dharka"
 *   node scripts/upload-dog-photos.mjs "Hunter-King" "C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's\Hunter-King"
 *   node scripts/upload-dog-photos.mjs "Bruce" "C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's\Bruce"
 *   node scripts/upload-dog-photos.mjs "Jazzmine" "C:\Users\mathy\OneDrive\Desktop\Dobermann Photo's\Jazzmine"
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
const [, , dogName, photoFolder] = process.argv;

if (!dogName || !photoFolder) {
  console.error('\nUsage: node scripts/upload-dog-photos.mjs "<Dog Name>" "<Path to folder>"\n');
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
const BUCKET = 'dog-media';

async function run() {
  console.log(`\n🐕 Uploading photos for: ${dogName}`);
  console.log(`📁 Source folder: ${photoFolder}\n`);

  // 1. Find dog in DB
  const { data: dog, error: dogError } = await supabase
    .from('dogs')
    .select('id, name, category, status')
    .ilike('name', dogName.trim())
    .single();

  if (dogError || !dog) {
    console.error(`❌ Dog "${dogName}" not found in database.`);
    console.error('   Check the name matches exactly (case-insensitive).');
    process.exit(1);
  }

  console.log(`✅ Found dog: ${dog.name} (${dog.category} / ${dog.status})`);
  console.log(`   ID: ${dog.id}\n`);

  // 2. Get existing media URLs to avoid duplicates
  const { data: existing } = await supabase
    .from('dog_media')
    .select('url')
    .eq('dog_id', dog.id);

  const existingUrls = new Set((existing ?? []).map((m) => m.url));

  // 3. Read photo files from folder
  const files = fs.readdirSync(photoFolder).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTS.includes(ext);
  });

  if (files.length === 0) {
    console.warn('⚠️  No image files found in folder.');
    process.exit(0);
  }

  console.log(`📸 Found ${files.length} image(s) to process\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const safeName = dogName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const storagePath = `dogs/${dog.id}/${safeName}-${filename}`;
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    // Skip if already in dog_media
    if (existingUrls.has(publicUrl)) {
      console.log(`  ⏭  [${i + 1}/${files.length}] Already uploaded — ${filename}`);
      skipped++;
      continue;
    }

    const filePath = path.join(photoFolder, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png'
      : filename.toLowerCase().endsWith('.webp') ? 'image/webp'
      : 'image/jpeg';

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError && !uploadError.message?.includes('already exists')) {
      console.error(`  ❌ [${i + 1}/${files.length}] Upload failed — ${filename}: ${uploadError.message}`);
      failed++;
      continue;
    }

    // Insert into dog_media
    const isPrimary = i === 0 && existingUrls.size === 0;
    const { error: insertError } = await supabase.from('dog_media').insert({
      dog_id: dog.id,
      type: 'photo',
      url: publicUrl,
      is_primary: isPrimary,
      sort_order: i,
    });

    if (insertError) {
      console.error(`  ❌ [${i + 1}/${files.length}] DB insert failed — ${filename}: ${insertError.message}`);
      failed++;
      continue;
    }

    console.log(`  ✅ [${i + 1}/${files.length}] ${isPrimary ? '⭐ PRIMARY — ' : ''}${filename}`);
    uploaded++;
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Uploaded:  ${uploaded}`);
  console.log(`⏭  Skipped:   ${skipped}`);
  if (failed > 0) console.log(`❌ Failed:    ${failed}`);
  console.log('─────────────────────────────────\n');

  if (uploaded > 0) {
    console.log(`🎉 ${dog.name}'s photos are live in the app!\n`);
  }
}

run().catch((e) => {
  console.error('\n❌ Unexpected error:', e.message);
  process.exit(1);
});
