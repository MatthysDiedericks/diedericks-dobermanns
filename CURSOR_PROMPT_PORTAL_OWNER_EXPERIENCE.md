# CURSOR PROMPT — What the owner actually gets in the portal

The portal currently proves a buyer owns a dog. It does not yet help them *raise* one.
This closes that gap.

**Repo:** `diedericksdobermann-web` (mirror to the app per the standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Already correct — do not change

- **Waiting list is already private.** RLS on `waiting_list` restricts a client to
  `client_id = auth.uid()`. A buyer sees their own row only. Do not add a client-side
  filter "to be safe" — it would mask a future RLS regression rather than prevent one.
- **Parents' health documents are already permitted.** The `documents` policy allows
  categories `dna_test`, `hip_elbow_score`, `pedigree`, `registration` for
  `my_dog_parent_ids()`. The reason they don't appear is a data problem (documents
  miscategorised as `other`), being fixed separately. Build the UI assuming they will
  arrive.

---

## 1. The dog's birthday

`dogs.date_of_birth` exists and is populated. Surface it:

- On the portal dog page and the dashboard "my dog" card: date of birth and **current age**
  in weeks up to six months, then in months and years.
- On the dog's birthday each year, show a small gold banner on the portal dashboard:
  *"[Name] turns 2 today."* The email that goes with it is section 6.

## 2. Documents — health, grouped and explained

Rework `portal/(panel)/documents` into three labelled groups, in this order:

1. **Your dog** — everything for the dog they own.
2. **Sire and dam health** — the parents' health testing. Show which parent each belongs
   to and what the document is.
3. **Kennel documents** — anything public.

A buyer does not know what a DCM panel or a hip score is. Under the group heading, one
line of plain English: *"These are the health tests carried out on your puppy's parents
before the litter was planned."* Where the category is known, label it in plain terms —
"Hip and elbow score", "DNA health panel", "Pedigree certificate" — not the raw
category key.

If the sire and dam group is empty, say *"Health documents for this litter's parents will
appear here"* rather than showing nothing at all.

## 3. Vaccinations — the scanned card

`vaccinations` records the schedule; buyers also want the physical card they can show a
vet or a border official.

- On `portal/(panel)/vaccinations`, show any document in category `vaccination_record`
  linked to their dog, with a thumbnail for images and a download for PDFs.
- Admin side: on the dog page, an upload control that files a scan into `documents` with
  `category = 'vaccination_record'`, `entity_type = 'dog'`, `client_visible = true`.
- Do not invent a new table. This is a document with a category.

**International buyers need this most** — a vaccination card and rabies titre are what
customs asks for. Make it downloadable, not just viewable.

## 4. Request training

A new portal action: the owner asks the kennel about training.

- Button on the portal dashboard and the dog page: **Request training**.
- Form: which dog, what they are after (free text plus a few common options —
  puppy foundation, obedience, protection foundation, behaviour problem), preferred
  timing, and their message.
- Writes to `training_bookings` with a status meaning *requested*, not *booked* — read
  the table's existing status values before choosing one. Nothing is scheduled by this
  form; it is an enquiry.
- Emails the kennel using the existing `kennelAlerts` fan-out pattern.
- The owner sees their requests and their status on the portal training screen.
- Confirm in plain words: *"We have your request and will come back to you."* Do not
  imply a booking exists.

## 5. Training tips and their plan

Two different things — keep them separate.

**a) Training library** (general reading, same for everyone)

- `portal/(panel)/training/guides` listing articles by topic: bringing your puppy home,
  house training, socialisation, lead work, feeding and growth, what to expect at each
  age.
- Content lives in a new `training_guides` table: `id, title, slug, summary, body_html,
  category, min_age_weeks, max_age_weeks, sort_order, is_published, created_at`.
- **Write the migration; do not apply it.** Say clearly at the end of your run that it
  needs applying — Cursor cannot reach Supabase, and unapplied migrations have broken
  this project repeatedly.
- Admin CRUD at `/admin/training/guides`.
- Seed nothing. Matt writes the content.

**b) Their dog's plan** (specific to the dog they own)

