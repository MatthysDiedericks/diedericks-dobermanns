# CURSOR PROMPT — Every quote must land in the client's portal

**Requirement from Matt: every quote a client is sent must appear in their portal. When a quote is
sent, a copy goes by email AND a copy sits in their profile. No exceptions.**

Right now that does not happen, and the reason is a broken chain.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## The broken chain — verified on live data

`quotes.client_id` → `users(id)`. The portal reads quotes by `client_id`. `claim_my_records()`
links quotes through `applications.user_id`:

```sql
update public.quotes qt set client_id = v_uid
 where qt.client_id is null
   and qt.application_id in (select ap.id from public.applications ap where ap.user_id = v_uid);
```

**Every single application row had `user_id = NULL`** — including Andrew Murray's, whose account
was created, confirmed and signed into on 12 Aug, with an exactly matching email. So:

> confirmed account → **unclaimed application** → orphaned quote → empty portal

Quotes were also being written with `client_id = NULL` and the buyer's name dropped into
`historical_client_name` as free text — a field meant for pre-system records, not a buyer who
applied through the website that morning.

**Already fixed by hand (do not redo):** applications back-filled to confirmed accounts by exact
email, and `DD-1136` now points at Andrew Murray's account. DD-1133/1134/1135 remain unlinked
because those buyers have no account yet — that is correct, and this prompt handles it.

---

## 1. Find out why `claim_my_records()` did not claim the application

The function claims applications by confirmed email, then quotes via the application. Andrew's
application stayed null through registration, confirmation **and** a sign-in. So either it is not
being called, or its applications step fails.

**Diagnose before changing anything.** Check that it is actually invoked at both points the
registration prompt specified: after email confirmation in `/portal/auth/confirm`, and on every
successful portal sign-in. Check the app's post-verification and sign-in paths too. Report what
you find — do not rewrite the function until you know which of the two it is.

If it is being called and silently failing, log the failure via `logError` with code
`PORTAL_CLAIM_FAILED`. A claim that quietly does nothing is how this went unnoticed for two days.

## 2. Set `client_id` when the quote is created — do not rely on claiming

Claiming is a safety net for records raised before an account exists. It must not be the primary
mechanism.

When a quote is created from an application:

1. Read the applicant's email from the application.
2. If a **confirmed** `auth.users` row exists for that email, set `quotes.client_id` to it immediately, and set `applications.user_id` too if still null.
3. If no account exists, leave `client_id` null and leave `historical_client_name` for display — then follow step 3 below.

**Never guess.** Match on exact lowercased email against a confirmed account only. An unconfirmed
address proves nothing; linking on one would hand a stranger someone else's quote, contract and
personal details.

`historical_client_name` is for genuinely historical records. **A live applicant must end up with a
real link**, not a name in a text field.

## 3. No account yet? Make the quote the reason to create one

For the three buyers currently in this state, and everyone after them:

- The quote email's call to action goes to `/portal/register?email=<their address>` — the register form already pre-fills from that parameter.
- Say plainly why: *"Create your portal account with this same email address and your quote, application and documents will be waiting for you."*
- On registration and confirmation, `claim_my_records()` attaches everything. **That is the safety net working as designed** — but only once step 1 is fixed.

## 4. The portal must show the quote as a document, not just a row

A client opening their portal should see the quote listed with number, date, total, status, validity
date — and be able to **open the same PDF that was emailed to them**. Regenerate from the stored
quote data rather than keeping a second copy; the revision snapshot from `quote_revisions` is the
authority for anything already sent, so a client viewing revision 1 sees revision 1's numbers.

Show it in the app too. Matt's buyers are on phones.

## 5. Sending stays a deliberate act

**Creating a quote does not email anyone.** Matt creates it, reviews it, presses Send. On send:

- the email goes out with the PDF,
- `sent_at` is stamped (already working),
- the quote becomes visible in the portal,
- the waiting-list entry moves to `quote_sent`.

**No automatic sending anywhere in this feature.** Nothing in this system messages a client without
Matt pressing the button.

## 6. Back-fill and prove it

After the code is fixed, run and report:

```sql
select q.quote_number, q.status,
       coalesce(u.email, '(no account)') as portal_account,
       a.email as applicant_email
from quotes q
left join auth.users u on u.id = q.client_id
left join applications a on a.id = q.application_id
order by q.created_at desc;
```

**Every quote with an application whose email has a confirmed account must show that account.**
Quotes whose buyer has no account show `(no account)` — expected, and they resolve on registration.

---

## Rules

- Link only on an exact lowercased email match to a **confirmed** account.
- Never write `client_id` from an unconfirmed address, and never from a name match.
- Creating a quote never sends anything; sending is a button Matt presses.
- Portal quote PDFs render from stored data, and sent revisions render from their snapshot.
- A client sees only their own quotes — verify with a real client JWT, not by reading the policy.
- No file over 300 lines. `requireAdmin()` on admin actions; portal routes use the request-scoped client so RLS applies.
- Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify

- [ ] You have identified and reported **why** `claim_my_records()` did not claim Andrew's application.
- [ ] Creating a quote from an application whose applicant has a confirmed account sets `client_id` at creation — verify by SQL, not on screen.
- [ ] Creating one for an applicant with no account leaves `client_id` null and does not error.
- [ ] That quote's email links to `/portal/register?email=…` and the register form pre-fills.
- [ ] Registering with that email then claims the application, the quote and any waiting-list entry, and says so once.
- [ ] An **unconfirmed** account claims nothing.
- [ ] A quote appears in the portal within one refresh of being sent, with an openable PDF.
- [ ] The PDF a client opens for a sent revision matches the numbers that were emailed.
- [ ] The app shows the same quotes as the website.
- [ ] Client A cannot see Client B's quote — test with two real client accounts.
- [ ] The back-fill query shows every eligible quote attached to its account.
- [ ] Creating a quote sends no email; sending sends exactly one.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0, types file not double size.

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

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Push both, then `git log origin/main -1` in each and confirm it matches `HEAD`.

Do not modify (committing is fine): `src/lib/portal/dogs.ts`, `src/lib/portal/training.ts`,
`src/lib/portal/buyerJourneySteps.ts`, `src/lib/issues/capture.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
