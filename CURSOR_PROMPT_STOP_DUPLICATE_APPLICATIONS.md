# Cursor Prompt — Stop duplicate applications, permanently

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericksdobermann-web` (the public form lives here) and `diedericks-dobermanns` (app admin list).
3. Migration number: `0173` and `0174` are taken, so this is **0175**. Byte-identical in both folders.
4. Do not apply the migration. Matt applies it.
5. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## What happened — this is not hypothetical

On 10 September 2026 Mamoloko Mangokoane submitted the **same application five times** in 37 minutes. Two of them were seven seconds apart.

She was not confused. **The site told her it had failed when it had already saved.**

`src/app/api/apply/route.ts`, lines 292–299. When the application row inserts fine but the document upload afterwards fails, the route returns:

```ts
return NextResponse.json(
  { error: applyCouldNot(`your application was received (${referenceId}) but a file could not be attached`) },
  { status: 400 },
);
```

`applyCouldNot()` prefixes that with **"We could not submit your application because…"**, so what she read was:

> *We could not submit your application because your application was received (DD-1BE9A104) but a file could not be attached.*

A sentence that contradicts itself, delivered as a red error, on HTTP **400**. Of course she pressed submit again. And again.

The four duplicates have been removed and her surviving record is **DD-1BE9A104**, with her final corrections merged in. **Do not go looking for them.**

---

## The rule this prompt exists to enforce

> **If the application row is in the database, the applicant sees success.** Anything that failed afterwards is a warning on a success screen, never an error, and never a non-2xx status.

Three separate defences, because one is not enough. Build all three.

---

## Defence 1 — Never report failure after a successful insert

In `route.ts`, replace the file-store failure branch. Once `applications.insert` has succeeded, **every** remaining path returns HTTP **200**:

```ts
return NextResponse.json({
  ok: true,
  referenceId,
  warning: "We could not attach your file. Your application is safe — we will ask for the document by email.",
});
```

Keep logging `APPLY_UPLOAD_FAILED` to `error_events` exactly as it does now. The applicant's experience and Matt's diagnostics are different jobs.

The same rule applies to `save_application_dog_requests` at line 272 — it already only `console.error`s, which is right in spirit but invisible. Log it to `error_events` as a warning and carry on.

**Front end:** the success screen must render the reference code prominently, and show `warning` as an amber note beneath it if present. Never as red text. Never as a retry prompt. Audit every `catch` in the submit handler for the same mistake — an error thrown *after* a 200 must not flip the screen to failure.

## Defence 2 — Make retries idempotent

Even with Defence 1, a slow network or an impatient double-click will re-post. The server must recognise the same submission and return the same reference instead of creating a second row.

### Migration 0175

```sql
-- 0175_application_submission_id.sql
-- A client-generated id per filled-in form. Re-posting the same form returns
-- the original reference instead of creating a duplicate. Five duplicate
-- applications were created by one applicant on 10 Sep 2026 because the site
-- reported failure after a successful insert.

alter table public.applications
  add column if not exists submission_id uuid;

create unique index if not exists applications_submission_id_key
  on public.applications (submission_id)
  where submission_id is not null;

notify pgrst, 'reload schema';
```

Partial unique index on purpose — the 24 existing applications have no `submission_id` and must stay valid.

### Wiring

- The form generates a `submission_id` with `crypto.randomUUID()` **once, when the form mounts**, and keeps it in state for the life of that form. Do not regenerate it on retry — regenerating defeats the whole mechanism.
- The route includes it in the insert.
- On a `23505` unique violation, **do not treat it as an error**. Look up the existing row by `submission_id` and return its `referenceId` with `ok: true`. The applicant sees the same success screen they saw the first time.
- Add `submission_id` to the Zod schema as an optional UUID, so an older cached page without it still works.

## Defence 3 — Catch the human retry

`submission_id` catches a re-post of the *same* page. It does not catch someone reloading and typing it all again, which is what she did at 09:19.

Before inserting, check for an application with the **same email** and the **same `id_number`** created in the **last 6 hours** that is not archived. If one exists:

- Do not insert.
- Return `ok: true` with the **existing** reference code and a warning: `"We already have your application (DD-XXXXXXXX) from earlier today. There is no need to send it again — we will be in touch."`
- Log an `APPLY_DUPLICATE_SUPPRESSED` event to `error_events` at severity `info` (or `warning` if there is no info level) with both the existing reference and the email.

Match on `id_number` **as well as** email, so two genuine family members sharing one email address are not blocked. Compare normalised values — `normalizeIdNumber` already exists in `lib/identity/idNumber.ts`.

Six hours is deliberate. Long enough to cover a frustrated afternoon, short enough that a genuine second application next week goes through.

## Defence 4 — The button

Disable the submit button from the moment it is pressed until the response returns, with a visible "Sending…" state. Two of her five submissions were **seven seconds apart** — that is a double-click on a slow connection, and no server-side rule should have had to catch it.

---

## Defence 5 — A deleted application must not become a broken link

**This already happened.** On 10 Sep the four duplicates were removed from the database. The alert emails that had already gone out to Matt and Felicia still carried `View application →` links pointing at those records. Felicia clicked one and hit a bare 404, which looked exactly like her admin access being broken. It was not — the record was simply gone.

`src/app/admin/(panel)/applications/[id]/page.tsx` line 73 is the whole problem:

```ts
if (!app) notFound();
```

Alert emails live in people's inboxes for months. Any record they point at must fail in a way that explains itself.

### 5a. Migration 0177 — stop hard-deleting applications

`0176` is taken, so this is **0177**. Byte-identical in both repos.

```sql
-- 0177_application_merged_into.sql
-- Deduplicating by DELETE breaks every alert email already sent. Keep a
-- tombstone instead: the loser stays, archived, pointing at the survivor,
-- so an old link redirects rather than 404s.

