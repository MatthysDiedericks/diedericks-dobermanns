/**
 * generate-check-ins.mjs
 *
 * Calls generate_due_check_ins() — inserts due rows with draft text for Matt.
 * Birthday rows require dogs.owner_id and never use Puppy/Pup N placeholders.
 * Never sends WhatsApp, email, or any outbound message.
 *
 *   node scripts/generate-check-ins.mjs
 *   node scripts/generate-check-ins.mjs --days=21
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'diedericksdobermann-web', '.env.local'),
    path.join(process.cwd(), 'diedericks-dobermanns', '.env.local'),
    path.join(__dirname, '..', 'diedericksdobermann-web', '.env.local'),
    path.join(__dirname, '..', 'diedericks-dobermanns', '.env.local'),
  ];
  for (const envPath of candidates) {
    try {
      const env = {};
      const text = readFileSync(envPath, 'utf-8').replace(/^\uFEFF/, '');
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
      const url =
        env.SUPABASE_URL ||
        env.NEXT_PUBLIC_SUPABASE_URL ||
        env.EXPO_PUBLIC_SUPABASE_URL;
      if (url) return { ...env, SUPABASE_URL: url };
    } catch {
      /* next */
    }
  }
  console.error('No .env.local with SUPABASE_URL found.');
  process.exit(1);
}

const daysArg = process.argv.find((a) => a.startsWith('--days='));
const days = daysArg ? Number(daysArg.slice('--days='.length)) : 14;
const env = loadEnv();
const supabase = createClient(
  env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await supabase.rpc('generate_due_check_ins', {
  p_horizon_days: days,
});
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Inserted ${data ?? 0} due check-in(s). Nothing was sent.`);
