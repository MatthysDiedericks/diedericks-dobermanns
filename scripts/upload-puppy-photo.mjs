/**
 * Uploads one puppy photo to Supabase Storage and links it on the dog profile.
 *
 * WHY: proving the photo path end to end before doing all 13 for the litter.
 *
 * RUN FROM THE WEBSITE FOLDER (that is where @supabase/supabase-js lives):
 *   cd "...\diedericksdobermann App\diedericksdobermann-web"
 *   node ../scripts/upload-puppy-photo.mjs
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY from diedericksdobermann-web/.env.local.
 * Idempotent: the storage path is derived from the dog and file name, and the
 * dog_media row is skipped if one already points at that URL.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Puppy 1 (Pink) — Josef Kotse. Verified against the live database 26 Aug 2026.
const DOG_ID = 'fcd29f74-d6a3-4199-b16c-edba0f69b995';
const DOG_LABEL = 'Puppy 1 (Pink)';

// The uploads folder differs between Windows and the Linux sandbox. Try both.
const UPLOAD_DIRS = [
  process.env.UPLOADS_DIR,
  '/sessions/kind-clever-galileo/mnt/uploads',
  'C:\\Users\\mathy\\AppData\\Roaming\\Claude\\local-agent-mode-sessions\\75596203-4c9b-4d5c-a6ad-d480175aeb1d\\f2b6f192-f23b-4b2c-99f9-e3560e3b55ed\\local_23681562-bd59-4735-a364-d8cf654289ca\\uploads',
].filter(Boolean);
const FILE = 'WhatsApp Image 2026-08-26 at 12.33.51 (3).jpeg';

function findUpload(name) {
  for (const dir of UPLOAD_DIRS) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Could not find "${name}" in any of:\n  ${UPLOAD_DIRS.join('\n  ')}`);
}

if (!SERVICE_KEY) {
  console.error('\nERROR: SUPABASE_SERVICE_ROLE_KEY not found.');
  console.error('Run this from the website folder:\n');
  console.error('  cd "...\\diedericksdobermann App\\diedericksdobermann-web"');
  console.error('  node ../scripts/upload-puppy-photo.mjs\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function run() {
  const localPath = findUpload(FILE);
  const bytes = await readFile(localPath);
  const safeName = 'puppy1-pink-01.jpeg';
  const storagePath = `dogs/${DOG_ID}/${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: true });
  if (upErr) {
    console.error('UPLOAD FAILED:', upErr.message);
    process.exit(1);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const url = pub.publicUrl;

  const { data: existing } = await supabase
    .from('dog_media').select('id').eq('dog_id', DOG_ID).eq('url', url).maybeSingle();

  if (existing) {
    console.log('Already linked:', url);
    return;
  }

  const { error: insErr } = await supabase.from('dog_media').insert({
    dog_id: DOG_ID,
    type: 'photo',
    url,
    caption: `${DOG_LABEL} — 6 weeks`,
    is_primary: true,
    sort_order: 1,
    is_public: false,      // buyer's puppy, not marketing — client sees it, public does not
    client_consent: false, // Matt asks before anything public
  });
  if (insErr) {
    console.error('DB LINK FAILED:', insErr.message);
    process.exit(1);
  }

  console.log('Uploaded ->', storagePath);
  console.log('Public URL ->', url);
  console.log(`Linked to ${DOG_LABEL} as the primary photo.`);
}

run().catch((e) => { console.error('Unexpected failure:', e); process.exit(1); });
