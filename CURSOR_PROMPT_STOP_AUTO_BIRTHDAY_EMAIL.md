# CURSOR PROMPT — Retire the automatic birthday email; one source of truth for "may we contact"

**There is a cron job that emails clients automatically every morning at 07:15, and the new
death-reporting flow does not stop it.**

`send-birthday-greetings-daily` (migration 0058) calls `trigger_birthday_greetings_check()`, which
posts to the `send-birthday-greetings` edge function. That function excludes dogs by
`dogs.status <> 'deceased'`. But `trg_owner_health_report_deceased` — added yesterday — sets
**`dogs.ownership_status`**, not `dogs.status`. Verified against the live database: after logging
a death, `ownership_status` became `deceased` and `status` stayed `available`.

**So a client can tell Matt their dog has died, the system correctly cancels every check-in — and
then emails them "Happy birthday!" the following year.**

It has not happened yet only because the function requires `dogs.owner_id`, and none of the 121
historical buyers had accounts. Portal registration shipped yesterday. This is now a live risk.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The decision: retire the automatic email, keep its words

Matt now has a deliberate human-in-the-loop birthday check-in — the system drafts, he reads it and
sends it from WhatsApp. **Two systems doing the same job, one of which cannot be stopped, is how
the wrong message reaches a grieving owner.** Retire the automatic one.

**Do not delete the email copy.** The template in `send-birthday-greetings/index.ts` is good and
was written for exactly this moment. Move its wording into the birthday check-in draft generator
so Matt starts from it rather than a blank box. The judgement about *whether* to send moves to a
human; the words stay.

---

## Migration `0063_retire_auto_birthday_and_unify_contactability.sql`

`0061_contacts_dedupe.sql` exists but is **not applied** — leave it alone, do not renumber it, and
do not fold this into it.

### 1. Stop the cron

```sql
select cron.unschedule('send-birthday-greetings-daily');
drop function if exists public.trigger_birthday_greetings_check();
```

Leave the other three jobs alone — `check-document-expiry-daily`, `notify-pending-applications-daily`
and `purge-audit-log-daily` all notify **Matt**, not clients, and are fine.

### 2. Record death in one place

`dogs.status = 'deceased'` and `dogs.ownership_status = 'deceased'` currently both mean a dead dog,
set by different paths, and neither knows about the other. Puppy 10 of Litter J died as a neonate
and is recorded on `status`; an owner-reported death lands on `ownership_status`.

Do not try to collapse them — `status` carries the sales lifecycle and overwriting `sold` with
`deceased` loses real information. Instead make **`deceased_at` the single fact**, and derive
everything from it:

```sql
-- Back-fill the neonatal deaths already recorded on status.
update public.dogs
   set deceased_at = coalesce(deceased_at, date_of_birth)
 where status = 'deceased' and deceased_at is null;
```

`date_of_birth` is a poor stand-in for a death date, so record that it is an assumption:

```sql
update public.dogs
   set ownership_notes = concat_ws(E'\n', ownership_notes,
       'Death date unknown — back-filled from date of birth on 12 Aug 2026 during data unification.')
 where status = 'deceased' and deceased_at = date_of_birth;
```

Then update `trg_owner_health_report_deceased` to set `deceased_at` and `deceased_cause` as well as
`ownership_status`. **Do not touch `dogs.status`** — a dog that was sold and later died is still a
dog that was sold.

### 3. One predicate that everything must use

```sql
create or replace function public.dog_is_contactable(p_dog_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select not d.do_not_contact
        and d.deceased_at is null
        and d.status <> 'deceased'
        and coalesce(d.ownership_status,'unknown') not in ('deceased','lost_contact','returned')
       from public.dogs d where d.id = p_dog_id),
    false)   -- unknown dog: do not contact
$$;

grant execute on function public.dog_is_contactable(uuid) to authenticated, service_role;
```

**Default false.** If we cannot establish that contacting is appropriate, we do not contact.

**Do NOT revoke EXECUTE from PUBLIC on this function.** Doing that to an RLS-referenced function
caused a 6.7-hour public outage on this project in July. If it ends up referenced by a policy, the
revoke kills the table for that role.

Every code path that decides whether to contact a client about a dog must call this — the check-in
generator, any future notification, and any list of "who to contact". One predicate, one place to
fix it next time.

