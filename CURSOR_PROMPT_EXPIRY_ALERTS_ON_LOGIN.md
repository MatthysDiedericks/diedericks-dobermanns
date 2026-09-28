# Cursor Prompt — Tell Matt what is about to expire, on screen, when he logs in

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

---

## The finding that decides this build

`documents.expiry_date` exists. `documents.expiry_reminder_sent_at` exists. The
`document_expiry` notification type exists in the `notifications_log` constraint.

```
documents                     155
documents with an expiry date   0
document_expiry notifications ever sent   0
```

**The reminder was built against a column nobody fills.** It has never fired because there has never
been anything to fire on. Building a second reminder on top of the same empty column repeats the
mistake.

I set one expiry by hand while checking: the KUSA membership letter, valid until **15 October 2026 —
23 days away**. That is the exact thing Matt wants to be warned about, and until this morning the
system could not have told him.

So this job is two halves, and the first is the one that matters: **make expiry dates get captured.**

## What actually has dates, today

Not just documents. Verified across the live database, items falling due in the next 90 days:

| Table | Column | Due in 90 days |
|---|---|---|
| `quotes` | `valid_until` | 27 |
| `todo_items` | `due_date` | 25 |
| `waiting_list` | `quote_expires_date` | 11 |
| `invoices` | `due_date` | 8 |
| `litter_todos` | `due_date` | 8 |
| `deworming_records` | `next_due_date` | 3 |
| `vaccinations` | `next_due_date` | 3 |
| `portal_invites` | `expires_at` | 2 |
| `contracts` | `esign_expires_at` | 1 |
| `expenses` | `payable_due_date` | 1 |
| `documents` | `expiry_date` | **1** (the KUSA letter I just dated) |

---

## Part 1 — Capture the dates

### 1a. Ask for an expiry date when it makes sense

On the document upload and edit forms, show **Expiry date** — not buried, and pre-selected for the
categories that always expire: `registration`, `insurance`, `permit`, `health_certificate`,
`membership`, `licence`. For `other` and `proof_of_payment`, leave it optional and quiet.

Where a category always expires and the field is left empty, show an inline note on save — *"No expiry
date — this document will never appear in reminders."* Do not block the save. Tell the truth and move
on.

### 1b. Backfill what is knowable

There are 13 kennel documents. Most are logos, letters and templates that never expire. A handful are
registry paperwork that does.

Write a **one-off script that lists them for Matt with a suggested expiry where the document itself
states one**, and applies nothing until he confirms. Do not parse PDFs and guess. Present the list,
take his answers, then write.

`Kusa` is already done — issued 3 Sep 2025 by KUSA, expires 15 Oct 2026. Leave it alone.

---

## Part 2 — The alert on screen

### 2a. One resolver, every source

`src/lib/alerts/expiring.ts`, one exported function used by every surface:

```ts
export type ExpiringItem = {
  kind: "document" | "vaccination" | "deworming" | "contract" | "invite" | "quote" | "payable";
  id: string;
  label: string;        // "KUSA membership"
  context: string|null; // "Hunter-King" — the dog, client or litter it belongs to
  dueOn: string;
  daysLeft: number;     // negative when overdue
  href: string;         // straight to the thing
};

export async function fetchExpiringItems(withinDays = 7): Promise<ExpiringItem[]>
```

Sort by `daysLeft` ascending so overdue leads.

**Deliberately excluded: `todo_items`, `litter_todos` and `invoices`.** Todos already have their own
screen, and an overdue invoice is a debtors matter, not an expiry. Twenty-five todos would bury the
one thing that actually lapses. If Matt later wants them, that is a flag on the function, not a
rewrite.

### 2b. Where it shows

**A banner across the top of the admin dashboard**, above everything, when anything is inside 7 days
or already overdue:

> **2 things need attention** — KUSA membership expires in 23 days · Hannah's vaccination due in 4 days

Each item is a link. Overdue items read *"expired 3 days ago"* and sit first.

**A bell in the admin header** with a count, on every admin page, opening the same list. Matt asked to
be told "when logged in and we view the system" — that means every page, not only the dashboard.

**Dismissable per item, for 7 days, per user.** A new table:

```sql
create table public.alert_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_kind text not null,
  item_id uuid not null,
  dismissed_until date not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_kind, item_id)
);
```

RLS: a user reads and writes only their own rows. Dismissing hides it until `dismissed_until`, then it
returns. **An item that is actually overdue cannot be dismissed** — that is the one case where the
nagging is the point.

### 2c. The window

7 days as Matt asked, **except for the things that cannot be fixed in a week**. A kennel registration
renewal is not a seven-day job. Store the lead time per kind in `app_settings`:

```
alert_lead_days_document      30
alert_lead_days_vaccination    7
alert_lead_days_deworming      7
alert_lead_days_contract       3
alert_lead_days_invite         3
alert_lead_days_quote          7
alert_lead_days_payable        7
```

Default 7 where a kind is missing, and make them editable in admin settings. **Say plainly in your
report that you did this**, because it is a deliberate departure from "7 days" and Matt should get to
overrule it.

### 2d. Do not send email from this

This is an on-screen alert. The daily scheduled check already emails. Two systems mailing the same
fact is how people learn to ignore both.

### 2e. Tests

- An item 8 days out does not appear at a 7-day lead; at 7 days it does
- An overdue item sorts first and reads "expired N days ago"
- Dismissing hides it for 7 days and it returns after
- An overdue item cannot be dismissed
- A document with no expiry date never appears
- The KUSA letter appears at the 30-day document lead, showing 23 days
- Per-kind lead days are read from settings, not hardcoded

---

## Do not

- Do not build the alert without Part 1. A reminder over an empty column is the bug being fixed.
- Do not include todos or invoices in the banner.
- Do not send email from this feature.
- Do not let an overdue item be dismissed.
- Do not guess expiry dates by parsing PDFs.
- Do not create test documents in production.

---

## Report

1. The document form with the expiry field, and what a category that always expires looks like when
   left empty.
2. The 13 kennel documents listed with suggested expiries, **not applied** — for Matt to confirm.
3. `expiring.ts` and its tests.
4. The banner and the header bell, with the KUSA letter showing.
5. The dismissal table with its RLS, and proof an overdue item refuses to dismiss.
6. The lead-day settings, and your note that documents default to 30 rather than 7.
7. `npx tsc --noEmit` clean in both repos.
