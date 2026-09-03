# CURSOR PROMPT — Make the sale agreement readable without hiding anything

The Puppy Sale and Placement Agreement is **20,834 characters, 16 sections, 73 paragraphs** — about
a fourteen-minute read — rendered as one unbroken column. A buyer reads the first two clauses
properly and skims the rest. That is the opposite of what clause-level acknowledgement is for.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**Next free migration: `0148`.** (`0147` is reserved by the invite-measurement prompt.)

---

## The one rule that governs this whole prompt

**No term may be collapsed by default.**

It is tempting to ship an accordion with everything closed — it looks clean and it would genuinely
be easier on the eye. Do not. A buyer who later says *"that clause was hidden from me"* has a much
better argument if the page shipped it closed, and this contract already carries clause-level
acknowledgements precisely to evidence that they saw the terms. Collapsing by default would
undermine the thing it is built to prove.

Everything below makes the document **navigable**, not **concealed**.

## The 16 sections, for reference

```
PARTIES · THE DOG · PREAMBLE
1 Sale and transfer of ownership      7 Recall and removal
2 Health at handover                  8 No breeding rights
3 Health undertaking                  9 Name, registration and representation
4 The buyer's obligations of care    10 Death or loss of the dog
5 Welfare inspection                 11 Addenda
6 No transfer — return to breeder    12 General
ACKNOWLEDGEMENT BY THE BUYER
```

---

## 1. A contents list at the top

The single biggest win, and the cheapest. A buyer cannot judge a document whose shape they cannot
see. Above the body:

- All 16 headings as jump links, two columns on desktop, one on mobile
- The estimated read time — "about 14 minutes" — stated plainly. People give a long document more
  patience when they know what they are in for than when it ambushes them
- Sticky on desktop so they never lose their place; a plain block at the top on mobile

Derive the headings from the `<h2>` tags in `body_html` at render time. **Do not hardcode the list** —
the template is edited from the admin and a hardcoded index would silently drift out of step with
the contract it indexes.

## 2. Sections become collapsible — open by default

Wrap each `<h2>` and the content up to the next `<h2>` in a `<details open>` (or the React
equivalent with the same semantics). Add:

- **Collapse all read** — lets a buyer clear away what they have finished so the remaining terms are
  short. This is the honest version of the accordion: the *buyer* chooses to hide, not us.
- Sections stay open on print and in the PDF regardless of screen state. A collapsed section must
  never affect the document of record.

`PARTIES`, `THE DOG` and `ACKNOWLEDGEMENT BY THE BUYER` are **not collapsible** — they are the
buyer's own details and the thing they are signing.

## 3. A plain-language summary at the top

Migration `0148`:

```sql
alter table public.contract_templates
  add column summary_html text;

comment on column public.contract_templates.summary_html is
  'Plain-language summary shown above the agreement. Explicitly NOT a term of the
   contract and must be labelled as such wherever it renders — the binding text is
   the clauses below it.';
```

Render it in a bordered box above the contents, headed **"In short"**, with the line
*"This summary is for your convenience. The agreement below is what you are signing."* in muted text
directly under the heading — not buried at the bottom of the box.

Seed it for the Puppy Sale agreement with six to eight lines drawn from the actual clauses. Write
them as statements of fact, not reassurance:

- What you are buying, and when ownership passes
- The dog is sold as a companion — **no breeding rights**
- Have a vet examine the dog within **24 hours**; tell us in writing within 7 days of any congenital
  defect
- How you must house, feed and care for the dog
- We may inspect the dog's welfare
- The dog may never be sold or given away — it comes back to us
- We can recall the dog if the terms are broken
- What happens if the dog dies or is lost

**Do not soften the terms in the summary.** If a clause is strict, the summary says so. A summary
that reads more gently than the contract is worse than no summary, because it creates an expectation
the contract then contradicts.

## 4. Wire the acknowledgements to the sections

`contract_clauses` already carries `clause_ref`, and `contract_acknowledgements` snapshots the label
at signing. Use that link:

- Each acknowledgement checkbox gets a **"read this section"** link that jumps to and expands the
  matching section
- Beside each section heading, a quiet marker once its acknowledgement is ticked
- A progress line above the signature block: **"3 of 8 acknowledged"**

Do not gate the checkbox on having scrolled the section. It reads as a dark pattern, it is easily
defeated, and it adds nothing your acknowledgement record does not already prove.

## 5. Typography

The body is rendered from stored HTML, so this is CSS on the container:

- Max line length ~70 characters. Long lines are the main reason this feels heavy
- Line height 1.7 on body text
- Clear space above `<h2>`, tighter below, so headings group with their content
- Numbered sub-clauses (`2.1`, `2.2`) indented and visually distinct from prose
- **Minimum 15px on mobile.** Most buyers will read this on a phone

## 6. App parity

The app renders contracts at `app/(portal)/contracts/[id].tsx`. Same contents list, same collapsible
sections, same summary box, same rule that nothing is collapsed by default. Native `<details>` is not
available — use an accessible disclosure component with correct `aria-expanded`.

`ls` each app file you touch and paste the output. **Do not rely on grep — it returned a false
negative on this exact component earlier today.**

---

## Rules
- **Do not alter a single word of any clause.** This prompt changes presentation only. If any
  contract text differs after your change, you have broken it — stop and report.
- **Never modify a contract whose status is not `draft`.** `DD-AGR-1137` is signed and `DD-AGR-1135`
  is sent; both are legal records.
- The PDF and print output must contain the full text, every section expanded.
- Both repos. TypeScript strict. No file over 300 lines — the viewer will want splitting.

## Verify — paste output, not descriptions
- [ ] Screenshot the contract with the contents list and summary box, desktop and mobile.
- [ ] Confirm **every section is open on load**. Screenshot the top of the page proving it.
- [ ] Collapse all, then print to PDF. Confirm the PDF contains **all 16 sections in full**. Attach it.
- [ ] Paste a character count of the rendered clause text before and after your change. It must be
      identical — this is the regression that matters.
- [ ] Click an acknowledgement's "read this section" link; confirm it jumps and expands. Screenshot.
- [ ] Screenshot "N of 8 acknowledged" updating as boxes are ticked.
- [ ] Confirm `DD-AGR-1137` (signed) and `DD-AGR-1135` (sent) are byte-identical before and after.
      Paste a hash of each `body_html` from before and after.
- [ ] Paste the seeded `summary_html` so Matt can read the plain-English version himself.
- [ ] `npx tsc --noEmit` clean in both repos; `npm run preflight` passes.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on **`diedericksdobermanns-web-v145`** — now the only project.
- [ ] Migration `0148` applied live and present in both repos.

## Commit
Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
