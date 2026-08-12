# CURSOR PROMPT — Two live bugs: clients cannot register, quote lines vanish

Both confirmed against the live database and the auth logs. Both are silent failures — the user
is given a confident, wrong message instead of the truth.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Bug 1 — the registration form lies to the client

Leivale Rosenberg tried three times last night and has **no account in `auth.users`**. The auth
log for 11 Aug 18:39, 18:41 and 18:55 SAST:

```
POST /signup  422  "Password should be at least 12 characters."
POST /token   400  "Invalid login credentials"
```

Two separate defects produced that.

### 1a. The form says 8, the server requires 12

`RegisterForm.tsx` renders *"Minimum 8 characters."* and validates against 8. Supabase Auth on
this project is configured with a **12** character minimum. A client following the on-screen
instruction is rejected by the server every time.

**Read the real value rather than hard-coding another guess.** Supabase does not expose the
password policy to the client, so put it in one constant, `MIN_PASSWORD_LENGTH = 12`, in a shared
module used by the website register form, the app sign-up screen, and the reset-password screen.
A comment must state that it mirrors the Supabase Auth setting and that changing one without the
other reproduces this exact bug.

Check the **app** too — `diedericks-dobermanns` has its own sign-up and reset screens, and if they
also say 8, mobile registrations fail identically.

### 1b. A catch-all turns every error into "you already have an account"

`RegisterForm.tsx`, around line 65:

```ts
if (signUpError) {
  const msg = signUpError.message.toLowerCase();
  if (msg.includes("rate") || msg.includes("limit")) { … return; }
  // Do not reveal whether the address already exists.
  setError(ACCOUNT_EXISTS_HINT);   // ← every other error lands here
  return;
}
```

A password-policy rejection, an SMTP failure, a network error and a database error all become
*"If that address already has an account, sign in or reset your password."* The client then goes
to sign in — and cannot, because no account was ever created. That is what happened here.

