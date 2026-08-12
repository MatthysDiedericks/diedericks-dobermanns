# CURSOR PROMPT — Owner records and welfare check-ins

**121 dogs have been sold and not one has an owner attached.** No `owner_id`, no name, no phone.
Seven years of placements and the system cannot tell you who has which dog — which means the
recall clause in the sale agreement is unenforceable in practice, health outcomes on our own
lines are invisible, and every past buyer is a stranger.

This builds the owner records, then a check-in system that keeps Matt in touch **without turning
into a mailing list**.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The rule that governs this whole feature

**Nothing sends itself.** The system builds a weekly list of who is due, drafts the message, and
Matt reads it, edits it and sends it himself from WhatsApp. There is no cron that messages
clients, no bulk send button, no "message all".

That is a deliberate decision, not a limitation to be helpfully removed. Some of these dogs are
dead — puppies sold in 2019 are seven years old, and Dobermanns do not reliably reach ten. An
automated *"Happy birthday to Rex!"* to someone who buried their dog in March is a wound, and
across 121 dogs it will happen. A human reading the name before hitting send is the only reliable
guard, and it is also what makes the message worth receiving.

---

## What already exists

`contacts` (full_name, email, phone, whatsapp_number, address, city, country, contact_type,
source, source_ref, marketing_opt_in, popia_consent, notes, tags) — the DogBreederPro import
adds ~238 rows via `scripts/import-dbp-contacts.mjs`. **Do not modify that script.**

`dogs` (owner_id → auth user, reserved_for_name, new_owner_name, status, date_of_birth,
litter_id), `client_dog_notes`, `health_tests` (empty), `testimonials` (empty, has
`is_approved`/`is_featured`), `notifications_log`, `dog_media` (has `client_consent`),
`litters`, `weight_logs`, `audit_log`.

---

## Migration `0062_owner_follow_up.sql`

### 1. Link a dog to the person who owns it

`dogs.owner_id` points at `auth.users` and is null on all 121 sold dogs, because almost none of
those buyers ever created an account and most never will. A historical owner is a **contact**,
not a user.

```sql
alter table public.dogs
  add column if not exists owner_contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists placement_date date,
  add column if not exists ownership_status text not null default 'unknown'
    check (ownership_status in ('unknown','with_owner','rehomed','returned','deceased','lost_contact')),
  add column if not exists ownership_status_at date,
  add column if not exists ownership_notes text,
  add column if not exists do_not_contact boolean not null default false;

create index dogs_owner_contact_id_idx on public.dogs(owner_contact_id) where owner_contact_id is not null;
```

`owner_id` stays and keeps working — when a historical buyer eventually registers,
`claim_my_records()` fills it. **Both can be set; they are not alternatives.** Comment that.

`do_not_contact` is per dog, not per person: someone may want to hear about the dog they still
have and never again about the one that died.

### 2. Check-ins

```sql
create table public.check_ins (
  id           uuid primary key default gen_random_uuid(),
  dog_id       uuid not null references public.dogs(id) on delete cascade,
  contact_id   uuid references public.contacts(id) on delete set null,
  kind         text not null check (kind in ('post_placement','birthday','health_milestone','manual')),
  due_date     date not null,
  status       text not null default 'due'
                 check (status in ('due','sent','answered','skipped','no_response')),
  channel      text check (channel in ('whatsapp','email','phone','in_person')),
  draft_message text,
  sent_at      timestamptz,
  response_at  timestamptz,
  response_notes text,
  handled_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index check_ins_due_idx on public.check_ins(status, due_date);
create unique index check_ins_no_duplicates
  on public.check_ins(dog_id, kind, due_date) where status = 'due';
```

The unique index matters: the generator will run repeatedly and must never stack up five copies
of the same birthday.

### 3. Health reports from owners

Distinct from `health_tests`, which holds our own certified results. This is what an owner tells
us — less rigorous, far more numerous, and over seven years the only real picture of how our
lines age.

