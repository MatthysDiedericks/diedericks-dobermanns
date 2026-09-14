# CURSOR PROMPT — Buyer location on the application form

**Repo:** `diedericksdobermann-web` + mirror into `diedericks-dobermanns` (standing parity rule).
**Supabase:** `nlmwxodvquwbjinhhbmr`. Use the next free migration number — check the highest in
`supabase/migrations/` first (0165 is applied; 0166 may be taken by the alert flood-guard prompt).

Keep this small. One question on the form, one note, one checkbox. Nothing else.

---

## What exists

`applications` already has `country`, `province`, `city`, `address` and `id_type`
(`sa_id | passport | other_national_id`, defaulted from country by `IdFields.tsx`). The form is a
6-step wizard in `src/components/forms/ApplicationForm/` with a Zod schema in `schema.ts`, and
already uses acknowledgement checkboxes — `delivery_acknowledged` in `Step4Preferences.tsx` is the
pattern to copy. 22 applications are live, 3 already non-SA (Namibia, Malawi, Zimbabwe).

## 1. The question

Migration — three columns on `applications`:

- `buyer_location_type text` — `'sa' | 'sadc' | 'international'`
- `export_terms_acknowledged boolean not null default false`
- `export_terms_acknowledged_at timestamptz`

Backfill `buyer_location_type` from `country`: South Africa → `sa`; Angola, Botswana, Comoros,
DR Congo, Eswatini, Lesotho, Madagascar, Malawi, Mauritius, Mozambique, Namibia, Seychelles,
Tanzania, Zambia, Zimbabwe → `sadc`; anything else → `international`.

At the **top of `Step1Personal.tsx`**, before name and contact details, one required radio group
headed **"Where are you buying from?"** with exactly three options:

- **South Africa**
- **A SADC country** — Eswatini, Namibia, Botswana, Mozambique, Zimbabwe and neighbours
- **International** — anywhere else in the world

Store the answer in `buyer_location_type`. Leave the existing country field exactly as it is.

## 2. The note

When the applicant picks **SADC** or **International**, show a short note directly below the radio
group. Same wording for both — do not write two versions:

> **Buying from outside South Africa**
>
> Your dog is handed over to you or your agent in South Africa. Getting it home is arranged and
> paid for by you, and those costs are not included in the quoted price. Depending on your country
> they can include administration, an export agent, flights, health tests, veterinary inspections
> and transport.
>
> We will put you in touch with an export agent who will confirm exactly what your country requires
> and what it will cost.

Then one required checkbox, `export_terms_acknowledged`:

> I understand that export costs are not included in the quoted price.

Hardcode this copy in the component. No settings table, no admin editor.

Zod: make the checkbox required **only** when `buyer_location_type` is not `'sa'`, using a
schema-level `superRefine`. A blanket required boolean silently blocks every South African
applicant.

In `src/app/api/apply/route.ts`, set `export_terms_acknowledged_at = now()` when it is true.

## 3. So Matt can see it

- `/admin/applications`: a small badge on each row — `SADC` or `International`, nothing on SA rows
  — and a filter for it.
- Application detail page: show the buyer location and the acknowledgement with its timestamp.

---

## Critical warnings

- Do not add the checkbox to the shared required schema — conditional validation only, and submit
  a South African application end to end before calling this done.
- Do not change the step count or progress indicator. This all lives inside step 1.
- Do not add a new step, a settings page, or any new table beyond the three columns above.
- Existing rows are backfilled; never treat a null `buyer_location_type` as `sa` in code.

## Verify — in a browser, as a real applicant

- [ ] The three options are the first thing on the form and one must be chosen.
- [ ] Choosing South Africa shows no note, no checkbox, and the form submits as it does today.
- [ ] Choosing SADC or International shows the note, and the form will not submit until the
      checkbox is ticked.
- [ ] After submitting, `buyer_location_type`, `export_terms_acknowledged` and
      `export_terms_acknowledged_at` are all set correctly.
- [ ] The three existing non-SA applications are badged correctly on `/admin/applications`.
- [ ] `npx tsc --noEmit` exits 0; `npx next build` succeeds.

## Commit and push

Commit **both** repos and push both. Confirm `git rev-list --left-right --count origin/main...HEAD`
reads `0 0` in each.
