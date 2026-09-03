# CURSOR PROMPT — The sport ranking prints its numbers twice, live on the site

`https://www.diedericksdobermanns.com/achievements` currently renders:

```
1. 1PSA — Protection Sports Association
2. 2KNPV — Dutch police dog programme
3. 3Mondio Ring
```

The ranking is the part of that page people screenshot, and it is broken in production right now.

**Repo:** `diedericksdobermann-web` only. **The app is already correct** — `PsaDifficultyCard.tsx`
uses `View`/`Typography`, and React Native has no automatic list numbering, so its single rendered
number is right. Do not "fix" the app; you will break it.

**No migration. No content change.** The words are approved and must not be touched.

---

## The cause

`src/components/achievements/PsaDifficultyLead.tsx` line 27 opens an **`<ol>`**, which makes the
browser number every `<li>` — and then line 31 renders `{index + 1}` inside the row as well. Two
numbering systems, both switched on.

## The fix

Keep the manual number. It is the styled one — gold, Cinzel, `w-8` — and it is what matches the app.
Suppress the browser's.

Either change `<ol>` to `<ul className="mt-8 list-none space-y-5">`, or keep `<ol>` and add
`list-none`. **Prefer keeping `<ol>`**: the order carries meaning here, it is a ranking, and an
ordered list is what a screen reader should announce. Only the visual marker should go.

Check the same mistake is not repeated anywhere else the file lists things.

## Rules
- Do not change `src/lib/content/psaDifficulty.ts`. The copy is approved.
- Do not change the app. It renders correctly.
- Do not restyle the list — same spacing, same gold numerals, same Cinzel.
- One commit, one file.

## Verify — paste output, not descriptions
- [ ] Screenshot the live `/achievements` page after deploy showing **`1 PSA`**, not `1. 1PSA`.
- [ ] Screenshot it at mobile width too.
- [ ] Confirm the list is still an `<ol>` in the DOM, or say plainly why you changed it.
- [ ] Screenshot the app achievements screen unchanged, to prove it was not touched.
- [ ] `npx tsc --noEmit` clean; `npm run preflight` passes.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` — paste the hash.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145`, and the live page shows the fix.

## Commit
Website only, from `diedericksdobermann-web/`.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