**Fix the shape of the check, not just this one case.** The non-disclosure message must be used
only for the specific condition it was written for: a signUp that **succeeded** and returned a
user with an empty `identities` array (Supabase's enumeration protection). That check already
exists below and is correct — leave it.

For `signUpError`, surface errors the user can act on:

- password policy → the actual requirement, and highlight the password field
- rate limit → existing message, keep it
- email/SMTP failure → *"We could not send the confirmation email. Try again in a minute, or WhatsApp us and we will set your account up."* — with the WhatsApp link from `app_settings.contact_whatsapp`
- anything else → *"Something went wrong creating your account. Try again, or WhatsApp us and we will help."* plus `console.error` with the raw error

**None of these reveal whether an address is registered**, so nothing is leaked. The non-disclosure
rule was never a reason to hide a password-length error; it applies to the *existence of an
account*, and only that.

**Log every failed signup** to `notifications_log` (or a small `signup_failures` table) with the
timestamp, the error code and the email domain — **not the address, not the password**. Right now
the only reason we know this happened is that a client sent Matt a screenshot on WhatsApp. Every
other failure is invisible.

### 1c. Show the requirement before submit, not after

State the rule under the field as the user types — length met / not met — rather than only
rejecting on submit. And do not clear the password fields on error; making someone retype
everything after a rejection they did not cause is how you lose them.

---

## Bug 2 — quote line items are silently discarded

Quote **DD-1135** (11 Aug 18:48) has **one** line item: the puppy at R55 000. The delivery line
Matt added never reached the database.

`QuoteBuilder.tsx` line 159:

```ts
.filter((it) => it.description.trim())
```

Any line with a blank description is **dropped without warning** on submit. Matt selected the
`delivery` item type and entered an amount but no description, so the line was thrown away, the
subtotal was computed from what survived, and the quote went to the client short.

`delivery` is a valid `item_type` and there is no database constraint blocking it — the type
system and the schema were both fine. The line was discarded by the UI.

### The fix

**Do not silently drop a line the user entered.** Three changes:

1. **Default the description from the item type** when it is blank but the line has a price: `delivery` → *"Delivery / travel"*, `transport` → *"Transport"*, `board_train` → *"Board & train"*, `training` → *"Training"*, `accessory` → *"Accessory"*, `other` → *"Additional item"*. A line with a price is a line the user meant.
2. **Only discard a line that is genuinely empty** — no description, no price, and no dog.
3. **If a line still cannot be saved, block submit and say which one**: *"Line 2 has an amount but no description. Add one, or remove the line."* Never drop it quietly.

### Then make the totals impossible to get wrong

`priceQuoteItems()` is the single source of truth **in application code**, and it is correct — but
there is **no database trigger** recalculating `quotes.subtotal` and `quotes.total` from
`quote_items`. Any write that does not go through that one function leaves the stored totals
disagreeing with the lines on the quote. A quote whose printed total does not match its own line
items is a dispute with a client.

Migration `0064_quote_totals_trigger.sql`:

```sql
create or replace function public.recalc_quote_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare q uuid;
begin
  q := coalesce(new.quote_id, old.quote_id);
  update public.quotes
     set subtotal = coalesce((select sum(quantity * unit_price) from public.quote_items where quote_id = q), 0),
         total    = greatest(coalesce((select sum(quantity * unit_price) from public.quote_items where quote_id = q), 0)
                             - coalesce(discount, 0), 0),
         updated_at = now()
   where id = q;
  return null;
end $$;

create trigger trg_quote_items_recalc
after insert or update or delete on public.quote_items
for each row execute function public.recalc_quote_totals();
```

Also recalc on `quotes.discount` changing. Keep `priceQuoteItems()` — the UI still needs to show a
running total before saving — but **the database becomes the authority.**

Do the same for `invoices` / `invoice_items` if no equivalent trigger exists there. Check first;
`payments` already has a totals trigger, so the pattern exists — follow it.

**Do not revoke EXECUTE from PUBLIC** on these functions. That caused a 6.7-hour outage on this
project in July.

### Back-fill check

After the trigger is live, run and report:

```sql
select quote_number, subtotal, total,
       (select coalesce(sum(quantity*unit_price),0) from quote_items where quote_id = q.id) as from_lines
from quotes q
where subtotal <> (select coalesce(sum(quantity*unit_price),0) from quote_items where quote_id = q.id);
```

**Report what it returns. Do not auto-correct DD-1135** — its missing line is a business decision
about what to send the client, not a data-repair job.

---

## Rules

- Never show a message that asserts something the system has not verified.
- The non-disclosure rule protects **account existence** only; it is not a reason to hide any other error.
- Never discard user-entered data silently. Default it, or block and explain.
- Password length lives in one constant shared by every screen in both repos.
- No file over 300 lines.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] Registering with an 8-character password shows *"Password must be at least 12 characters"* against the password field — not the account-exists message.
- [ ] The hint under the field reads 12, on the website register form, the app sign-up screen and both reset-password screens.
- [ ] Registering with a genuinely new address and a valid password creates the user and shows "check your email".
- [ ] Registering with an address that **does** already have an account still shows the generic non-disclosure message and reveals nothing.
- [ ] Forcing a signUp failure (temporarily break the anon key locally) shows the WhatsApp fallback, not the account-exists message.
- [ ] A failed signup writes a log row containing no password and no full email address.
- [ ] A quote line with a price and no description saves with a sensible default description.
- [ ] A quote line with a description and no price blocks submit and names the line number.
- [ ] A completely empty line is dropped without complaint.
- [ ] Adding a delivery line to an existing quote updates `quotes.subtotal` and `total` **in the database**, verified by SQL and not just on screen.
- [ ] Deleting a line recalculates the total downward.
- [ ] The drift query above returns zero rows other than any Matt chooses to leave.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds** — build, not just types.
- [ ] App: `npx tsc --noEmit` exits 0, and `types/database.types.ts` is roughly its previous size, not double.

## Commit

Two repos, two commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not touch `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`, or
`supabase/migrations/0061_contacts_dedupe.sql`.