```sql
create table public.owner_health_reports (
  id            uuid primary key default gen_random_uuid(),
  dog_id        uuid not null references public.dogs(id) on delete cascade,
  check_in_id   uuid references public.check_ins(id) on delete set null,
  reported_at   date not null default current_date,
  overall       text check (overall is null or overall in ('excellent','good','fair','poor','deceased')),
  weight_kg     numeric(5,2) check (weight_kg is null or (weight_kg > 0 and weight_kg < 100)),
  dcm_screened  boolean,
  dcm_result    text,
  hips_elbows   text,
  conditions    text[],           -- free tags: bloat, wobbler, vwd, hypothyroid, cancer…
  died_at       date,
  age_at_death_months integer,
  cause_of_death text,
  vet_practice  text,
  notes         text,
  recorded_by   uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index owner_health_reports_dog_idx on public.owner_health_reports(dog_id, reported_at);
```

**A report with `overall = 'deceased'` or a `died_at` must set the dog's `ownership_status` to
`deceased` and cancel every future check-in for that dog.** Do this in a trigger, not in the UI —
if it depends on someone remembering to tick a second box, the birthday message goes out next
year and that is the exact failure this feature exists to prevent.

### 4. Testimonials — consent, not assumption

`testimonials` has no consent field and no link to the dog or contact.

```sql
alter public.testimonials
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists dog_id uuid references public.dogs(id) on delete set null,
  add column if not exists check_in_id uuid references public.check_ins(id) on delete set null,
  add column if not exists consent_given boolean not null default false,
  add column if not exists consent_given_at timestamptz,
  add column if not exists consent_evidence text;
```

**`is_approved` means Matt likes it. `consent_given` means the client agreed to it being
published. Publishing requires both.** They are not the same check and must never be collapsed
into one — a nice message in a WhatsApp reply is not permission to put someone's name and face on
a website. `consent_evidence` records how it was given ("WhatsApp 12 Aug 2026").

### 5. RLS

All three tables: `is_trainer_or_above()` reads, `is_admin()` writes, **clients read nothing**.
An owner has no business seeing another owner's health reports or the notes Matt keeps about
conversations. Verify with a real client JWT.

Add all three plus `dogs` to the `trg_audit` list.

---

## Back-fill the owners — the part that unlocks everything

DogBreederPro records the buyer **in the puppy's name**: `Puppy 1 (Pink) Josef Kotse`,
`Puppy 3 (Gold) Jannecke Smit`. That mapping already exists for the historical litters and is the
only surviving record of who bought what.

Write `scripts/link-dog-owners.mjs` (new file, do not touch `import-dbp-contacts.mjs`):

1. For each dog with `status = 'sold'` and no `owner_contact_id`, take the candidate name from `new_owner_name`, `reserved_for_name`, or a trailing name in the dog's own name after the collar bracket.
2. Match against `contacts` — exact full name first, then normalised (case, punctuation, extra spaces), then surname + first initial.
3. **Write only exact and normalised matches.** Everything weaker goes to a review file, never straight into the database. Attaching the wrong owner to a dog means sending a stranger someone's health history, and it is very hard to notice once written.
4. `--dry-run` first, printing counts and the full ambiguous list.
5. Set `ownership_status = 'unknown'` on every linked dog. **We know who bought it; we do not know whether they still have it.** Only a reply changes that.
6. Wrap writes in `pause_audit('linking historical dog owners')` / `resume_audit()`.

Report at the end: linked, ambiguous, no candidate name, no matching contact.

---

## Generating check-ins

A nightly job creates rows in `check_ins` with `status = 'due'`. **It never sends anything.**

Skip any dog where `do_not_contact`, or `ownership_status` is `deceased` / `lost_contact` /
`returned`, or there is no contact with a phone or email, or an unanswered check-in of the same
kind was sent in the last 60 days. **Chasing someone who did not reply is how goodwill turns into
irritation.**

- **post_placement** — 7 days, 1 month, 6 months after `placement_date`.
- **birthday** — annually on `date_of_birth`.
- **health_milestone** — at 2 years, then annually. Two years is when DCM screening starts to matter for a Dobermann, and that is the honest reason for the contact.

Drafts are generated per kind and per dog, using the dog's name, age, litter and last known
status. Keep them short and personal — *"Hi Josef, Nala turns 3 on Saturday. How is she doing?"*
beats anything longer. Matt edits before sending; the draft is a starting point, not a template
to be sent verbatim.

**Never put a sales line in a welfare check-in.** The moment "we have puppies available" appears,
it becomes direct marketing, and every imported contact has `marketing_opt_in = false` because
consent does not transfer from a legacy system. Keep welfare and marketing on separate rails.

