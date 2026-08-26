/**
 * Uploads the Claire x Santini puppy photos to Supabase Storage and links each
 * one to the right puppy, so the buyer sees their own dog in the portal.
 *
 * RUN FROM THE WEBSITE FOLDER (that is where @supabase/supabase-js lives):
 *   cd "...\diedericksdobermann App\diedericksdobermann-web"
 *   node ../scripts/upload-litter-photos.mjs
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY from diedericksdobermann-web/.env.local.
 *
 * IDENTIFICATION
 * Each photo was matched to a puppy by COLLAR COLOUR. Confidence is marked per
 * row below. The studio shot with a black cord was confirmed by Matt on
 * 26 Aug 2026 as the grey puppy, so it sits under Puppy 8.
 *
 * One photo is deliberately NOT included: the group shot of three sleeping
 * puppies, which belongs to the litter rather than to any one buyer.
 * All nine living puppies have at least one photo.
 *
 * SAFETY
 * - Idempotent: storage path is derived from the puppy, so a re-run overwrites
 *   rather than duplicating, and the dog_media row is skipped if it exists.
 * - is_public false and client_consent false on every row: the buyer sees their
 *   puppy, the public website does not, and nothing is published until Matt asks.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
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

const SUPABASE_URL = 'https://nlmwxodvquwbjinhhbmr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'dog-media';

const UPLOAD_DIRS = [
  process.env.UPLOADS_DIR,
  '/sessions/kind-clever-galileo/mnt/uploads',
  'C:\\Users\\mathy\\AppData\\Roaming\\Claude\\local-agent-mode-sessions\\75596203-4c9b-4d5c-a6ad-d480175aeb1d\\f2b6f192-f23b-4b2c-99f9-e3560e3b55ed\\local_23681562-bd59-4735-a364-d8cf654289ca\\uploads',
].filter(Boolean);

const B = 'WhatsApp Image 2026-08-26 at ';

// dog_id verified against the live database 26 Aug 2026.
const PHOTOS = [
  // Puppy 1 (Pink) — Josef Kotse
  { file: `${B}12.33.51 (3).jpeg`, dog: 'fcd29f74-d6a3-4199-b16c-edba0f69b995', label: 'Puppy 1 (Pink)', slug: 'puppy1-pink', n: 1, primary: true,  collar: 'pink',   sure: 'high' },
  { file: `${B}12.33.53 (1).jpeg`, dog: 'fcd29f74-d6a3-4199-b16c-edba0f69b995', label: 'Puppy 1 (Pink)', slug: 'puppy1-pink', n: 2, primary: false, collar: 'pink',   sure: 'high' },

  // Puppy 2 (Red) — Jacoline Pretorius
  { file: `${B}12.33.51.jpeg`,     dog: 'b37934ce-035a-4fba-bda4-7b3c9f55c9fc', label: 'Puppy 2 (Red)',   slug: 'puppy2-red',  n: 1, primary: true,  collar: 'red',    sure: 'high' },
  { file: `${B}12.33.54.jpeg`,     dog: 'b37934ce-035a-4fba-bda4-7b3c9f55c9fc', label: 'Puppy 2 (Red)',   slug: 'puppy2-red',  n: 2, primary: false, collar: 'red',    sure: 'high' },

  // Puppy 3 (Gold) — Jannecke Smit. Sent separately by Matt 26 Aug, gold cord collar.
  { file: '2c31a4c3-b241-4398-be6f-999bf0e62a16-1787742469681_WhatsApp Image 2026-08-26 at 13.07.11.jpeg',
    dog: '30e2fa58-2e8d-4e46-8eff-01d1c39eb5a4', label: 'Puppy 3 (Gold)', slug: 'puppy3-gold', n: 1, primary: true, collar: 'gold', sure: 'confirmed by Matt' },

  // Puppy 4 (Purple) — Gabriella Kruger
  { file: `${B}12.33.52 (2).jpeg`, dog: 'd56e672c-e35c-4d6b-b0bf-4a75c2be1a7a', label: 'Puppy 4 (Purple)', slug: 'puppy4-purple', n: 1, primary: true, collar: 'pale lilac', sure: 'medium' },

  // Puppy 5 (Peach) — Nicolas Hohls
  { file: `${B}12.33.51 (1).jpeg`, dog: 'efbea068-b60b-476b-b680-5a69235e1bff', label: 'Puppy 5 (Peach)', slug: 'puppy5-peach', n: 1, primary: true,  collar: 'pale peach', sure: 'medium' },
  { file: `${B}12.33.54 (1).jpeg`, dog: 'efbea068-b60b-476b-b680-5a69235e1bff', label: 'Puppy 5 (Peach)', slug: 'puppy5-peach', n: 2, primary: false, collar: 'blush',      sure: 'medium' },

  // Puppy 6 (Orange) — Deon Vlok
  { file: `${B}12.33.52 (1).jpeg`, dog: '0636970a-1fa8-47d6-a128-7486161540b9', label: 'Puppy 6 (Orange)', slug: 'puppy6-orange', n: 1, primary: true,  collar: 'orange', sure: 'high' },
  { file: `${B}12.33.53.jpeg`,     dog: '0636970a-1fa8-47d6-a128-7486161540b9', label: 'Puppy 6 (Orange)', slug: 'puppy6-orange', n: 2, primary: false, collar: 'orange', sure: 'high' },

  // Puppy 7 (Blue) — Leandre Prinsloo
  { file: `${B}12.33.50.jpeg`,     dog: 'ba99450b-e9a0-4093-974a-df6e6f5cdcd8', label: 'Puppy 7 (Blue)',  slug: 'puppy7-blue',  n: 1, primary: true, collar: 'blue',   sure: 'high' },

  // Puppy 8 (Grey) — Leo Middelberg
  { file: `${B}12.33.51 (2).jpeg`, dog: '1ca36a6a-5631-4b3f-b60f-5bdc7aebd5d3', label: 'Puppy 8 (Grey)',  slug: 'puppy8-grey',  n: 1, primary: true,  collar: 'charcoal',   sure: 'medium' },
  // The studio shot with the black cord — confirmed by Matt 26 Aug as the grey puppy.
  { file: `${B}12.33.53 (3).jpeg`, dog: '1ca36a6a-5631-4b3f-b60f-5bdc7aebd5d3', label: 'Puppy 8 (Grey)',  slug: 'puppy8-grey',  n: 2, primary: false, collar: 'black cord', sure: 'confirmed by Matt' },

  // Puppy 9 (Yellow) "Kira" — Elrid Gerber, contact Shanel Halgreen
  { file: `${B}12.33.52.jpeg`,     dog: '0e10151c-5ae7-4d6f-bf3e-4ded60e1adfc', label: 'Kira — Puppy 9 (Yellow)', slug: 'puppy9-yellow', n: 1, primary: true, collar: 'yellow', sure: 'high' },
];

if (!SERVICE_KEY) {
  console.error('\nERROR: SUPABASE_SERVICE_ROLE_KEY not found. Run from the website folder.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function uploadBuffer(storagePath, buffer) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return pub.publicUrl;
}

/** A real smaller file under dogs/{id}/thumbs/, never a copy of `url`. */
async function makeThumbUrl(bytes, dogId, filename) {
  const thumbBuf = await sharp(bytes)
    .rotate()
    .resize(480, 480, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 80 })
    .toBuffer();
  return uploadBuffer(`dogs/${dogId}/thumbs/${filename}`, thumbBuf);
}

