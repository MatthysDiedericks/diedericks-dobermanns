# CURSOR PROMPT — Archive applications, and build a marketing list that is legal to use

Two things. The second has a legal constraint that must shape the build, not be bolted on after.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

# PART 1 — Remove applications from the list, without destroying the record

Matt wants a delete button on `/admin/applications`. **Build it as archive, not delete**, for two
reasons that are not preference.

**It would fail anyway.** `applications` is referenced by `quotes.application_id`,
`waiting_list.application_id` and `reservations.application_id`, all `ON DELETE NO ACTION`. Six of
the seven applications already have a quote, so the delete is rejected by the database and Matt
gets an unexplained error.

**And the application is evidence.** It carries `agreed_to_terms`, `agreed_no_breeding_rights`,
`agreed_right_of_recall`, `agreed_no_resale`, `agreed_welfare_commitment` and
`agreed_microchip_policy`. It is the record that a buyer accepted those terms before a dog was
sold. Destroying it removes the proof at exactly the moment it would matter.

## Build

```sql
alter table public.applications
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id),
  add column if not exists archived_reason text;

create index if not exists applications_active_idx
  on public.applications(created_at desc) where archived_at is null;
```

- **Archive** button on the row and the detail page. Asks for a reason from a short list — duplicate, spam or test, withdrawn by applicant, no longer interested, other (free text). **A reason is required**; "why did this go away" is the question Matt will ask in six months.
- Archived applications disappear from the default list and stay reachable under a **Show archived** filter, with the reason and who did it.
- **Restore** puts it straight back.
- An application with a quote, reservation or waiting-list entry **can** be archived, but the confirm says what stays: *"DD-1138 and her waiting-list entry remain — only the application is filed away."*
- Archiving never touches the quote, the contact or the waiting list.

**No hard delete anywhere in the UI.** If Matt genuinely needs one gone — a spam submission with
someone else's details — that is a database job, done deliberately, not a button.

Add to `trg_audit` if applications are not already covered.

---

# PART 2 — Marketing, done so it can actually be used

Matt's plan: use the email addresses on file, write an ad or post on a marketing page, and send it
to everybody.

**The first and third parts are not currently legal, and the numbers say so plainly.**

## What the data says

```
contacts with marketing_opt_in = true ......... 0
contacts with popia_consent = true ............ 0
active contacts holding an email ............. 85
past buyers (a dog linked to their contact) ... 11
```

Every imported contact was deliberately set to `marketing_opt_in = false`, because consent does not
transfer from DogBreederPro. **"Send it to everybody" today reaches nobody who has agreed to hear
from us.**

## The rule, in short

Under **POPIA section 69**, electronic direct marketing to someone who is **not** an existing
customer requires their **prior consent**. For an **existing customer**, you may market similar
goods and services if you obtained their details in the course of that sale and you give them a
clear chance to object — in the first message and in every one after.

So the list splits in two, and the system must treat them differently:

- **Existing customers** — the 11 with a dog, plus anyone who has paid a deposit. Similar products only. Unsubscribe in every mail.
- **Everyone else** — enquirers, applicants, waiting list, the imported DogBreederPro contacts. **Consent required before the first marketing email.**

**Do not build a "send to all contacts" button.** Build a system that can only send to people who
may lawfully receive it, and make that the easy path.

## Build

### 1. Capture consent everywhere it can honestly be asked

An unticked tickbox with plain wording — *"Send me news about upcoming litters and training"* —
never pre-ticked, never bundled with the terms tickbox:

- the application form,
- the portal profile, editable at any time,
- a newsletter sign-up block on the public site,
- quote acceptance.

Record **when, and from which page**:

```sql
alter table public.contacts
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists marketing_opt_in_source text,
  add column if not exists marketing_opt_out_at timestamptz;
```

**The date and source are the proof.** A consent you cannot evidence is a consent you do not have.

### 2. Audiences, computed not hand-picked

- **Customers** — has a dog or a paid deposit. Lawful for similar products.
- **Subscribers** — `marketing_opt_in = true`. Lawful for anything.
- **No permission** — everyone else. **Cannot be selected.** Show the count so Matt can see the size of the prize, with one line: *"74 contacts have not given permission. Ask for it on the application form and the website sign-up."*

### 3. Campaigns

```sql
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  body_html text not null,
  audience text not null check (audience in ('customers','subscribers','both')),
  status text not null default 'draft' check (status in ('draft','ready','sending','sent','cancelled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  email text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  reason text,
  sent_at timestamptz,
  unique (campaign_id, contact_id)
);
```

Compose in the admin, preview against a real contact, **send a test to Matt first**. Every campaign
email goes through `emailShell` and carries the support footer, plus a working **unsubscribe** link
— one click, no login, sets `marketing_opt_out_at` and clears `marketing_opt_in`.

**Nothing sends automatically.** Matt writes it, previews it, sends a test, then presses Send. That
is the standing rule for this whole system and it applies here most of all.

**Merged contacts and `is_do_not_sell` are excluded**, and an unsubscribe is permanent — a later
import must never resurrect them. Record the skip reason on `campaign_recipients` so Matt can see
*why* someone was left out.

### 4. The marketing page

A simple public page for the ad or post — a litter announcement, a training offer — with a
shareable link. The campaign email links to it rather than carrying the whole thing. That way one
piece of content serves the email, WhatsApp and social, and the email stays small enough to arrive.

---

## Rules

- No hard delete of applications in any UI.
- Archiving requires a reason and never touches quotes, contacts or waiting-list entries.
- **No audience selector can include a contact without a lawful basis.** Enforce it in the query, not the UI.
- Consent is never pre-ticked and never bundled with terms.
- Every marketing email carries an unsubscribe link that works without signing in.
- Nothing sends without Matt pressing Send.
- No file over 300 lines. `requireAdmin()` on every admin action.
- **Apply every migration and confirm the columns exist in the live database before reporting done.**
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] Archiving an application with a quote succeeds, and the quote, contact and waiting-list entry are untouched.
- [ ] The confirm names what will remain.
- [ ] Archived applications leave the default list, appear under Show archived with the reason and the user, and restore cleanly.
- [ ] There is no delete button anywhere for applications.
- [ ] The audience counts read: customers 11, subscribers 0, no permission 74 — and "no permission" cannot be selected.
- [ ] Ticking the consent box on the application form sets `marketing_opt_in`, `marketing_opt_in_at` and `marketing_opt_in_source`.
- [ ] The consent box is never pre-ticked and is separate from the terms tickbox.
- [ ] A campaign to "subscribers" with nobody opted in refuses to send and explains why.
- [ ] Unsubscribe works without signing in, is permanent, and survives a re-import.
- [ ] A merged contact or `is_do_not_sell` contact is skipped with the reason recorded.
- [ ] A test send reaches Matt only.
- [ ] No campaign sends without an explicit press of Send.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

### Build the commit, not the working tree

```powershell
git clone --no-hardlinks . ../_buildcheck
cd ../_buildcheck; git checkout <commit you are about to push>
npm ci; npx next build
cd ..; Remove-Item -Recurse -Force _buildcheck
```

- [ ] The clean checkout builds.
- [ ] After pushing, report Vercel status. **Do not request GitHub or Vercel authentication** — Matt reads the dashboard.

## Commit

**Part 1 and Part 2 as separate commits** — the archive button is small and useful today; the
marketing system is larger and should be reviewable on its own.

**Website:** from `diedericksdobermann-web/`. **App:** repo root is the **parent** folder. Push
both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`.