### 4. Fix the mating status

`trg_matings_sync_heat_cycle` syncs `mating_date` and `sire_id` correctly (verified: first mating
sets the date, a second keeps the first, deleting the first promotes the second). But moving the
cycle from `in_heat` to `mated` was implemented in the UI action, so a mating recorded by script or
SQL leaves the status stale.

Move it into the trigger: on insert, if the cycle is `in_heat`, set it to `mated`. On delete of the
last remaining mating, return it to `in_heat`. **Leave any status past `mated`** —
`confirmed_pregnant` and `whelped` must not be walked backwards by an edit to a mating record.

Remove the now-duplicated logic from the UI action rather than leaving both.

---

## Edge function

`diedericks-dobermanns/supabase/functions/send-birthday-greetings/index.ts`

Do not delete the file — it is the record of what the email said and may be wanted again. Make it
**refuse to run**: return `410 Gone` with
`{"error":"Retired 12 Aug 2026. Birthday contact is now a human-reviewed check-in — see /admin/follow-ups."}`
before any query, and put the same note in a comment at the top with the reason.

A dead endpoint that explains itself is worth far more than a deleted file when someone finds the
cron entry in six months.

Redeploy it so the live function actually refuses. **A retired function that is still deployed in
its old form is not retired.**

---

## Reuse the copy in the check-in draft

In the birthday draft generator (website and app — it must be one shared module, not two):

- Use the greeting and tone from the retired email template, shortened for WhatsApp.
- Include the dog's call name, the age it is turning, and its litter.
- **No sales line, no "we have puppies available".** Every imported contact has
  `marketing_opt_in = false`; welfare contact and marketing stay on separate rails.

## The generator must use the predicate

Wherever `check_ins` rows are created, filter with `dog_is_contactable(dog_id)` rather than an
inline list of statuses. If the generator already has its own condition, replace it — an inline
copy is the thing that drifted and caused this.

---

## Website and app

Small, but do both.

1. **Admin settings** — wherever the birthday email was described as automatic, change the wording to say birthday contact is now a reviewed check-in, linking to `/admin/follow-ups`. Leaving stale copy claiming an automatic email is worse than no copy.
2. **Dog detail, both repos** — where a dog is not contactable, say why in plain words: *"No check-ins — this dog is recorded as deceased (1 Aug 2026)"* or *"…marked do not contact"*. Silence looks like a bug and someone will "fix" it.
3. **Litter J's Puppy 10** is `status = 'deceased'` and should show as not contactable after this migration. Use it as the visual test.

---

## Rules

- No automated outbound message to a client anywhere in this codebase after this change. If you find another, stop and report it rather than patching around it.
- `dog_is_contactable()` is the only contactability test. No inline status lists.
- Never overwrite `dogs.status` with `deceased` for an owner-reported death.
- Never revoke EXECUTE from PUBLIC on a function that a policy might reference.
- No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] `select * from cron.job` no longer lists `send-birthday-greetings-daily`, and still lists the other three.
- [ ] `trigger_birthday_greetings_check()` no longer exists.
- [ ] Calling the deployed `send-birthday-greetings` function returns 410 and sends nothing.
- [ ] Logging a death via `owner_health_reports` sets `deceased_at`, sets `ownership_status = 'deceased'`, leaves `dogs.status` unchanged, and cancels future check-ins.
- [ ] `dog_is_contactable()` returns false for: a dog with `deceased_at`, `status = 'deceased'` (Litter J Puppy 10), `do_not_contact = true`, `ownership_status` of `lost_contact` or `returned`, and a random UUID that is not a dog.
- [ ] It returns true for a normal living dog with an owner.
- [ ] Running the check-in generator produces no row for any dog where `dog_is_contactable()` is false.
- [ ] Recording a mating **via SQL** (not the UI) moves the cycle from `in_heat` to `mated`.
- [ ] Deleting the only mating returns it to `in_heat`; a cycle already at `confirmed_pregnant` is not walked back.
- [ ] Grep both repos for `resend`, `sendEmail`, `nodemailer`, `net.http_post` — every remaining sender targets Matt, not a client. List what you found in the summary.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds** — build, not just types.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double.

## Commit

Two repos, two commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`, or
`supabase/migrations/0061_contacts_dedupe.sql`.
