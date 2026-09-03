/**
 * Sends the branded portal invite email for invites that already exist in
 * `portal_invites`. It does NOT create invites and it does NOT generate codes —
 * the row and its code hash must already be there, and the plaintext code is
 * passed in below, because the database only ever stores the hash.
 *
 * RUN FROM THE WEBSITE FOLDER (that is where @supabase/supabase-js lives):
 *   cd "...\diedericksdobermann App\diedericksdobermann-web"
 *   node ../scripts/send-portal-invite-emails.mjs
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY from diedericksdobermann-web/.env.local.
 *
 * WHY THIS SCRIPT EXISTS
 * The admin panel's invite button does create + send in one action. These
 * clients had already self-registered, so the account existed but no invite had
 * ever been issued. The invite rows were created by hand; this only mails them.
 *
 * The HTML mirrors src/lib/admin/portalInviteEmail.ts + src/lib/notifications/
 * email.ts exactly. If either of those changes, this drifts — prefer the admin
 * panel for anything routine.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
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
const SITE = 'https://diedericksdobermanns.com';
const TTL_DAYS = 7;

const BRAND = {
  background: '#111008',
  surface: '#1C1A0E',
  gold: '#C4A35A',
  text: '#F5F0E8',
};

/**
 * Approved by Matt 31 Aug 2026. Leivale Rosenberg is deliberately absent:
 * her address is rosenbergleivale@fmail.com, almost certainly a typo for
 * gmail.com, so mail to her has never arrived. Do not add her until the
 * address is corrected. Gabrielle Kruger is also held back — her application
 * is still `submitted`, not approved.
 */
const RECIPIENTS = [
  {
    inviteId: '15718c1f-f267-4c07-8664-79fd8cf36838',
    email: 'henko@atlasstaal.co.za',
    fullName: 'Henko Burden',
    code: '370081',
  },
  {
    inviteId: '568a0150-2170-4c90-b7a6-2cb5c4e12a3f',
    email: 'sammatos13@gmail.com',
    fullName: 'Samantha Matos',
    code: '582013',
  },
];

if (!SERVICE_KEY) {
  console.error('\nERROR: SUPABASE_SERVICE_ROLE_KEY not found. Run from the website folder.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatExpiry(iso) {
  return new Date(iso).toLocaleString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  });
}

