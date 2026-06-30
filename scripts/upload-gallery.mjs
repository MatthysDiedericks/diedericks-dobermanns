#!/usr/bin/env node
/**
 * upload-gallery.mjs
 * ───────────────────
 * Uploads Pack, Team, Training, and Puppies photos to Supabase Storage
 * and inserts gallery_items rows.
 *
 * Usage:
 *   node scripts/upload-gallery.mjs              ← uploads all categories
 *   node scripts/upload-gallery.mjs training     ← uploads one category
 *
 * Requirements (run once):
 *   npm install @supabase/supabase-js sharp
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── paths ────────────────────────────────────────────────────────────────────
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

const SUPABASE_URL = 'https://nlmwxodvquwbjinhhbmr.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = 'gallery';
const PHOTO_BASE   = `C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's`;
const SUPPORTED    = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);

// ─── gallery categories ───────────────────────────────────────────────────────
const CATEGORIES = [
  { folder: 'Pack',        category: 'pack',        label: 'The Pack'    },
  { folder: 'Team',        category: 'team',        label: 'Our Team'    },
  { folder: 'Training',    category: 'training',    label: 'Training'    },
  { folder: 'Puppies',     category: 'puppies',     label: 'Puppies'     },
  { folder: 'Competition', category: 'competition', label: 'Competition' },
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

async function processCategory(cat) {
  const folderPath = path.join(PHOTO_BASE, cat.folder);
  if (!fs.existsSync(folderPath)) {
    console.log(`  ⚠  Folder not found: ${folderPath} — skipping`);
    return { uploaded: 0, failed: 0 };
  }

  const files = (await fsp.readdir(folderPath))
    .filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))
    .sort();

  if (!files.length) {
    console.log(`  ⚠  No images found`);
    return { uploaded: 0, failed: 0 };
  }

  let sortOrder = await getNextSortOrder(cat.category);
  let uploaded = 0, failed = 0;

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const safeName = path.basename(file, path.extname(file))
      .replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 60);
    const outName   = `${cat.category}-${safeName}.jpg`;
    const mainPath  = `${cat.category}/${outName}`;

    process.stdout.write(`    ${file.substring(0, 50).padEnd(52)} `);
    try {
      const image = sharp(filePath).rotate();
      const mainBuf = await image.clone()
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 88, progressive: true })
        .toBuffer();

      const url = await uploadBuffer(mainPath, mainBuf);

      const { error } = await supabase.from('gallery_items').insert({
        title:      cat.label,
        category:   cat.category,
        image_url:  url,
        is_featured: sortOrder < 3,
        sort_order:  sortOrder,
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
  return { uploaded, failed };
}

async function run() {
  const filterArg = process.argv[2]?.toLowerCase();
  const targets = filterArg
    ? CATEGORIES.filter(c => c.category === filterArg || c.folder.toLowerCase() === filterArg)
    : CATEGORIES;

  if (!targets.length) {
    console.error(`\nNo category "${process.argv[2]}". Options: ${CATEGORIES.map(c => c.category).join(', ')}\n`);
    process.exit(1);
  }

  console.log(`\n🖼   Uploading gallery photos — ${targets.length} category(s)\n`);
  let totalUploaded = 0, totalFailed = 0;

  for (const cat of targets) {
    console.log(`\n── ${cat.label} (${cat.category}) ──`);
    const { uploaded, failed } = await processCategory(cat);
    totalUploaded += uploaded;
    totalFailed   += failed;
    console.log(`   ${uploaded} uploaded, ${failed} failed`);
  }

  console.log(`\n✅  Complete — ${totalUploaded} total uploaded, ${totalFailed} failed\n`);
}

run().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