- On the portal dog page, a **Training plan** section showing what the kennel recommends
  for this dog at its current age.
- Drive it off `min_age_weeks` / `max_age_weeks` against the dog's actual age, so an
  eight-week puppy sees house training and socialisation, and a nine-month dog does not.
- Where the dog is `elite_developed`, show the work already completed from
  `dog_timeline` above the plan — what was built, and what they must now continue. That
  is a contractual obligation under Addendum A, so the portal must make it visible
  rather than leaving it in a document they read once.

## 6. The birthday email

Once a year, for every dog with an owner, a short greeting on its birthday. This is the
one message the kennel sends that asks for nothing — which is exactly why it is the one
they will remember.

### The job

- A daily scheduled function, following the existing pattern in
  `schedule_check_document_expiry_daily` and the application-reminder cron. Look at how
  those are set up before writing a new approach.
- Selects dogs where `date_of_birth` month and day match today, `owner_id` is not null,
  and `status` is not `deceased`. **Check the status** — nothing does more damage than a
  cheerful birthday email about a dog that has died.
- Sends to the owner's email.

### Do not send twice

`notifications_log` now accepts type `dog_birthday` (already applied to the database).
Before sending, check whether a `dog_birthday` row exists for that recipient **this
calendar year**. If it does, skip.

A retry, a redeploy, or a second cron firing must never produce two greetings. Do not use
a boolean flag on the dog — it would need resetting every year and will eventually be
forgotten.

### The email

Warm and short. It is a greeting, not a newsletter. No offers, no links to available
puppies, no "share your photos" call to action.

- Subject: `Happy birthday, [Dog name]`
- Address the owner by first name.
- Say how old the dog is turning, in words: *"turns two today"*.
- One or two lines that mean something — the kennel remembers this dog, and is glad it
  found the home it did.
- Sign off as Matthys, from the kennel, with the brand line.
- Include the dog's photo if one is available on `dog_media`; skip the image cleanly if
  not, rather than leaving a broken frame.

Use the existing `emailShell()` so it looks like every other message from the kennel.

Suggested copy, adjust as you see fit but keep the register:

```
Dear [First name],

[Dog name] turns [age in words] today.

We remember every dog we breed, and we think about where they end up. It
means a great deal to us that this one ended up with you.

We hope the year ahead is a good one for both of you.

Kind regards
Matthys Diedericks
Diedericks Dobermanns
Born With Purpose. Built With Discipline.
```

### Admin visibility

On the admin dashboard, a small "birthdays this week" list — dog, owner, date. Matt may
want to send a message himself, and knowing beforehand is worth more than a log entry
afterwards.

## 7. Owners upload photos of their own dog

Owners take far better photos of their dogs living real lives than any kennel shoot, and
those photos are the kennel's best marketing — but only with permission.

- On the portal dog page, an **Add photos** control: multi-select, client-side compression
  (`browser-image-compression` is already a dependency), progress, and a clear failure
  message per file rather than one silent failure for the batch.
- A **required consent tick** on every upload: *"Diedericks Dobermanns may use these
  photos publicly."* Default **unticked**. An owner who declines still gets their photos
  in their own portal — they simply are not publishable.
- Store consent on the row, not inferred later. Look at how `dog_media` already models
  client uploads and publish control (migration `dog_media_client_uploads_and_publish_control`)
  and reuse it. Do not add a parallel table.
- Uploads are **never** public immediately. They land as pending for kennel review.
- Admin: the existing `/admin/media/pending` queue is where these appear — approve,
  publish, or reject. Show the consent state on each item, and make publishing impossible
  where consent was withheld. That must be enforced server-side, not by hiding a button.
- The owner sees their own photos on their dog page whatever their status, labelled
  plainly: *"Awaiting review"*, *"Published"*, or *"Kept private at your request"*.

**Consent is not a checkbox you can ignore later.** Publishing a photo whose owner
declined is the kind of thing that ends a client relationship, so it is enforced in the
action, not the UI.

## 8. "What happens next" — the buyer's journey, shown everywhere

A buyer who has just submitted an application does not know what happens now, how long it
takes, or that they need an account. That uncertainty produces the chasing emails Matt is
trying to escape.