alter table public.applications
  add column if not exists merged_into_application_id uuid
    references public.applications(id) on delete set null;

create index if not exists applications_merged_into_idx
  on public.applications (merged_into_application_id)
  where merged_into_application_id is not null;

notify pgrst, 'reload schema';
```

Nullable, additive, and it does **not** resurrect the four already deleted — nothing to restore them from beyond the backup file, and that is fine.

### 5b. The detail page handles all three cases

Replace the bare `notFound()` with:

- **Merged** — the row exists and `merged_into_application_id` is set → **redirect** to the surviving application, and show a note at the top of that page: *"You followed a link to an earlier duplicate of this application. This is the record we kept."*
- **Archived** — already handled; leave it as it is.
- **Genuinely missing** — the id is not in the table at all (the four from today) → render a proper page, not a 404:

  > **This application is no longer available.**
  > It may have been merged with another application from the same person, or removed. If you followed a link from an email, that email may be out of date.
  > [Back to applications]

  Add a search box on that page prefilled with nothing, so Felicia can type the applicant's name and find the surviving record in one step.

**Do not use `notFound()` for either case.** A 404 in an admin area reads as "you are not allowed", which is precisely the wrong message and precisely what happened today.

### 5c. Give Matt a merge button, so this never needs SQL again

On the applications list, where the "Possible duplicate" badge appears, add **Merge duplicates**:

1. Show the matching applications side by side with their differences highlighted.
2. Matt picks which one to keep.
3. The others are **archived**, not deleted — `archived_reason = 'merged'`, `merged_into_application_id` set to the survivor.
4. Log an `application_events` row on the survivor recording which references were merged in and by whom.

Merging must never delete a row. That is the rule this whole section exists to enforce.

**One judgement call to surface, not to automate:** if the duplicates disagree on `marketing_opt_in`, the merge screen must show it and default to the **most recent** answer. Consent is not a field to guess at — on 10 Sep the applicant ticked yes four times and no on her final attempt, and the no is what counts.

---

## Also: the fix that is still not deployed

`src/lib/applications/storeFiles.ts` line 113 already writes the correct category key. **That fix has never been deployed.** Four real applicants lost their ID upload this morning — 08:42, 08:42, 08:57 and 09:10 — all with `documents_category_check`.

Confirm it is in `origin/main` and served by the live deployment. If it is not, **say so at the top of your report.** On this project a fix sitting on disk has been mistaken for a fix in production before.

---

## Give Matt a way to see it happening

In the admin applications list, both platforms: when two or more non-archived applications share an email address, show a **"Possible duplicate"** badge on each and group them together. Matt found this one by eye, in a screenshot. That should not be the detection mechanism.

Do not build an automatic merge tool. Flagging is enough; merging is a judgement call.

---

## Do not

- Do not delete, archive or edit any application. The cleanup is done.
- Do not add a unique constraint on `email` — repeat customers are real and welcome.
- Do not change `application_dog_requests` or `save_application_dog_requests`.
- Do not touch the microchip or price locks on `dogs`.
- Do not create test applications in production. If you must test end to end, use an obviously disposable name and email, tell Matt exactly what you used, and delete it in the same session.

---

## Report — real output, not descriptions

1. **Is the `storeFiles.ts` category fix live?** Yes or no, with the commit and how you checked. Answer this first.
2. The new file-failure branch — paste it, showing status 200.
3. `0175` in both migration folders, byte-identical. Show the diff.
4. Proof `submission_id` is generated once per form mount, not per submit — paste the hook or state line.
5. The `23505` handler returning the existing reference — paste it.
6. The 6-hour duplicate check, including the `id_number` match — paste it.
7. Screenshot of the success screen with a warning showing: reference code prominent, amber note, no red, no retry button.
8. Screenshot of the admin list showing a "Possible duplicate" badge.
9. `npx tsc --noEmit` clean in both repos.

**Then prove Defence 2 without touching production.** Submit the same form twice from the same page load against a preview or local environment and show that **one** row exists and both responses carried the **same** reference code. Paste both responses.
