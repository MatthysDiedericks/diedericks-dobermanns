# CURSOR PROMPT — Owners send photos of their dog every four months

A buyer takes their puppy home and Matt never sees the dog again. He wants a light, structured
rhythm: **up to three photos every four months**, a warm reminder when it is due, a way to tell him
if the dog has died, and control over which photos reach the public site.

**Run `CURSOR_PROMPT_PHONE_PHOTO_UPLOAD_FIX.md` first.** Owners will be uploading from phones. Every
fault in that prompt — HEIC not converting, greyed-out pickers, silent failures — lands on this
feature first and hardest.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Most of the rail already exists — do not rebuild it

`dog_media` already carries `uploaded_by`, `client_consent`, `is_public`, `approved_by`,
`approved_at`, and `src/lib/admin/mediaReview.ts` is already an admin review queue ordered by
`uploaded_at`. Use them. What is missing is the **cadence**, the **cap**, the **reminder**, and the
**deceased** path.

## 1 · The window: three photos every four months

New table `dog_photo_windows` — or a derived view if it can be done without one; prefer no new table
if the same answer falls out of `dog_media`:

- A window opens four months after the last accepted submission, or four months after go-home for a
  brand new owner.
- **Maximum three photos per window.** Enforce it in a `WITH CHECK` policy, not only in the UI —
  a client can call PostgREST directly.
- Photos land as `uploaded_by = auth.uid()`, `client_consent = false`, `is_public = false`,
  `approved_by = null`. **Nothing an owner uploads is public until Matt approves it.**
- RLS: an owner inserts only against a dog they own — reuse `dog_ids_for(auth.uid())`, the same
  helper `health_reminders` uses. Verify with a second real client's JWT that they cannot post to
  someone else's dog.

Show the owner where they are: *"2 of 3 photos this window · next window opens 12 February"*. When
the window is closed, say when it opens — never a disabled button with no explanation.

## 2 · The reminder — email, and a prompt in the portal

Matt chose email plus an in-portal prompt. **No WhatsApp nudge on this one.**

- A scheduled job finds owners whose window has opened and who have not submitted, and emails them.
- **Write it as if Matt wrote it.** This is the one place in the system that should feel like a
  person, not a system: *"It has been four months since Kira went home. How is she? Send us three
  photos — we would love to see how she has grown."* Use the dog's name and the owner's first name.
  Warm, short, no marketing.
- A matching prompt on the portal dashboard when the window is open.
- Send **once per window**, and never again if they submit. Nobody gets nagged.
- Log every send to `notifications_log` so a duplicate is visible.

**Note for Matt, and state it in the release note:** three of the nine Claire × Santini buyers have
no email address on file — Gabriella Kruger, Lee Prinsloo and Elrid Gerber. They will get the portal
prompt only, and will not be reminded unless they log in. Surface them on the admin screen as
"cannot be reminded — no email" so it is visible rather than silent.

## 3 · Reporting that a dog has died

This is the most delicate screen in the whole product. Treat it that way.

- A quiet link on the dog's portal page — *"Report a change in {name}'s health"* — not a red button
  sitting next to "Upload photos".
- The owner can mark the dog as deceased, add a date and a note, and **attach a vet report**.
- The vet report is stored `entity_type='dog'`, `category='health_certificate'`,
  `provided_by='client'`, **`is_public: false`, `client_visible: false`**. Matt and admins only —
  not the owner's own portal listing, not the public site, not the handover pack. Verify with a real
  JWT that the owner who uploaded it cannot read it back.
- Matt is alerted on the dashboard immediately. This is not a queue item to find next week.

### The condolence message is a draft, never an automatic send

**Matt's standing rule: nothing is sent on his behalf without him approving that specific message.**
It applies here more than anywhere. An auto-generated condolence email would be worse than no email
at all.

- When a death is reported, prepare a **draft** condolence message using the dog's and owner's names.
- Matt reads it, edits it, and presses send. Email, or copy for WhatsApp.
- **No cron, no trigger, no "send on status change".** If the code can send this without a human
  click, it is wrong.

### The dog's public page becomes a memorial, with no dates

Matt's decision: **keep the page, hide the dates.**

- The dog stays on the public site with a restrained memorial line. No date of death, no age, no
  "1 Jan 2020 – 3 Mar 2029" strip.
- Remove it from anything that implies availability: sales listings, "our dogs" filters, breeding
  displays.
- Keep every internal record exactly as it is — pedigree, health, documents, finance.
- Nothing about this is published without Matt's say-so. Deceased status flips the page to memorial;
  it does not write a public announcement.

## 4 · Matt's side

- A review queue of owner submissions: dog, owner, when, the photos. Approve or decline each.
- **Approving is what sets `is_public = true` and `client_consent = true`** and stamps `approved_by`
  and `approved_at`. Approval is a deliberate act, one photo at a time.
- Declining is silent to the owner. Nobody is told their photo was rejected.
- Approved photos appear **on that dog's own public profile only** — Matt's choice. Not the gallery,
  not the home page. An owner-photos section on the dog's page, clearly the dog as it is today.
- The dashboard shows: windows open, submissions waiting, owners who cannot be reminded, and any
  reported death.

## Rules

- Nothing an owner uploads is public until Matt approves that specific photo.
- The three-per-window cap is enforced in RLS, not just the UI.
- The vet report is admin-only — not even the owner who sent it.
- The condolence message is drafted, never sent automatically.
- Memorial pages show no dates.
- Reuse `dog_media`, `mediaReview.ts`, `dog_ids_for()`. Do not build a parallel media system.
- No file over 300 lines. New migrations go in **both** `supabase/migrations` folders with the same
  number and identical bytes — check the next free number across both.

## Verify — paste output, not descriptions

- [ ] An owner uploads 3 photos from a **phone**; a 4th is refused with a clear reason. Screenshot.
- [ ] Bypass the UI: POST a 4th photo straight to PostgREST with the owner's JWT. **It must fail.**
      Paste the error.
- [ ] A second real client cannot insert against another owner's dog. Test with a real JWT.
- [ ] The photos are `is_public=false, client_consent=false, approved_by=null` on arrival. Paste the rows.
- [ ] Matt approves one; only that one flips to public and appears on the dog's profile. Screenshot.
- [ ] The declined one appears nowhere public and the owner is not notified.
- [ ] Reminder email renders and reads like Matt wrote it. Paste the copy.
- [ ] Submitting closes the window — a second reminder is not sent. Paste `notifications_log`.
- [ ] The three buyers with no email are listed as "cannot be reminded". Screenshot.
- [ ] Report a death with a vet report. Paste the document row — `is_public=false`,
      `client_visible=false`, `provided_by='client'`.
- [ ] **The owner who uploaded the vet report cannot read it back.** Real JWT. Paste the count: 0.
- [ ] The condolence message exists as a draft and **nothing was sent**. Prove no mail left.
- [ ] The memorial page shows no dates and is gone from sales listings. Screenshot.
- [ ] Both migration folders still byte-identical.
- [ ] App: upload, cap, death report all work. Say which device.
- [ ] Website: `npm run preflight` passes.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** on **`diedericksdobermanns-web-v145`** — the project bound to the live
      domain. The other three are duplicates; ignore them.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the window and cap with RLS, the owner upload screen, the
reminder job and copy, the death report and vet document, the condolence draft, the review queue and
public profile section, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