**The confirmation email is already done** — it now invites them to register and prints
the journey with the current step marked (`journeySteps()` in
`src/lib/notifications/applicantEmails.ts`). Do not rewrite it. Build the on-screen
equivalent.

### a) The apply success page

After a successful submission on `/apply`, do not just say "thank you". Show:

- Their reference number, prominently, with "keep this for any correspondence".
- **A clear call to create their portal account now**, using the same email address they
  applied with. Explain in one line why: the quotation arrives there, they accept it
  there, and they upload proof of payment there.
- The journey breadcrumb below, with **step 1 marked current**.

### b) A shared `JourneyBreadcrumb` component

One component, used on the apply success page, the portal dashboard, and the portal
application screen. Seven steps:

```
1  Application submitted
2  We review it personally
3  Quotation issued to your portal
4  You accept and pay the deposit
5  You upload your proof of payment
6  Your puppy is allocated
7  Go-home day
```

Completed steps get a gold tick, the current step is gold and bold, future steps are
muted. Vertical on mobile, horizontal on desktop.

**Derive the current step from real data, never from a stored counter** — a counter drifts
the moment anything is done by hand:

| Condition | Step |
|---|---|
| application exists, status `submitted` / `under_review` | 2 |
| quote exists with status `sent` | 3 |
| quote `accepted`, no proof uploaded | 4 |
| proof uploaded, not yet confirmed | 5 |
| payment confirmed, no dog allocated | 6 |
| dog allocated | 7 |

### c) Proof of payment must be obvious

The single most important action a buyer takes in the portal. It already exists on the
quote page, but a buyer who has just paid does not think "I should open my quote".

- A **prominent card on the portal dashboard** whenever a quote is accepted but no proof
  is uploaded: *"Paid? Upload your proof of payment"* with the button.
- Keep the WhatsApp fallback visible next to it — the number from
  `app_settings.contact_whatsapp`. Some buyers will always prefer that, and a photo on
  WhatsApp beats a payment nobody can match.
- Once uploaded, the card becomes *"Proof received — we will confirm shortly"*.

**Nothing here should imply a payment is confirmed until an admin has confirmed it.**
Uploading a proof is a claim, not a receipt.

---

## Rules

- **RLS is the access control.** Request-scoped `createClient()` everywhere in the portal.
  Never `createAdminClient()` in a portal route.
- Do not `throw` in a portal page — return an empty state and log. A thrown error renders
  a bare 500 to a paying client.
- Loading, empty and populated states on everything. Empty states say what will appear
  and when.
- Plain English for owners. No category keys, no internal status values, no jargon.
- No file over 300 lines.
- Money `numeric`, dates never invented — a go-home or handover date the kennel has not
  set must not be displayed.
- Mirror into the app repo.

## Verify

- [ ] Date of birth and a correctly worded age show on the dog page and dashboard.
- [ ] The birthday job sends one greeting per dog per year — running it twice on the same day sends nothing the second time.
- [ ] A dog with `status = 'deceased'` gets no birthday email.
- [ ] A dog with no owner gets no birthday email.
- [ ] The greeting renders correctly with and without a dog photo.
- [ ] Documents are grouped, with the sire and dam group explained in plain English.
- [ ] An empty sire and dam group shows the explanatory empty state, not a blank panel.
- [ ] A vaccination scan uploaded in admin appears in the owner's portal and downloads.
- [ ] A training request writes a row, emails the kennel, and shows to the owner as requested — not booked.
- [ ] The training library filters by the dog's age; an 8-week puppy and a 9-month dog see different plans.
- [ ] An elite developed dog shows its completed work above its plan.
- [ ] A second client sees none of the first client's documents, requests or dogs.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit

From `diedericksdobermann-web/`, `git add -A`, one commit, after confirming
`git ls-files --others --exclude-standard src/` is empty. Migration goes in
`diedericks-dobermanns/supabase/migrations/` — commit it there and **state that it still
needs applying**. Then `git push origin main`.

Do not touch `src/lib/contracts/`, `src/app/portal/(panel)/contracts/`,
`src/lib/documents/`, or `src/components/documents/` — being worked on in parallel.
