/**
 * Uploads the two KUSA registration certificates and attaches each to its dog.
 *
 * RUN FROM THE WEBSITE FOLDER (that is where @supabase/supabase-js lives):
 *   cd "...\diedericksdobermann App\diedericksdobermann-web"
 *   node ../scripts/upload-registration-certificates.mjs
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY from diedericksdobermann-web/.env.local.
 *
 * The certificate images live in `certificates/` at the project root. They are
 * read from there, not from a Claude session folder, so this stays runnable.
 *
 * VISIBILITY — read this before changing it.
 * `is_public: false`, `client_visible: true`. A KUSA certificate carries the
 * owner's postal address, the microchip number and the DNA profile. Buyers who
 * have a dog see it; the public website does not. Registration papers are good
 * marketing, so if Matt wants them on the public site, flip `is_public` to true
 * — but that is his call to make deliberately, not a default.
 *
 * The dog rows themselves were already corrected directly on 26 Aug 2026:
 * registered name, registration number, colour, and for Santini the microchip,
 * tattoo and DNA profile. This script only adds the scanned documents.
 *
 * Idempotent: the storage path is fixed per dog, so a re-run overwrites rather
 * than duplicating, and the documents row is skipped if one already points at
 * that path.
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
const BUCKET = 'documents';
const CERT_DIR = path.join(projectRoot, 'certificates');

// dog ids verified against the live database 26 Aug 2026.
const CERTIFICATES = [
  {
    file: 'claire-kusa-registration-ZA005357B22.png',
    dogId: 'bb08f772-5a26-47c5-94f1-8768907a191c',
    dogName: 'Claire',
    registeredName: 'DE ZELIG CLAIRE HDB1-A2, EDOO',
    registrationNumber: 'ZA005357B22',
    // "DATE OF REGISTRATION" printed on the certificate.
    dateOfDocument: '2022-05-04',
  },
  {
    file: 'santini-kusa-registration-ZA001071C26.png',
    dogId: 'c54ae0cf-dcba-4d83-a0eb-b6823132b0d1',
    dogName: 'Santini',
    registeredName: 'SANTINI BETELGES OF DE ZELIG (IMP SER)',
    registrationNumber: 'ZA001071C26',
    dateOfDocument: '2026-07-16',
  },
  // Microchip certificates, GetMeKnown / ChipnDoodle, implanted 26 Aug 2026.
  // NOTE: "Peaches" is Josef Kotze's dog, which is Puppy 1 (PINK). It is NOT
  // Puppy 5 (Peach), which belongs to Nicolas Hohls. Matched on owner, sex and
  // date of birth, never on the nickname.
  {
    file: 'puppy1-pink-peaches-microchip-972274200739944.png',
    dogId: 'fcd29f74-d6a3-4199-b16c-edba0f69b995',
    dogName: 'Puppy 1 (Pink) — Peaches',
    registeredName: 'Puppy 1 (Pink) "Peaches"',
    registrationNumber: '972274200739944',
    dateOfDocument: '2026-08-26',
    category: 'microchip',
    issuedBy: 'GetMeKnown (Pty) Ltd',
  },
  {
    file: 'puppy9-yellow-kira-microchip-972274200739960.png',
    dogId: '0e10151c-5ae7-4d6f-bf3e-4ded60e1adfc',
    dogName: 'Puppy 9 (Yellow) — Kira',
    registeredName: 'Puppy 9 (Yellow) "Kira"',
    registrationNumber: '972274200739960',
    dateOfDocument: '2026-08-26',
    category: 'microchip',
    issuedBy: 'GetMeKnown (Pty) Ltd',
  },
  {
    file: 'puppy3-gold-diablo-microchip-972274200739979.png',
    dogId: '30e2fa58-2e8d-4e46-8eff-01d1c39eb5a4',
    dogName: 'Puppy 3 (Gold) — Diablo',
    registeredName: 'Puppy 3 (Gold) "Diablo"',
    registrationNumber: '972274200739979',
    dateOfDocument: '2026-08-26',
    category: 'microchip',
    issuedBy: 'GetMeKnown (Pty) Ltd',
  },
  {
    file: 'puppy5-peach-zola-microchip-972274200739935.png',
    dogId: 'efbea068-b60b-476b-b680-5a69235e1bff',
    dogName: 'Puppy 5 (Peach) — Zola',
    registeredName: 'Puppy 5 (Peach) "Zola"',
    registrationNumber: '972274200739935',
    dateOfDocument: '2026-08-26',
    category: 'microchip',
    issuedBy: 'GetMeKnown (Pty) Ltd',
  },
  {
    file: 'puppy8-grey-ziba-microchip-972274200740024.png',
    dogId: '1ca36a6a-5631-4b3f-b60f-5bdc7aebd5d3',
    dogName: 'Puppy 8 (Grey) — Ziba',
    registeredName: 'Puppy 8 (Grey) "Ziba"',
    registrationNumber: '972274200740024',
    dateOfDocument: '2026-08-26',
    category: 'microchip',
    issuedBy: 'GetMeKnown (Pty) Ltd',
  },
];

if (!SERVICE_KEY) {
  console.error('\nERROR: SUPABASE_SERVICE_ROLE_KEY not found. Run from the website folder.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function run() {
  let ok = 0, skipped = 0, failed = 0;

  for (const c of CERTIFICATES) {
    const local = path.join(CERT_DIR, c.file);
    if (!fs.existsSync(local)) {
      console.error(`MISSING FILE  ${c.dogName}  ${local}`);
      failed++;
      continue;
    }

    // Convention for this bucket is dog/{dog_id}/… — the per-entity prefix is
    // what the storage RLS policy scopes on. Do not flatten it.
    const category = c.category ?? 'registration';
    const issuedBy = c.issuedBy ?? 'Kennel Union of Southern Africa';
    const slug = category === 'microchip' ? 'microchip' : 'kusa-registration';
    const storagePath = `dog/${c.dogId}/${slug}-${c.registrationNumber}.png`;
    const bytes = await readFile(local);

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: 'image/png', upsert: true });
    if (upErr) {
      console.error(`UPLOAD FAILED ${c.dogName}: ${upErr.message}`);
      failed++;
      continue;
    }

    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('entity_type', 'dog')
      .eq('entity_id', c.dogId)
      .eq('storage_path', storagePath)
      .maybeSingle();

    if (existing) {
      console.log(`already linked  ${c.dogName}  ${c.registrationNumber}`);
      skipped++;
      continue;
    }

    const { error: insErr } = await supabase.from('documents').insert({
      entity_type: 'dog',
      entity_id: c.dogId,
      document_name:
        category === 'microchip'
          ? `Microchip certificate — ${c.registeredName}`
          : `KUSA registration certificate — ${c.registeredName}`,
      original_filename: c.file,
      storage_path: storagePath,
      file_type: 'png',
      mime_type: 'image/png',
      file_size_bytes: bytes.length,
      category,
      is_public: false,
      client_visible: true,
      requires_auth: true,
      description:
        category === 'microchip'
          ? `Microchip implant certificate. Chip ${c.registrationNumber}, implanted 26 Aug 2026 ` +
            `by Matthys Diedericks. Issued by GetMeKnown (Pty) Ltd.`
          : `Certificate of Registration and Certified Pedigree, Kennel Union of Southern Africa. ` +
            `Registration ${c.registrationNumber}. Four-generation pedigree on the certificate.`,
      date_of_document: c.dateOfDocument,
      issued_by: issuedBy,
      document_number: c.registrationNumber,
      provided_by: 'staff',
      review_status: 'verified',
    });
    if (insErr) {
      console.error(`DB LINK FAILED ${c.dogName}: ${insErr.message}`);
      failed++;
      continue;
    }

    console.log(`linked  ${c.dogName}  ${c.registrationNumber}`);
    ok++;
  }

  console.log(`\nDone. ${ok} linked, ${skipped} already present, ${failed} failed.`);
  console.log('\nVerify:');
  console.log("  select d.name, doc.document_name, doc.document_number, doc.category");
  console.log("    from documents doc join dogs d on d.id = doc.entity_id");
  console.log("   where doc.entity_type='dog' and doc.category='registration'");
  console.log("     and d.name in ('Claire','Santini');");
}

run().catch((e) => { console.error('Unexpected failure:', e); process.exit(1); });