function displayWhatsApp(raw) {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith('27') && digits.length === 11) {
    return `+27 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw.trim();
}

function supportFooter(settings) {
  const email = (settings.contact_email ?? '').trim();
  const whatsapp = (settings.contact_whatsapp ?? '').trim();
  const waDigits = whatsapp.replace(/[^\d]/g, '');
  const quiet = `font-size:12px; line-height:1.7; color:${BRAND.gold}99;`;
  const link = `color:${BRAND.gold}; text-decoration:underline;`;
  const lines = [];
  if (email) {
    const safe = escapeHtml(email);
    const help = waDigits ? '' : ' and we will help.';
    lines.push(
      `<p style="margin:0 0 6px; ${quiet}">Email us at <a href="mailto:${safe}" style="${link}">${safe}</a>${help}</p>`,
    );
  }
  if (waDigits) {
    const label = escapeHtml(displayWhatsApp(whatsapp));
    const prefix = email ? 'or WhatsApp' : 'WhatsApp';
    lines.push(
      `<p style="margin:0 0 6px; ${quiet}">${prefix} <a href="https://wa.me/${waDigits}" style="${link}">${label}</a> and we will help.</p>`,
    );
  }
  if (!lines.length) return '';
  return `<p style="margin:28px 0 8px; ${quiet}">Any trouble or questions?</p>${lines.join('')}`;
}

function emailShell(heading, bodyHtml, settings) {
  return `
    <div style="font-family: Georgia, serif; background:${BRAND.background}; color:${BRAND.text}; padding:32px;">
      <div style="max-width:560px; margin:0 auto; background:${BRAND.surface}; padding:32px; border:1px solid ${BRAND.gold}33;">
        <h1 style="color:${BRAND.gold}; font-size:14px; letter-spacing:0.18em; text-transform:uppercase; margin:0 0 20px;">
          ${heading}
        </h1>
        ${bodyHtml}
        ${supportFooter(settings)}
        <p style="margin-top:32px; font-size:12px; color:${BRAND.gold}99;">
          Diedericks Dobermanns
        </p>
      </div>
    </div>
  `;
}

function inviteBody(r, expiresAt) {
  const name = escapeHtml(r.fullName.trim().split(/\s+/)[0] || 'there');
  const href = escapeHtml(`${SITE}/portal/auth/confirm?invite=${encodeURIComponent(r.inviteId)}`);
  const code = escapeHtml(r.code);
  const when = escapeHtml(formatExpiry(expiresAt));
  const verify = escapeHtml(`${SITE}/portal/verify-code?email=${encodeURIComponent(r.email)}`);
  return `
      <p style="line-height:1.6;">Hi ${name},</p>
      <p style="line-height:1.6;">
        Your Diedericks Dobermanns sign-in code is:
      </p>
      <p style="font-size:28px;letter-spacing:0.24em;color:#C4A35A;font-family:Georgia,serif;">
        ${code}
      </p>
      <p style="line-height:1.6;font-size:13px;color:#C4A35A99;">
        It expires ${when} (${TTL_DAYS} days). Type it at ${verify}.
        A mail scanner cannot use a code.
      </p>
      <p style="line-height:1.6;">
        Or open the link below and press <strong>Sign in to your portal</strong>
        on the page — fetching the link does not sign anyone in.
      </p>
      <p style="margin:28px 0;">
        <a href="${href}"
           style="display:inline-block;background:#C4A35A;color:#111008;text-decoration:none;
                  font-family:Georgia,serif;letter-spacing:0.12em;text-transform:uppercase;
                  font-size:13px;padding:14px 22px;">
          Sign in to your portal
        </a>
      </p>
      <p style="word-break:break-all;font-size:12px;color:#F5F0E8;">${href}</p>
  `;
}

async function run() {
  const { data: settingRows } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['contact_email', 'contact_whatsapp']);
  const settings = Object.fromEntries((settingRows ?? []).map((s) => [s.key, s.value]));

  let sent = 0;
  let failed = 0;

  for (const r of RECIPIENTS) {
    // The invite must exist, be unredeemed and unexpired. If it is not, the
    // code in this file is stale and mailing it would waste the client's time.
    const { data: invite, error: inviteErr } = await supabase
      .from('portal_invites')
      .select('id, email, expires_at, code_redeemed_at')
      .eq('id', r.inviteId)
      .maybeSingle();

    if (inviteErr || !invite) {
      console.error(`NO INVITE ROW  ${r.email}  ${inviteErr?.message ?? 'not found'}`);
      failed++;
      continue;
    }
    if (invite.email.toLowerCase() !== r.email.toLowerCase()) {
      console.error(`EMAIL MISMATCH ${r.email} vs ${invite.email} — refusing to send`);
      failed++;
      continue;
    }
    if (invite.code_redeemed_at) {
      console.log(`already redeemed  ${r.email} — skipping`);
      continue;
    }
    if (new Date(invite.expires_at) <= new Date()) {
      console.error(`EXPIRED  ${r.email}  ${invite.expires_at} — issue a new invite first`);
      failed++;
      continue;
    }

    const html = emailShell('Your private portal code', inviteBody(r, invite.expires_at), settings);
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: r.email,
        subject: `Your Diedericks Dobermanns code is ${r.code}`,
        html,
      },
    });

    if (error || data?.error) {
      console.error(`SEND FAILED  ${r.email}: ${error?.message ?? data?.error}`);
      failed++;
      continue;
    }

    console.log(`sent  ${r.fullName}  ${r.email}`);
    sent++;
  }

  console.log(`\nDone. ${sent} sent, ${failed} failed.`);
  console.log('\nCheck delivery:');
  console.log("  select * from notifications_log order by created_at desc limit 10;");
}

run().catch((e) => {
  console.error('Unexpected failure:', e);
  process.exit(1);
});
