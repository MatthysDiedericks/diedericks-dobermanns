#!/usr/bin/env node
/**
 * upload-training-videos.mjs
 * ───────────────────────────
 * Uploads training video files to the Supabase "training-videos" bucket
 * and links them to the matching row in the training_videos table by
 * matching file name against video title.
 *
 * How to use:
 *   1. Put your video files in:
 *        Dobermann Photo's/Training Videos/
 *      (flat folder, no subfolders needed)
 *   2. Name each file so it roughly matches the video title in the app,
 *      e.g. for "Recall Phase 1 — Building the Come" name the file
 *      something like "recall-phase-1.mp4" or "Recall Phase 1.mov".
 *      Matching is fuzzy (case/punctuation-insensitive substring match),
 *      it does not need to be exact.
 *   3. Run:
 *        node scripts/upload-training-videos.mjs
 *
 * The script only touches training_videos rows where video_url IS NULL —
 * it will never overwrite a video that's already set.
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
const BUCKET        = 'training-videos';
const VIDEOS_FOLDER = `C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's\\Training Videos`;
const SUPPORTED = new Set(['.mp4', '.mov', '.avi', '.m4v', '.webm']);

if (!SERVICE_KEY) {
  console.error('\n❌  Missing SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/** Normalise a string for fuzzy matching: lowercase, letters+digits only. */
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('\n🎬  Diedericks Dobermanns — Training Video Upload\n');

  if (!fs.existsSync(VIDEOS_FOLDER)) {
    console.error(`❌  Folder not found: ${VIDEOS_FOLDER}`);
    console.error(`    Create it and add your video files first.`);
    process.exit(1);
  }

  const files = fs.readdirSync(VIDEOS_FOLDER).filter(f =>
    SUPPORTED.has(path.extname(f).toLowerCase())
  );

  if (files.length === 0) {
    console.log(`⚠  No video files found in ${VIDEOS_FOLDER}`);
    return;
  }

  const { data: videos, error } = await supabase
    .from('training_videos')
    .select('id, title, video_url')
    .is('video_url', null);

  if (error) {
    console.error('❌  Could not load training_videos:', error.message);
    process.exit(1);
  }

  console.log(`Found ${files.length} local file(s), ${videos.length} video(s) still needing a URL.\n`);

  const usedFiles = new Set();
  let uploaded = 0, failed = 0;
  const unmatchedVideos = [];

  for (const video of videos) {
    const titleSlug = slug(video.title);

    const match = files.find(f => {
      if (usedFiles.has(f)) return false;
      const fileSlug = slug(path.basename(f, path.extname(f)));
      return fileSlug.length >= 4 && (titleSlug.includes(fileSlug) || fileSlug.includes(titleSlug));
    });

    if (!match) {
      unmatchedVideos.push(video.title);
      continue;
    }

    usedFiles.add(match);
    const filePath = path.join(VIDEOS_FOLDER, match);
    const ext = path.extname(match).toLowerCase();
    const mimeType = ext === '.mp4' ? 'video/mp4'
                   : ext === '.mov' ? 'video/quicktime'
                   : ext === '.webm' ? 'video/webm'
                   : 'video/mp4';
    const storagePath = `videos/${video.id}/${Date.now()}_${match.replace(/\s+/g, '_')}`;

    try {
      const buffer = await fsp.readFile(filePath);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const { error: dbError } = await supabase
        .from('training_videos')
        .update({ video_url: publicUrl })
        .eq('id', video.id);

      if (dbError) throw dbError;

      console.log(`  ✓  "${video.title}"  ←  ${match}`);
      uploaded++;
    } catch (err) {
      console.log(`  ✗  "${video.title}"  —  ${err.message}`);
      failed++;
    }
  }

  const unusedFiles = files.filter(f => !usedFiles.has(f));

  console.log(`\n${failed === 0 ? '✅' : '⚠️ '}  ${uploaded} uploaded, ${failed} failed, ${unmatchedVideos.length} videos still without a match\n`);

  if (unmatchedVideos.length) {
    console.log('Videos with no matching file found (still need a video):');
    unmatchedVideos.forEach(t => console.log(`  · ${t}`));
    console.log('');
  }

  if (unusedFiles.length) {
    console.log('Local files that did not match any video title:');
    unusedFiles.forEach(f => console.log(`  · ${f}`));
    console.log('');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
