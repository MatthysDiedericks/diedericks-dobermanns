# CURSOR PROMPT — Let an approved applicant change her details without losing her approval

A client applied, Matt approved her, and now she wants to change things. Today there is no way to do
that. The only options are to edit the record underneath her — destroying what Matt actually assessed
— or cancel and make her reapply, which resets her approval date and breaks every quote, waiting-list
entry and reservation pointing at that application.

**Neither is acceptable. Not every change is the same kind of change.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live

| Fact | Value |
|---|---|
| `applications` rows | **18** — 13 `approved`, 5 `submitted` |
| Statuses in use | `submitted`, `approved` only |
| History of edits | **none** — no versions table, no diff, nothing. An edit today silently destroys what Matt approved |
| Existing columns | `status`, `admin_notes`, `reviewed_by`, `reviewed_at`, `archived_at`, `archived_by`, `archived_reason` |

`reviewed_by` / `reviewed_at` already record who approved and when. **Protect those** — they are the
only evidence the decision was made.

---

## 1 · Three tiers, not two

The whole design is deciding which bucket a field sits in. Put this in one place —
`src/lib/applications/fieldTiers.ts` — and have the portal, the admin screens and the app all read
it. **One list. Never a second copy.**

### Freely editable — no re-approval, no flag

`phone` · `email` · `address` · `city` · `province` · `country` · `occupation` · `employer` ·
`instagram_handle` · `facebook_profile` · `vet_name` · `vet_phone` ·
`personal_reference_name` · `personal_reference_phone` · `special_requests`

None of these change whether she is a suitable home. She fixes them herself in the portal and Matt is
not interrupted. **A wrong phone number nobody can correct is worse than one she fixes at 9pm.**

### Editable, but it re-opens the decision

`dog_interest` · `specific_dog_id` · `litter_interest_id` · `preferred_sex` · `preferred_colour` ·
`tail_preference` · `preferred_timeline` · `budget_range` · `purpose` ·
`security_requirements` · `training_planned`

She can change these. Saving sets the status to **`changes_pending`** and it appears on Matt's
dashboard. **Do not block her and do not email him automatically** — it shows up in his queue like
anything else.

Critically: **she keeps her original `reviewed_at`.** Re-approving restores `approved` without
resetting her place in the queue. Losing her position over a change of colour preference is the
outcome this prompt exists to prevent.

### Locked — a change here is a different application

`home_type` · `has_secure_yard` · `yard_size` · `children_ages` · `hours_alone_per_day` ·
`current_pets` · `sleeping_arrangement` · `exercise_level` · `previous_dog_fate` ·
`experience_with_dobermanns` · `dobermann_experience_level` · `id_number` · `id_type` ·
`date_of_birth` · every `agreed_*` and `aware_*` field

These are what Matt approved on. If she has moved to a flat with no yard, that is not an edit.

Locked fields are **visible but not editable**, with one line: *"To change this, speak to Matt — it
affects the assessment."* and a WhatsApp button. **Never a greyed-out box with no explanation.**

## 2 · Version, never overwrite

New table `application_versions`: `application_id`, `version_number`, `snapshot jsonb`,
`changed_by`, `changed_at`, `change_reason`, `tier_touched`.

- Snapshot the **current** state as version 1 for all 18 existing applications in the migration, so nothing starts with a blank history.
- Every save writes a new version. **The `applications` row stays the live view; the versions table is the record.**
- Approving stamps *which version* was approved. When Matt re-approves after a change, he is approving version 3, not "the application".
- This is the part that matters if a placement is ever disputed. `applications` has no history at all today.

## 3 · Show Matt the change, not the form

On the dashboard and the application detail, a `changes_pending` item shows **only what moved**:

```
Preferred sex      female → male
Preferred colour   black & tan → blue
Changed 26 Aug by the applicant
```

- Two buttons: **Re-approve** and **Discuss** (opens WhatsApp).
- Re-approve restores `approved`, keeps the original `reviewed_at`, stamps the new version, writes `audit_log`.
- Never make him re-read a 60-field form to find one changed line.

## 4 · What she sees

- On her approved application in the portal: **Update my details**.
- Free fields are ordinary inputs. Middle-tier fields carry a quiet note: *"Changing this means Matt will take another look — your application stays approved in the meantime."*
- After saving a middle-tier change: *"Sent to Matt. Nothing else changes while he looks."* **Not** "pending review", which reads like she has been demoted.
- She can see her own change history. It is her data.

## 5 · Do not break what points at the application

`quotes.application_id`, waiting-list entries and reservations reference this row. Editing must not
orphan any of them, and **the application id must never change.** That is the concrete reason
cancel-and-reapply is wrong, not just unkind.

`archived_at` / `archived_by` / `archived_reason` already exist for genuine withdrawal. Use those —
**do not add a `cancelled` status** and do not delete applications.

---

## The app

- Same **Update my details** on the app's application screen, same three tiers from the shared list.
- Same diff view on the admin side — Matt clears his queue on his phone.
- Locked fields show the same explanation and WhatsApp button.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- One shared field-tier list. No second copy in the app.
- Never overwrite without writing a version.
- `reviewed_at` survives re-approval. Approval date is never reset by an edit.
- The application id never changes.
- No `cancelled` status; withdrawal uses the existing `archived_*` columns.
- Locked fields are explained, never silently disabled.
- Nothing auto-emails Matt or the client. Standing rule.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

- [ ] Migration applied; all **18** existing applications have a version 1 snapshot. Paste the count.
- [ ] An approved applicant changes her **phone** in the portal. Status stays `approved`, nothing appears in Matt's queue, a version is written. Paste the row and the version.
- [ ] She changes **preferred sex**. Status becomes `changes_pending`, it appears on the dashboard, and **`reviewed_at` is unchanged**. Paste before and after.
- [ ] Re-approving restores `approved`, keeps the original `reviewed_at`, stamps the approved version, writes `audit_log`. Paste all four.
- [ ] The diff shows **only** the changed fields, old → new. Screenshot.
- [ ] A **locked** field cannot be saved even by a crafted request — **test the server action directly, not the UI**. Paste the rejection.
- [ ] Locked fields render with the explanation and a working WhatsApp button.
- [ ] An application with a quote attached survives an edit — `quotes.application_id` still resolves. Paste before and after.
- [ ] A client cannot edit **another** client's application. Test with a real JWT.
- [ ] A client cannot change her own `status` or `reviewed_at`. Test the action directly.
- [ ] Version history renders for the client and for Matt.
- [ ] No `cancelled` status exists anywhere. Confirm.
- [ ] App: same editing, same tiers, same diff view. Say which device.
- [ ] Website: `npm run preflight` passes — committed-tree import check, `tsc`, and `next build`.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the field-tier list, the versions table and migration, the
`changes_pending` status and re-approval, the portal editing screen, the admin diff view, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
