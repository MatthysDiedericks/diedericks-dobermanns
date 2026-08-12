/**
 * Apply a migration SQL file via the Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN in env (or .env.local).
 *
 *   node scripts/apply-migration.mjs diedericks-dobermanns/supabase/migrations/0061_contacts_dedupe.sql
 */
import { readFileSync } from 'fs';
import path from 'path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply-migration.mjs <path-to.sql>');
  process.exit(1);
}

const env = {};
for (const envPath of [
  path.join(process.cwd(), 'diedericksdobermann-web', '.env.local'),
  path.join(process.cwd(), '.env.local'),
]) {
  try {
    for (const line of readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* next */ }
}

const projectRef =
  env.SUPABASE_PROJECT_ID ||
  (env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ||
  'nlmwxodvquwbjinhhbmr';
const token = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
const sql = readFileSync(path.resolve(file), 'utf8');

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN missing. Paste the SQL in the dashboard, or set the token.');
  console.error(`File: ${file}`);
  process.exit(2);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
console.log(res.status, text.slice(0, 2000));
process.exit(res.ok ? 0 : 1);
