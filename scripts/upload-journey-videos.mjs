#!/usr/bin/env node
/**
 * upload-journey-videos.mjs
 * ─────────────────────────
 * Uploads training footage to a dog's TRAINING JOURNEY TIMELINE — the
 * `training_logs` + `training_log_media` pair behind the journey shown on the
 * public dog profile (elite tier) and in the client portal.
 *
 * This is NOT the same as upload-dog-videos.mjs, which writes to `dog_media`
 * (the plain gallery on a dog's profile). A timeline entry is a dated training
 * session with a milestone and phase; a dog_media row is just a clip.
 *
 * Entries are created as DRAFTS (is_draft = true, is_public = false) so nothing
 * appears on the public site until you review and publish it in
 * Admin → Training → Journey. That is deliberate: footage should be captioned
 * and phased before a buyer sees it.
 *
 * Usage — run from the WEBSITE folder so .env.local is found:
 *   cd diedericksdobermann-web
 *   node ../scripts/upload-journey-videos.mjs
 *
 * Re-running is safe: a clip already uploaded for the same dog and date is
 * skipped rather than duplicated.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = path.join(projectRoot, 'diedericksdobermann-web', '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].trim();
    }
  }
}

const SUPABASE_URL = 'https://nlmwxodvquwbjinhhbmr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'gallery'; // matches the admin Timeline quick-capture path
const PHOTO_BASE = `C:\\Users\\mathy\\OneDrive\\Desktop\\Dobermann Photo's`;
const SUPPORTED = new Set(['.mp4', '.mov', '.avi', '.m4v', '.webm']);

/**
 * One entry per clip.
 *   trainingType must be one of:
 *     obedience | protection | psa | socialization | foundation | scenario | session
 *   phase must be one of: foundation | development | advanced | competition
 */
const UPLOADS = [
  {
    dogId: 'f4fb4826-cb2a-4294-9f42-ce4b6ff20348',
    dogName: 'Bruce',
    folder: 'Bruce',
    file: 'WhatsApp Video 2026-08-06 at 13.09.54.mp4',
    sessionDate: '2026-08-06',
    trainingType: 'session',
    phase: 'development',
    milestone: null,
    notes: null,
  },
  {
    dogId: '1f181a7d-c9d9-4d79-a4eb-54bc4dcf1e1d',
    dogName: 'Jazzmine',
    folder: 'Jazzmine',
    file: 'WhatsApp Video 2026-08-06 at 13.09.48.mp4',
    sessionDate: '2026-08-06',
    trainingType: 'session',
    phase: 'development',
    milestone: null,
    notes: null,
  },
];

if (!SERVICE_KEY) {
  console.error('\nERROR: SUPABASE_SERVICE_ROLE_KEY not found.');
  console.error('Expected in diedericksdobermann-web\\.env.local');
  console.error('Run from the website folder:\n');
  console.error('  cd diedericksdobermann-web');
  console.error('  node ../scripts/upload-journey-videos.mjs\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const CONTENT_TYPES = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
};

async function run() {
  console.log('\n🎬  Training journey footage → timeline\n');
  let created = 0, skipped = 0, failed = 0;

  for (const item of UPLOADS) {
    const localPath = path.join(PHOTO_BASE, item.folder, item.file);
    process.stdout.write(`  ${item.dogName.padEnd(10)} ${item.file.slice(0, 44).padEnd(46)} `);

    if (!fs.existsSync(localPath)) {
      console.log('✗  file not found');
      failed++;
      continue;
    }
    const ext = path.extname(item.file).toLowerCase();
    if (!SUPPORTED.has(ext)) {
      console.log('✗  not a video');
      failed++;
      continue;
    }

    try {
      // Skip if this dog already has a timeline entry for this date carrying
      // a clip with the same filename — makes re-runs a no-op.
      const { data: existingLogs, error: exErr } = await supabase
        .from('training_logs')
        .select('id, training_log_media(public_url)')
        .eq('dog_id', item.dogId)
        .eq('session_date', item.sessionDate);
      if (exErr) throw new Error(exErr.message);

      const already = (existingLogs ?? []).some((l) =>
        (l.training_log_media ?? []).some((m) =>
          (m.public_url ?? '').includes(encodeURIComponent(path.basename(item.file, ext))) ||
          (m.public_url ?? '').includes(path.basename(item.file, ext).replace(/[^a-z0-9]+/gi, '-').toLowerCase()),
        ),
      );
      if (already) {
        console.log('↷  already on the timeline');
        skipped++;
        continue;
      }

      const safe = path.basename(item.file, ext).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const storagePath = `training-journey/${item.dogId}/${safe}-${Date.now()}${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fs.readFileSync(localPath), {
          contentType: CONTENT_TYPES[ext] ?? 'video/mp4',
          upsert: false,
        });
      if (upErr) throw new Error(upErr.message);

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;

      const { data: log, error: logErr } = await supabase
        .from('training_logs')
        .insert({
          dog_id: item.dogId,
          session_date: item.sessionDate,
          training_type: item.trainingType,
          phase: item.phase,
          milestone: item.milestone,
          notes: item.notes,
          is_draft: true,    // review before it goes anywhere
          is_public: false,  // never straight onto the public profile
        })
        .select('id')
        .single();
      if (logErr) throw new Error(logErr.message);

      const { error: mediaErr } = await supabase.from('training_log_media').insert({
        training_log_id: log.id,
        media_type: 'video',
        storage_path: storagePath,
        public_url: publicUrl,
        sort_order: 0,
      });
      if (mediaErr) throw new Error(mediaErr.message);

      console.log('✓  draft entry created');
      created++;
    } catch (e) {
      console.log(`✗  ${e.message}`);
      failed++;
    }
  }

  console.log(`\n✅  ${created} created, ${skipped} skipped, ${failed} failed\n`);
  if (created > 0) {
    console.log('These are DRAFTS and are not public yet.');
    console.log('Review, caption and publish them in Admin → Training → Journey.\n');
  }
}

run().catch((e) => {
  console.error('\nFatal:', e.message);
  process.exit(1);
});
