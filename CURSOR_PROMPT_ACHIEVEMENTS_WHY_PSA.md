# CURSOR PROMPT — Say why PSA is the hard one, before listing the results

A buyer reading "PSA PDC — 2nd Place" has no idea whether that is impressive. The website opens with
a short lead statement; **the app has none at all and drops straight into a list of titles.** This
adds the reasoning to both, and replaces the website's current lead with a sharper one.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**No migration.** This is content and layout only.

Website: `src/app/(site)/achievements/page.tsx` — replace the existing lead block (the
`mb-16 rounded-sm border border-gold/20 bg-surface` div).
App: `app/(public)/achievements.tsx` — add the same content above the list, before the `map`.

Put the copy in **one shared constant per repo** (e.g. `src/lib/content/psaDifficulty.ts`) rather
than inline JSX, so the two surfaces cannot drift apart when Matt edits one.

---

## The copy — use exactly this

### Lead

> **We rate PSA the most difficult protection sport in the world.**
>
> Not because of the exercises. Because of the pressure. PSA is built to find out what a dog
> actually is — its true character and its nerve profile under conditions no amount of drilling can
> rehearse. It tests the handler just as hard: whether they can read, hold and work a dog of that
> calibre when it matters.

### Why — the specifics

> A PSA dog works through **stick hits**, **gunshots** and deliberate environmental stressors —
> including running chainsaws. The scenarios change, the surfaces change, the decoys are unfamiliar
> and they are working against the dog, not with it. A dog that has rehearsed a routine falls apart.
> A dog with genuine nerve does not.

### How we rank the sports

Render as an ordered list, most demanding first, with **"Our view"** stated plainly above it:

> **Our view, based on the pressure placed on the dog:**
>
> 1. **PSA** — Protection Sports Association
> 2. **KNPV** — Dutch police dog programme
> 3. **Mondio Ring**
> 4. **French Ring**
> 5. **Belgian Ring**
> 6. **IGP**
>
> Every one of these is a serious sport and every title in them is earned. This is our assessment of
> the pressure each places on the dog, not a judgement of the handlers who compete in them.

**That last sentence is not optional.** Publicly ranking IGP last will be read by people who have
given years to it. The ranking is defensible; contempt is not, and we are not implying it.

### The record

> To our knowledge, **fewer than ten Dobermanns have ever passed PSA's test of courage and gone on
> to pass trials. Three of them are ours.**

---

## Two things that must not be softened, and one that must not be overstated

**Keep the stressors concrete.** "Stick hits, gunshots, chainsaws" is what makes the argument land.
A reader who does not know dog sport understands a chainsaw. Do not abstract it into "environmental
pressure".

**Keep "Our view" attached to the ranking.** It is an opinion, and stating that it is one is what
makes it credible rather than boastful. Never render the ranking without that framing, on either
surface.

**"To our knowledge" stays on the three-of-ten claim.** It is a strong, checkable statement about a
worldwide population that no one formally publishes. Hedged, it is impressive and defensible.
Unhedged, one counter-example makes the whole page look careless.

## Layout

- Website: the existing bordered card is the right container. Keep the Cinzel lead paragraph, then
  body copy in `text-muted`, then the ranked list with the numerals in gold.
- App: a `Card` above the achievements list. The ranked list must be readable on a phone — one line
  per sport, the sport name in `Typography variant="subtitle"`, the description muted beside it.
  **Do not shrink the type below 15px** to make it fit; let it scroll.
- The ranking is the part people screenshot. Give it room on both surfaces.

## Rules
- Content and layout only. **No schema changes, no query changes, no writes.**
- Do not touch the achievements list rendering or its sort. That is working.
- Both repos, TypeScript strict, no file over 300 lines.
- `ls` each app file you touch and paste the output — grep has false-negatived on this filesystem.

## Verify — paste output, not descriptions
- [ ] Screenshot the website achievements page, desktop and mobile, showing lead, reasoning, ranking
      and the record claim.
- [ ] Screenshot the app achievements screen showing the same four blocks above the list.
- [ ] Confirm the words **"Our view"** appear immediately above the ranking on **both** surfaces.
- [ ] Confirm **"To our knowledge"** appears on the three-of-ten claim on **both** surfaces.
- [ ] Confirm the existing achievement list below is unchanged — paste the count of achievements
      rendered before and after.
- [ ] `npx tsc --noEmit` clean in both repos; `npm run preflight` passes.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145`, and the live page shows the new copy.

## Commit
Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
