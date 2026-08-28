# CURSOR PROMPT — Search on every admin list, starting with Contacts

Matt had to be handed a URL to open Leandre Prinsloo's record, because **the Contacts page has no
search box**. It renders 243 contacts as a plain alphabetical list and expects him to scroll.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified — the pattern already exists, copy it

`src/components/admin/ClientsTable.tsx` already does exactly this and is the reference:

```
line 15   const [query, setQuery] = useState("")
line 18   const rows = useMemo(() => …filter…)
line 47   placeholder="Search by name or email…"
```

Search already exists on **Applications**, **Clients**, **Dogs**, and inside `ClientPicker` and the
waitlist forms. It is **missing on Contacts** — `src/app/admin/(panel)/contacts/page.tsx`, 105 lines,
a server component that selects `id, full_name, phone, whatsapp_number, email, city, contact_type`,
orders by `full_name`, `.limit(500)`.

**243 active contacts of 264 total**, so the 500 limit is not yet a problem — but it will be, and a
silently truncated list is worse than a slow one. See §3.

---

## 1 · Contacts — the one Matt actually hit

Extract the table into a client component (`ContactsTable.tsx`) and give it the `ClientsTable`
treatment. **Do not fork the logic — if the two are near-identical, extract one shared table.**

Search must match on **name, email, phone and WhatsApp number**, case-insensitive, ignoring spaces
and punctuation in numbers. Matt searches `0603871158`, `060 387 1158` and `+27 60 387 1158` for the
same person, and every one of those must find her.

- Match on **any part** of a name, not just the start. He types `prinsloo`, not `leandre`.
- Show the result count: *"3 of 243"*.
- No results is a plain line — *"No contact matches 'xyz'"* — with the search text quoted back so he can see a typo.

## 2 · The merged-duplicate trap

`contacts` now carries `merged_into_contact_id`. Merged rows **must not appear** in the list or in
search results — `fromActiveContacts()` already handles this, so use it and do not query `contacts`
directly.

But a merged record's **name is still what Matt remembers**. Searching `Lee Prinsloo` — a record
merged into Leandre Prinsloo on 26 Aug — must find **Leandre Prinsloo**, with a quiet note:
*"also known as Lee Prinsloo"*. Otherwise the merge makes a client harder to find, not easier, and
he will create a third duplicate.

## 3 · The 500 limit

`.limit(500)` truncates with no warning. At 243 contacts it is invisible; at 501 it silently hides
people.

- Filter **server-side** when the query is long enough (2+ characters) so search reaches beyond whatever page is loaded. Client-side filtering of an already-truncated list is a trap.
- Keep client-side filtering for instant feedback on the loaded page, but **the count must be honest** about what was searched.
- If a limit is ever hit, say so on screen. Never truncate silently.

## 4 · The same gap on the other lists

Audit every admin list and name the ones with no search:

Litters · Quotes · Invoices · Expenses · Documents · Waiting list · Enquiries · Unallocated sales ·
Contracts · Training bookings

Add the same component wherever a list can exceed roughly 20 rows. **One shared search component,
not ten copies.**

Quotes and Invoices additionally need to match on **quote/invoice number** — `DD-1147`, `dd1147` and
`1147` must all find it.

## 5 · Make it feel instant

- Autofocus is **wrong** here — Matt often lands on this page to scan, not to search. Do not steal the cursor.
- `/` focuses the search box. `Esc` clears it.
- Debounce server-side lookups at about 250 ms; client-side filtering runs on every keystroke.
- The query goes in the URL (`?q=`) so a search can be linked, bookmarked and survives back.

---

## The app

Matt looks people up on his phone at the kennel more than at his desk.

- Same search on the app's Contacts and Clients screens.
- Numeric keypad when the query looks like a phone number.
- Tapping a result opens the contact.

`ls` each app file and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**

## Rules

- One shared search component. No per-page copies.
- Use `fromActiveContacts()` — never query `contacts` directly.
- Merged records stay hidden but remain findable by their old name.
- Phone matching ignores spaces, dashes and `+27` vs `0`.
- Never truncate a list silently.
- No autofocus.
- No file over 300 lines. Regenerate types in **both** repos only if the schema changes — it should not.

## Verify — paste output, not descriptions

- [ ] Typing `prinsloo` on Contacts finds **Leandre Prinsloo**. Screenshot.
- [ ] `0603871158`, `060 387 1158` and `+27 60 387 1158` all find her. Three screenshots.
- [ ] Searching `Lee Prinsloo` finds Leandre Prinsloo with the "also known as" note — the merged record itself never appears as a separate row.
- [ ] `leandre.prinsloo@momentum.co.za` finds her.
- [ ] The result count reads "1 of 243".
- [ ] No match shows the plain line with the query quoted back.
- [ ] A 2-character query searches **server-side** and finds a contact that is not on the loaded page. Prove it — temporarily lower the limit to 10 and search for someone at the end of the alphabet.
- [ ] `/` focuses the box, `Esc` clears it, and the page does **not** steal focus on load.
- [ ] `?q=prinsloo` in the URL loads pre-filtered, and back works.
- [ ] Searching `1147` on Quotes finds DD-1147; same for Invoices with `DD-2026-0009`.
- [ ] Name every admin list you added search to, and any you deliberately left out.
- [ ] App: same search, numeric keypad on a phone-like query. Say which device.
- [ ] Website: `npm run preflight` passes — committed-tree import check, `tsc`, and `next build`.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel reaches **Ready** — paste the deployment id.

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the shared search component, Contacts, the other admin
lists, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
