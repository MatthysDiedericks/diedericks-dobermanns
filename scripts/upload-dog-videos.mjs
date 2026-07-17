#!/usr/bin/env node
/**
 * upload-dog-videos.mjs
 * ─────────────────────
 * Uploads videos from the Dobermann Photo's folder to Supabase Storage
 * and links them to dog profiles in the dog_media table.
 *
 * Usage:
 *   node scripts/upload-dog-videos.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ─── load env ────────────────────────────────────────────────────────────────
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPaths = [
    path.join(projectRoot, 'diedericksdobermann-web', '.env.local'),
    path.join(projectRoot, 'diedericks-dobermanns', '.env'),
    path.join(projectRoot, 'diedericks-dobermanns', '.env.local'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const [key, ...rest] = line.split('=');
        if (key?.trim() && rest.length) process.env[key.trim()] = rest.join('=').trim();
      }
      break;
    }
  }
}

const SUPABASE_URL = 'https://nlmwxodvquwbjinhhbmr.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = 'dog-media';
const PHOTO_BASE   = `C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's`;

if (!SERVICE_KEY) {
  console.error('\n❌  Missing SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── VIDEO MANIFEST ──────────────────────────────────────────────────────────
const VIDEOS = [
  {
    dogId:   'fb33005e-f4a6-4bf8-b0ff-a13a7c396d86',
    dogName: 'Hailey',
    folder:  `Hailey Video's`,
  },
  {
    dogId:   '2be75604-740f-4076-954d-53d434f3455d',
    dogName: 'Kim',
    folder:  'Kim Videos',
  },
  {
    dogId:   'c54ae0cf-dcba-4d83-a0eb-b6823132b0d1',
    dogName: 'Santini',
    folder:  'Santini Videos',
  },
];

const SUPPORTED = new Set(['.mp4', '.mov', '.avi', '.m4v', '.webm']);

async function getNextSortOrder(dogId) {
  const { data } = await supabase
    .from('dog_media')
    .select('sort_order')
    .eq('dog_id', dogId)
    .order('sort_order', { ascending: false })
    .limit(1);
  return data?.[0]?.sort_order != null ? data[0].sort_order + 1 : 0;
}

async function uploadDogVideos(dog) {
  const folderPath = path.join(PHOTO_BASE, dog.folder);

  if (!fs.existsSync(folderPath)) {
    console.log(`  ⚠  Folder not found: ${folderPath}`);
    return { uploaded: 0, failed: 0 };
  }

  const files = fs.readdirSync(folderPath).filter(f =>
    SUPPORTED.has(path.extname(f).toLowerCase())
  );

  if (files.length === 0) {
    console.log(`  ⚠  No video files found in ${dog.folder}`);
    return { uploaded: 0, failed: 0 };
  }

  let uploaded = 0, failed = 0;
  let sortOrder = await getNextSortOrder(dog.dogId);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const ext      = path.extname(file).toLowerCase();
    const storagePath = `dogs/${dog.dogId}/videos/${Date.now()}_${file.replace(/\s+/g, '_')}`;
    const mimeType = ext === '.mp4' ? 'video/mp4'
                   : ext === '.mov' ? 'video/quicktime'
                   : ext === '.webm' ? 'video/webm'
                   : 'video/mp4';

    try {
      const buffer = await fsp.readFile(filePath);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

      if (uploadError) {
        if (uploadError.message?.includes('already exists')) {
          console.log(`  ↷  ${file} (already uploaded)`);
          continue;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const { error: dbError } = await supabase
        .from('dog_media')
        .insert({
          dog_id:     dog.dogId,
          type:       'video',
          url:        publicUrl,
          caption:    file.replace(/\.[^.]+$/, ''),
          is_primary: false,
          sort_order: sortOrder++,
        });

      if (dbError) throw dbError;

      console.log(`  ✓  ${file}`);
      uploaded++;

    } catch (err) {
      console.log(`  ✗  ${file}  —  ${err.message}`);
      failed++;
    }
  }

  return { uploaded, failed };
}

async function main() {
  console.log('\n🎬  Diedericks Dobermanns — Dog Video Upload\n');

  let totalUploaded = 0, totalFailed = 0;

  for (const dog of VIDEOS) {
    console.log(`\n— ${dog.dogName} —`);
    const { uploaded, failed } = await uploadDogVideos(dog);
    console.log(`  ${uploaded} uploaded, ${failed} failed`);
    totalUploaded += uploaded;
    totalFailed   += failed;
  }

  console.log(`\n${ totalFailed === 0 ? '✅' : '⚠️ ' }  Complete — ${totalUploaded} total uploaded, ${totalFailed} failed\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