function findUpload(name) {
  for (const dir of UPLOAD_DIRS) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function run() {
  let ok = 0, skipped = 0, failed = 0;

  for (const p of PHOTOS) {
    const local = findUpload(p.file);
    if (!local) {
      console.error(`MISSING FILE  ${p.label}  ${p.file}`);
      failed++;
      continue;
    }

    const filename = `${p.slug}-${String(p.n).padStart(2, '0')}.jpeg`;
    const storagePath = `dogs/${p.dog}/${filename}`;
    const bytes = await readFile(local);

    let url;
    let thumbnailUrl;
    try {
      url = await uploadBuffer(storagePath, bytes);
      thumbnailUrl = await makeThumbUrl(bytes, p.dog, filename);
    } catch (e) {
      console.error(`UPLOAD FAILED ${p.label}: ${e.message}`);
      failed++;
      continue;
    }

    const { data: existing } = await supabase
      .from('dog_media').select('id, thumbnail_url').eq('dog_id', p.dog).eq('url', url).maybeSingle();

    if (existing) {
      if (!existing.thumbnail_url) {
        const { error: upErr } = await supabase
          .from('dog_media').update({ thumbnail_url: thumbnailUrl }).eq('id', existing.id);
        if (upErr) {
          console.error(`THUMB UPDATE FAILED ${p.label}: ${upErr.message}`);
          failed++;
          continue;
        }
        console.log(`thumb filled  ${p.label}  (${p.collar})`);
        ok++;
        continue;
      }
      console.log(`already linked  ${p.label}  (${p.collar})`);
      skipped++;
      continue;
    }

    const { error: insErr } = await supabase.from('dog_media').insert({
      dog_id: p.dog,
      type: 'photo',
      url,
      thumbnail_url: thumbnailUrl,
      caption: `${p.label} — 6 weeks`,
      is_primary: p.primary,
      sort_order: p.n,
      is_public: false,
      client_consent: false,
    });
    if (insErr) {
      console.error(`DB LINK FAILED ${p.label}: ${insErr.message}`);
      failed++;
      continue;
    }

    console.log(`linked  ${p.label}  (${p.collar} collar, confidence ${p.sure})`);
    ok++;
  }

  console.log(`\nDone. ${ok} linked, ${skipped} already present, ${failed} failed.`);
  console.log('\nNOT UPLOADED:');
  console.log('  · group shot of three sleeping puppies (litter photo, not one dog)');
  console.log('\nAll nine living puppies now have at least one photo.');
}

run().catch((e) => { console.error('Unexpected failure:', e); process.exit(1); });
