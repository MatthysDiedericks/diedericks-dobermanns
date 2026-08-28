# CURSOR PROMPT — Choose what goes in the handover pack, and send it to the buyer

The pack works. Matt wants two things on top: **pick the sections before printing**, and **email it
to the buyer from the puppy profile**.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Read this first — two things will break the send silently

### 1 · The `send-email` Edge Function throws attachments away

`src/lib/notifications/email.ts` accepts an `attachments` array and posts it in the body. **The
deployed function never forwards it.** Here is the live source:

```ts
interface EmailPayload { to: string; subject: string; html: string; }   // no attachments
const { to, subject, html } = (await req.json()) as EmailPayload;       // attachments dropped
body: JSON.stringify({ from: FROM, to, subject, html }),               // never reaches Resend
```

Resend returns **200**. `sendEmail()` returns `{ error: null }`. The buyer gets a covering note and
**no pack**, and nothing anywhere reports a failure. Fix the function and redeploy it **before**
building the UI, or you will be testing a feature that reports success while doing nothing.

- Add `attachments?: { filename: string; content: string; contentType?: string }[]` to the payload.
- Forward it to Resend as `attachments: [{ filename, content }]` — Resend takes base64 in `content`.
- **Test with the real 5 MB pack**, not a small file. Base64 inflates it by about a third, to roughly
  6.7 MB of request body. If that exceeds the Edge Function's limit, say so with the actual error and
  fall back to the link-only path in section 4 — do not guess the limit, measure it.

### 2 · Buyers are matched to puppies by name string, not by a foreign key

`loadReadiness.ts` resolves a buyer as `owner_id → users.full_name`, else `reserved_for_name`, else
`new_owner_name`. Names resolve for all nine. **Email addresses do not**, because there is no real
link to `contacts`:

| puppy | buyer | email |
|---|---|---|
| 1 Pink | Josef Kotze | ✓ |
| 2 Red | Jacoline Pretorius | ✓ |
| 3 Gold | Jannecke Smit | ✓ |
| 4 Purple | Gabriella Kruger | **none** |
| 5 Peach | Nicolas Hohls | ✓ |
| 6 Orange | Deon Vlok | ✓ |
| 7 Blue | Lee Prinsloo | **none** — she is "Leandre Prinsloo" in `contacts` |
| 8 Grey | Leo Middelberg | ✓ |
| 9 Yellow | Elrid Gerber | **none** — his daughter Shanel Halgreen is the contact |

Two of those three are not missing data, they are **failed string matches**. Add
`dogs.buyer_contact_id` (FK to `contacts`) and use it as the first source for both name and email.
Keep the existing text fields as fallback so nothing regresses. Backfill what can be matched with
confidence and leave the rest for Matt to set from the puppy profile.

**Also: only Puppy 1 has `owner_id` set.** `canDownloadHandoverPack` requires an owner match, so the
portal copy will silently fail for the other eight. Fix that here — it is the same problem wearing a
different hat.

---

## 3 · Choose the sections

`src/lib/handover/pages/*` is already one module per section, so the selection maps straight onto it.

A panel on the puppy profile, all ticked by default:

```
[x] Cover                    [x] Sire certificates
[x] Parentage                [x] Dam certificates
[x] Health record            [x] Contract
[x] Care sheet
```

- Let Matt tick individual certificates too, not just "all sire" — he may want the pedigree without
  three DNA reports.
- Show a **live page count and file size** as boxes are ticked. Today's full pack is 29 pages, 5.03 MB;
  the buyer's inbox and Matt's printer both care.
- The choice travels as a query parameter on the existing route, so the URL stays shareable and the
  route stays cacheable. Validate the parameter server-side; an unknown section is ignored, never a 500.
- **The cover is always included.** A pack with no cover is a stack of loose certificates.
- Remember the last selection per admin — Matt will print the same combination nine times.

## 4 · Send it to the buyer

**Matt's standing rule: nothing is ever sent on his behalf without him approving that specific
message.** This feature exists because he asked for it, and it must still obey the rule.

- **"Email to buyer"** on the puppy profile opens a preview: recipient address, subject, the covering
  message, and a list of exactly which sections are attached and the file size.
- Matt edits the message, then presses **Send**. One puppy, one press.
- **No bulk send. No send on status change. No cron.** Generating nine packs is bulk; sending them is
  not.
- Attach the PDF when it is small enough. When it is not, send the portal link instead and **say so in
  the preview** so Matt knows what the buyer will receive.
- Always include the portal link as well as any attachment — a buyer who loses the email still has it.
- Log every send to `notifications_log`: puppy, recipient, sections, size, timestamp, who sent it.
- If `sendEmail()` returns an error, **show it**. Never a silent success toast.
- A buyer with no email address gets a disabled button with the reason and a link to fix the contact —
  three of the nine are in this state today.

## 5 · Give Matt the WhatsApp path too

Three buyers have no email on file and Matt runs this business on WhatsApp. Alongside "Email to
buyer", offer **"Copy link"** and a **WhatsApp** button using the existing `whatsappLink` helper in
`src/lib/settings-keys.ts`. That works today for every buyer, with no attachment limits.

---

## The app

- Section picker and send from the app — Matt is at the kennel when buyers arrive.
- Same preview-then-press-send flow. **The rule does not relax on mobile.**
- Sharing via the OS share sheet (`expo-sharing`) is already there and is the natural mobile path;
  wire the picker into it.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on
this filesystem.**

## Rules

- Fix and redeploy `send-email` **first**, and prove an attachment arrives before building any UI.
- Nothing sends without Matt pressing send for that specific buyer.
- No bulk email, ever.
- A failed send is reported, never swallowed.
- The cover is always in the pack.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Send a test email **to Matt** with the full 5 MB pack attached. Open it and confirm the PDF is
      there and opens. This is the check that catches the dropped-attachment bug — do it first.
- [ ] Paste the size of the base64 body actually sent, and whether the Edge Function accepted it.
- [ ] Untick "Sire certificates" and regenerate: page count drops from 29, and no sire divider pages
      remain. Paste both page counts.
- [ ] Untick everything except Cover and Health: the PDF has exactly those sections.
- [ ] The live page count and size update as boxes are ticked. Screenshot.
- [ ] A tampered section parameter is ignored and still returns a valid PDF, not a 500.
- [ ] `dogs.buyer_contact_id` exists and is populated for the puppies where the match is certain.
      Paste the nine rows with buyer name and email resolved.
- [ ] `owner_id` set for the buyers who have portal accounts; a second client still cannot open
      another's pack. Test with a real JWT.
- [ ] The send preview shows recipient, sections and size before anything leaves. Screenshot.
- [ ] Gabriella Kruger's puppy shows the disabled button with the reason, not a broken send.
- [ ] `notifications_log` has one row per send with sections and size. Paste it.
- [ ] Prove no email is sent by generating a pack or marking a puppy delivered — only the button sends.
- [ ] App: picker and send work. Say which device.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** on **`diedericksdobermanns-web-v145`** — the project bound to the live
      domain. The other three are duplicates; ignore them.
- [ ] `supabase functions deploy send-email` succeeded. Paste the version.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the Edge Function attachment fix, `buyer_contact_id` and the
owner backfill, the section picker, the send flow, WhatsApp and copy-link, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`src/app/api/quotes/[id]/pdf/route.ts`, `src/app/api/statements/pdf/route.ts`.
