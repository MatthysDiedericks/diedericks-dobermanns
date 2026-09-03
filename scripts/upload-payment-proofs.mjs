/**
 * Uploads buyer proof-of-payment PDFs that arrived by WhatsApp or email rather
 * than through the portal, and attaches each one to the right buyer.
 *
 * RUN FROM THE WEBSITE FOLDER (that is where @supabase/supabase-js lives):
 *   cd "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App\diedericksdobermann-web"
 *   node ..\scripts\upload-payment-proofs.mjs
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY from diedericksdobermann-web/.env.local.
 * The PDFs live in scripts/proofs/ at the project root.
 *
 * WHY related_quote_id IS NOT OPTIONAL — read before editing.
 * The admin Quotes list draws its Payment column from
 * lib/finance/quoteServerQueries.ts -> proofByQuote(), which queries documents
 * by `related_quote_id`. A proof attached only to the invoice is invisible
 * there: the column shows a dash and the payment looks unevidenced. Every proof
 * below therefore carries BOTH related_quote_id and related_invoice_id.
 *
 * VISIBILITY.
 * `is_public: false`, `client_visible: true`. A payment notification carries the
 * buyer's name and our bank account number. The buyer should see their own
 * proof; nobody else should. Never make these public.
 *
 * `provided_by: 'staff'` and `review_status: 'verified'` are correct here and
 * ONLY here: Matt received these documents from the buyers directly and has
 * confirmed the funds. A proof a client uploads themselves must land as
 * 'pending' for a human to verify — do not copy this file for that path.
 *
 * Idempotent. The storage path is fixed per proof, so a re-run overwrites the
 * file rather than duplicating it, and the documents row is reused if one
 * already points at that path.
 *
 * All ids verified against the live database on 1 Sep 2026.
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
const PROOF_DIR = path.join(projectRoot, 'scripts', 'proofs');
const MATT = 'fa26c05d-42f1-465f-9c7a-3e117a7bba38';

const PROOFS = [
  {
    file: 'deon-vlok-fnb-20260620.pdf',
    buyer: 'Deon Vlok',
    name: 'Proof of payment — Deon Vlok, R15 000, 20 Jun 2026',
    clientId: null, // no portal account yet
    invoiceId: '6c265764-30f2-46f4-b3f1-9341f2d162db', // DD-2026-0015
    quoteId: 'f8d7f642-1d37-4a4f-8b3a-5bbc15ed4973', // DD-1156
    description: 'FNB payment notification, trace XDNYSKHQ. Paid in full.',
  },
  {
    file: 'jannecke-smit-capitec-20260410.pdf',
    buyer: 'Jannecke Smit',
    name: 'Proof of payment — Jannecke Smit, R10 000 deposit, 10 Apr 2026',
    clientId: '02e469c5-34b9-4994-8b0f-dfd89286c4b8',
    invoiceId: '01a6c3bb-abd7-43af-b358-f95bf3999687', // DD-2026-0017
    quoteId: '9c46a087-0126-4f1b-8265-ccd021bf5946', // DD-1158
    description: 'Capitec payment notification, ref “Jannecke SMIT Diablo”. Deposit.',
  },
  {
    file: 'jacoline-pretorius-capitec-20260806.pdf',
    buyer: 'Jacoline Pretorius',
    name: 'Proof of payment — Jacoline Pretorius, R10 000 deposit, 6 Aug 2026',
    clientId: null,
    invoiceId: '317a9a3a-c4b2-48fe-a656-3fee0b6313ab', // DD-2026-0018
    quoteId: 'f7104573-5d00-4575-a810-4ded810a15ef', // DD-1159
    description: 'Capitec payment notification, ref “J PRETORIUS”, SkyQR 2f4f-586a-3430. Deposit.',
  },
  {
    file: 'ronel-emmenes-capitec-20260901.pdf',
    buyer: 'Ronel Emmenes',
    name: 'Proof of payment — Ronel Emmenes, R10 000 deposit, 1 Sep 2026',
    clientId: 'b4ca51f2-2428-4255-bfc5-eff739c4655c',
    invoiceId: '92bf83ad-1107-43cf-83a8-656937a0443b', // DD-2026-0014
    quoteId: '1172c276-caba-4ba2-9053-a44048926643', // DD-1152
    description: 'Capitec payment notification, ref “DD-1152 R EMMENES”, SkyQR 6f4d-4433-5878. Deposit.',
  },
  {
    file: 'leo-middelberg-fnb-20260428.pdf',
    buyer: 'Leo Middelberg',
    name: 'Proof of payment — Leo Middelberg, R10 000 deposit, 28 Apr 2026',
    clientId: null,
    invoiceId: 'c92787e9-a30a-4a61-8293-3040af817ee0', // DD-2026-0020
    quoteId: '97e5857a-13cf-4ec5-8fd1-3d2aaf0d8424', // DD-1163
    description:
      'FNB payment notification, trace HF16DT7P. Paid from WERKSWINKEL AT ZWAVELPOORT (PTY) LTD — the buyer’s company account, so the payer name does not match the buyer name. Deposit; predates the invoice.',
  },
];

async function main() {
  if (!SERVICE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not found in diedericksdobermann-web/.env.local');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let ok = 0;
  for (const proof of PROOFS) {
    const localPath = path.join(PROOF_DIR, proof.file);
    if (!fs.existsSync(localPath)) {
      console.error(`  MISSING  ${proof.file} — skipped`);
      continue;
    }
    const bytes = await readFile(localPath);
    const storagePath = `proof-of-payment/${proof.file}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) {
      console.error(`  UPLOAD FAILED  ${proof.buyer}: ${upErr.message}`);
      continue;
    }

    let documentId;
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('storage_path', storagePath)
      .maybeSingle();

    if (existing) {
      documentId = existing.id;
      // Re-run: make sure the quote link is present even if an earlier version
      // of this script wrote the row without it.
      await supabase
        .from('documents')
        .update({ related_quote_id: proof.quoteId, related_invoice_id: proof.invoiceId })
        .eq('id', documentId);
      console.log(`  ${proof.buyer}: file replaced, existing document ${documentId} relinked`);
    } else {
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({
          entity_type: proof.clientId ? 'client' : 'invoice',
          entity_id: proof.clientId ?? proof.invoiceId,
          document_name: proof.name,
          original_filename: proof.file,
          storage_path: storagePath,
          file_type: 'pdf',
          mime_type: 'application/pdf',
          file_size_bytes: bytes.length,
          category: 'proof_of_payment',
          description: proof.description,
          client_visible: true,
          is_public: false,
          uploaded_by: MATT,
          related_quote_id: proof.quoteId,
          related_invoice_id: proof.invoiceId,
          review_status: 'verified',
          provided_by: 'staff',
        })
        .select('id')
        .single();
      if (docErr) {
        console.error(`  DOCUMENT ROW FAILED  ${proof.buyer}: ${docErr.message}`);
        continue;
      }
      documentId = doc.id;
      console.log(`  ${proof.buyer}: uploaded -> ${storagePath} (document ${documentId})`);
    }

    // Attach the proof to the payment ledger entry so the invoice screen shows
    // the document beside the money.
    const { error: payErr } = await supabase
      .from('invoice_payments')
      .update({ proof_document_id: documentId })
      .eq('invoice_id', proof.invoiceId)
      .is('proof_document_id', null);
    if (payErr) console.error(`    payment link failed: ${payErr.message}`);
    ok += 1;
  }

  console.log(`\n${ok} of ${PROOFS.length} proofs attached.`);
  console.log('Check: Admin -> Quotes, the Payment column should now show a proof');
  console.log('for DD-1152, DD-1156, DD-1158, DD-1159 and DD-1163.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
