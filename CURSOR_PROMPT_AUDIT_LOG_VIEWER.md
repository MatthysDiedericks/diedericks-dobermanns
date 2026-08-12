# CURSOR PROMPT — Audit log viewer (website + app)

Every change to the business data is now recorded. This builds the screens to read it.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns`.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The capture is already built and live — do not touch it

Applied 11 Aug 2026 and tested against real writes.

```
audit_log(id, table_name, record_id, action, actor_id, actor_email, actor_role,
          changed_fields text[], old_values jsonb, new_values jsonb, created_at)
    action: insert | update | delete
```

**Database triggers do the recording**, not application code — `trg_audit` on 21 tables:

```
quotes, quote_items, invoices, invoice_items, payments, expenses, pricing_tiers,
dogs, litters, reservations, users, contacts, client_groups,
client_group_members, applications, waiting_list, contracts,
contract_templates, contract_clauses, documents, app_settings
```

That was deliberate. An app-level log only sees what the app does — it is blind to the
Supabase SQL editor, migrations, scripts, and anyone holding the service key. Several
changes this week were made outside the app entirely.

Things to know before building the UI:

- **Updates store only the fields that changed**, in `changed_fields`, with `old_values`
  and `new_values` narrowed to those keys. Full-row snapshots would bury the one column
  that moved.
- **`actor_id` is NULL for changes made outside a user session** — a migration, a script,
  the SQL editor. `actor_role` says what it was (`postgres`, `service_role`). Do not
  render those as "Unknown user"; render them as **System** and say where they came from.
  That distinction is the point of the log.
- `record_id` resolves the table's real primary key, so it is `quote_validity_days` for
  `app_settings` and a UUID for `dogs`.
- **RLS: admins read. There is no insert, update or delete policy for anyone.** History
  cannot be rewritten, including by you. Do not add one, and do not build an "edit" or
  "delete entry" control.
- Retention is 24 months, purged nightly by `purge_old_audit_log()`.

Nothing needs creating. Regenerate types in **both** repos first — `audit_log` is new:

```powershell
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr | Set-Content -Path src/types/database.types.ts -Encoding utf8   # website
npx supabase gen types typescript --project-id nlmwxodvquwbjinhhbmr | Set-Content -Path types/database.types.ts -Encoding utf8       # app
```

Use `Set-Content -Encoding utf8`, never `>`. PowerShell redirection writes UTF-16 and
silently corrupts the file — that produced thirteen phantom type errors this week.

---

## 1. Website — `/admin/audit`

### The list

Newest first, paginated (50 a page — this table grows, do not fetch it all).

Each row, in plain English rather than raw columns:

> **Matt Diedericks** changed **price** on **Standard Puppy** · 2 minutes ago
> R20 000,00 → R25 000,00

- Resolve the record to something human where you reasonably can: a dog's name, a quote
  number, a client's name. Fall back to the id rather than showing nothing.
- Show the before → after inline for single-field changes. For multi-field changes, list
  the field names and expand on click.
- **System changes** get a distinct muted treatment and read *"System (migration or
  script)"* — never a person's name, and never blank.

### Filters

Table, action, actor, and a date range. Plus a free-text search across `table_name`,
`record_id` and `actor_email`.

### History for one record

`/admin/audit?table=dogs&record=<id>` shows one record's full history, oldest at the
bottom. **Link to it from the dog, quote, invoice, contract and client detail pages** —
a "History" link in the corner. That is where it earns its keep: the question is almost
never "what happened today", it is "who changed this dog's price".

### Money and legal changes deserve emphasis

Changes to `payments`, `invoices`, `quotes`, `pricing_tiers`, `contracts` and
`app_settings` get a gold accent in the list. A changed bank account or a changed price
matters more than a changed note, and the eye should find it without filtering.

## 2. App — `diedericks-dobermanns`

Matt works from his phone. Keep it to what is useful on a small screen.

- New screen `app/(admin)/audit.tsx`: the same list, newest first, infinite scroll,
  filter by table and action only — no date pickers on mobile.
- A `useAuditLog.ts` hook in `hooks/`, following the `useDogs` pattern
  (loading / error / refresh), with pull-to-refresh.
- Reuse `SectionHeader`, `Typography` and existing list primitives. Do not build new list
  UI.
- On the dog detail screen, a **History** row opening that dog's entries.
- Link it from the admin menu wherever `analytics` sits.

Skip the record-history deep-linking beyond dogs on mobile — the website is where a real
investigation happens.

---

## Rules

- `requireAdmin()` on the website page and every action; the app's admin area is already
  gated.
- Read-only, everywhere. No control may create, edit or delete an audit row.
- Never `createAdminClient()` outside admin routes.
- Paginate. Never `select('*')` the whole table.
- `old_values` / `new_values` can hold personal data (addresses, ID numbers). Render them
  in the admin UI, but never log them to the console and never put them in a URL.
- No file over 300 lines.
- Loading, empty and populated states. The empty state says *"Nothing recorded yet —
  auditing started 11 August 2026"*, not a bare zero.

## Verify

- [ ] Changing a dog's price in admin produces one audit row naming the signed-in user and showing only the price field.
- [ ] A change made in the Supabase SQL editor appears as **System**, not as a user.
- [ ] The record-history view for one dog shows that dog's changes only.
- [ ] There is no UI anywhere to edit or delete an audit entry, and RLS rejects it if attempted.
- [ ] A non-admin cannot read `audit_log`.
- [ ] The list paginates and does not slow down with thousands of rows.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. Build, not just types — a client/server import mistake broke every deployment for six hours this week and `tsc` did not catch it.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double (that means UTF-16).

## Commit

Two repos, two commits.

**Website:** from `diedericksdobermann-web/`, `git add -A`, one commit, `git push origin main`.

**App:** the repo root is the **parent** folder, not `diedericks-dobermanns`. Commit and
push separately.

No migration needed — the schema and triggers are live.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`, or
`src/components/layout/WhatsAppButton.tsx`.
