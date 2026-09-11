/**
 * Shared env loader for scripts that talk to the live Supabase project.
 * The app repo keeps keys in `.env`; the website uses `.env.local`.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

export function loadSupabaseEnv() {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(SCRIPT_DIR, '..', 'diedericks-dobermanns', '.env.local'),
    path.join(SCRIPT_DIR, '..', 'diedericks-dobermanns', '.env'),
    path.join(SCRIPT_DIR, '..', 'diedericksdobermann-web', '.env.local'),
    path.join(SCRIPT_DIR, '..', 'diedericksdobermann-web', '.env'),
    path.join(SCRIPT_DIR, '..', '.env.local'),
    path.join(SCRIPT_DIR, '..', '.env'),
    path.join(SCRIPT_DIR, '.env.local'),
  ];

  const tried = [];
  for (const envPath of candidates) {
    let raw;
    try {
      raw = readFileSync(envPath, 'utf-8');
    } catch {
      tried.push(`  not found        ${envPath}`);
      continue;
    }
    const env = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    const url = env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      console.log(`  Using env: ${envPath}`);
      return env;
    }
    const missing = [!url && 'a Supabase URL', !key && 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(Boolean)
      .join(' and ');
    tried.push(`  missing ${missing.padEnd(16)} ${envPath}  (has: ${Object.keys(env).join(', ')})`);
  }

  console.error('\nCould not find an env file with both a Supabase URL and the service role key.');
  console.error('Looked in, in order:\n');
  for (const line of tried) console.error(line);
  console.error(
    '\nAny one of SUPABASE_URL, EXPO_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL will do,' +
      '\nbut SUPABASE_SERVICE_ROLE_KEY must be in the same file.\n',
  );
  process.exit(1);
}
