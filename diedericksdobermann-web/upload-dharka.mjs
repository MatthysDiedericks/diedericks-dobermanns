import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

// Load env from website .env.local
const envPath = "C:\\Users\\mathy\\OneDrive\\Documents\\Claude\\Projects\\diedericksdobermann App\\diedericksdobermann-web\\.env.local";
const envLinux = '/sessions/kind-clever-galileo/mnt/diedericksdobermann App/diedericksdobermann-web/.env.local';
if (fs.existsSync(envLinux)) {
  for (const line of fs.readFileSync(envLinux, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const SUPABASE_URL = 'https://nlmwxodvquwbjinhhbmr.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOG_ID       = '506c9e4d-8a02-4750-af7a-f4340e65e7b0';
const FOLDER       = "/sessions/kind-clever-galileo/mnt/Dobermann Photo's/Dharka";
const BUCKET       = 'dog-media';

if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const files = (await fsp.readdir(FOLDER))
  .filter(f => /\.(jpe?g|png|heic|webp)$/i.test(f))
  .sort();

console.log('Found', files.length, 'photo(s):', files.join(', '));

let sortOrder = 0;
for (const file of files) {
  const filePath = path.join(FOLDER, file);
  const slug = file.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
  const mainPath  = `dogs/${DOG_ID}/dharka-${slug}.jpg`;
  const thumbPath = `dogs/${DOG_ID}/thumbs/dharka-${slug}.jpg`;

  process.stdout.write(`  Uploading ${file} ... `);
  try {
    const img = sharp(filePath).rotate();
    const [mainBuf, thumbBuf] = await Promise.all([
      img.clone().jpeg({ quality: 88, progressive: true }).toBuffer(),
      img.clone().resize(480, 480, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer(),
    ]);

    const { error: e1 } = await supabase.storage.from(BUCKET)
      .upload(mainPath, mainBuf, { contentType: 'image/jpeg', upsert: true });
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await supabase.storage.from(BUCKET)
      .upload(thumbPath, thumbBuf, { contentType: 'image/jpeg', upsert: true });
    if (e2) throw new Error(e2.message);

    const url          = supabase.storage.from(BUCKET).getPublicUrl(mainPath).data.publicUrl;
    const thumbnailUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

    const { error: e3 } = await supabase.from('dog_media').insert({
      dog_id: DOG_ID, url, thumbnail_url: thumbnailUrl,
      type: 'photo', is_primary: sortOrder === 0, sort_order: sortOrder,
    });
    if (e3) throw new Error(e3.message);

    console.log('done (sort_order=' + sortOrder + ')');
    sortOrder++;
  } catch (e) {
    console.log('FAILED:', e.message);
  }
}

console.log('\nChecking dog_media rows for Dharka...');
const { data } = await supabase.from('dog_media').select('id, url, is_primary, sort_order').eq('dog_id', DOG_ID);
console.log('Rows in DB:', data?.length ?? 0);
data?.forEach(r => console.log(' ', r.sort_order, r.is_primary ? '[PRIMARY]' : '         ', r.url.split('/').pop()));