---

## Website — `/admin/follow-ups`

**This week** — grouped by kind, newest due first. Each card:

> **Nala** · Cyrus × Hunter-King, Jun 2024 · turns 2 on 14 Aug
> **Josef Kotse** · +27 82 … · last spoken to 3 Feb 2026
> [draft message, editable] · **Send on WhatsApp** · Log response · Skip

- **Send on WhatsApp** opens `https://wa.me/<number>?text=<encoded draft>` in a new tab and marks the row `sent`. It does not send anything itself — Matt still presses send in WhatsApp. Say so on the button's tooltip so nobody assumes otherwise.
- **Log response** opens the capture form below.
- **Skip** asks why, and offers "don't contact about this dog again" as one of the reasons.
- Show a clear warning strip on any dog whose ownership status is not `with_owner`.

**Log response** captures, in one form: how the dog is, weight, DCM screening, hips/elbows,
conditions, vet, free notes — and, if the news is bad, died date, age and cause. Selecting
deceased must visibly say what will happen: *"This will close all future check-ins for Nala."*

Also on that form: **"They said something nice — save as testimonial"**, which requires ticking
**"They agreed we can publish this"** separately before it can be saved with consent. If consent
is not given, it saves as an internal note instead. Do not let one tick do both jobs.

**Owner tab on the dog page** — owner, contact details, placement date, ownership status, full
check-in history, health reports. On the contact page, the reverse: every dog this person has had.

**Health of our lines** — a read-only report: average lifespan by sire and by dam, DCM screening
rate, reported conditions by line, and response rate. Small numbers early on, so **show the
sample size next to every figure**. "Average lifespan 9.2 years" from four dogs is not a finding,
and presented without `n = 4` it will be treated as one.

---

## App — `diedericks-dobermanns`

Matt does this from his phone, standing in a kennel. The app is where it will actually get used.

1. `app/(admin)/follow-ups.tsx` — the same due list, card per check-in, pull-to-refresh, filter by kind.
2. **One tap to WhatsApp** using `Linking.openURL('whatsapp://send?phone=…&text=…')`, falling back to `wa.me`. This is the single most important interaction in the feature — it must be one tap from the card, not two screens deep.
3. Log-response sheet following the existing bottom-sheet pattern, with the same separate consent tick.
4. Owner section on the dog detail screen.
5. Badge on the admin dashboard: *"4 check-ins due this week"*.
6. Hooks `useFollowUps.ts`, `useOwnerHealthReports.ts` following `useHeatCycles` (loading/error/refresh).

**No push notification that fires at a client.** A reminder to *Matt* is fine.

---

## Rules

- `requireAdmin()` on every website page and server action; the app admin area is gated already.
- Never `createAdminClient()` outside admin routes.
- No automated outbound message to a client, anywhere in this feature.
- `marketing_opt_in` is never set by this feature. Welfare contact and marketing consent are separate.
- Phone numbers normalised to E.164 for `wa.me`; store what the client gave us unchanged.
- No file over 300 lines.
- Loading, empty and error states everywhere. The empty state is *"Nothing due this week"*, and that is a good outcome, not a failure.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] `link-dog-owners.mjs --dry-run` reports counts and writes nothing.
- [ ] After the real run, no dog has an owner that came from a weak/fuzzy match — spot-check ten by hand against the DogBreederPro litter pages.
- [ ] Logging a death sets `ownership_status = 'deceased'` and cancels that dog's future check-ins automatically. Re-run the generator and confirm none reappear.
- [ ] A dog marked `do_not_contact` never generates a check-in.
- [ ] The generator run twice on the same day creates no duplicates.
- [ ] "Send on WhatsApp" opens WhatsApp with the message pre-filled and sends nothing on its own.
- [ ] A testimonial cannot be published with `is_approved` alone — consent is a separate tick.
- [ ] Every figure in the health report shows its sample size.
- [ ] A client JWT reads zero rows from `check_ins`, `owner_health_reports` and other owners' dogs.
- [ ] No cron, edge function or trigger anywhere in this feature sends an email or message to a client.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds** — build, not just types.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double.

## Commit

Two repos, two commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, or `scripts/import-dbp-contacts.mjs`.
