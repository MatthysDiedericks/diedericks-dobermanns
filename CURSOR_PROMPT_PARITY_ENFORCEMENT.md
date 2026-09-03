# CURSOR PROMPT — Make the parity checker tell the truth, then make it block

`scripts/check-parity.mjs` already exists. It was written because "mirror it later" never held. It
currently reports **56 divergences**, and that is exactly why nobody reads it — at 56 warnings the
signal is gone and it gets scrolled past. It has never once blocked a commit.

This prompt does two things: **make the number honest**, then **make it enforce**.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**No migration.** Tooling and config only.

---

## 1. Roughly half the 56 are the checker's own fault

Fix the walker before touching the exceptions file, or you will be writing exceptions for bugs.

**It counts components as screens.** Seven of the flagged items are React components that happen to
live under `app/`: `RegisterForm`, `RegisterAccountFields`, `RegisterErrorBlock`, `CheckEmailPanel`,
`OpenAccountButton`, `CatalogueItemEditor`, `CatalogueSettingsClient`. Only route entry points count
— on the website that is `page.tsx` / `route.ts`; in Expo Router it is the route file itself. A
PascalCase filename that is not a route is never a screen.

**It does not know the two repos name routes differently.** These are the *same screen* and must
match:

| Website | App |
|---|---|
| `portal/application/edit` | `portal/application-edit` |
| `portal/application/another` | `portal/application-another` |
| `admin/finance/invoices/recurring/new` | `admin/finance/invoices/recurring-new` |
| `admin/preview/clients/:id/view-as/::rest` | `admin/clients/:id/view-as` |
| `portal/dogs/:id/health-change` | `portal/report-health/:dogId` |

Normalise before comparing: collapse `-` and `/` to a single separator, drop a leading `preview/`
segment, and treat `:id`/`:dogId`/`:slug` as one wildcard token. Add an explicit `ALIASES` map at the
top of the file for pairs that normalisation cannot reach, with a comment on each.

**It compares route files, not capability.** Debtors is flagged website-only, but the app ships it as
`components/finance/DebtorsTab.tsx` inside the finance screen. A tab is not a missing feature. Where
a screen on one side is a tab on the other, that belongs in the exceptions file with that reason —
do not fake a route to satisfy the tool.

## 2. Fill in `parity-exceptions.json` honestly

Every entry needs a **reason a person would accept in six months**. "Not needed" is not a reason.

Legitimate exceptions to record now:

- `admin/finance/budget/edit` — already recorded, dense multi-row editing belongs on a large screen
- `admin/notifications`, `portal/add-photos/:dogId` — already recorded
- `portal/register`, `portal/verify-code`, `portal/invite-expired`, `portal/auth/confirm` — the app
  uses native auth; these are browser-only flows
- `admin/dogs/:id/pedigree/print`, `portal/dogs/:id/pedigree/print` — A4 print stylesheet. Printing
  from a phone is not a workflow anyone has
- `admin/finance/debtors` — shipped as a tab in the app's finance screen
- `admin/settings/catalogue/*` — components, will disappear once the walker is fixed

**Do not** write exceptions for the real gaps in section 3. Those are work, not decisions.

## 3. What is genuinely missing, and must stay flagged

Leave these failing until they are built. They are the honest backlog:

**App is missing:** `admin/contacts`, `admin/contacts/:id`, `admin/contacts/duplicates`,
`admin/documents/unlabelled`, `admin/documents/pending`, `admin/media/pending`,
`admin/dogs/unallocated`, `admin/issues`, `admin/follow-ups/health`, `admin/marketing/pages`,
`admin/training/guides`, `admin/training/journey/:dogId`, `admin/quotes/:id/edit`, and the ability to
**create** a sale agreement (it can read and send, not create).

**Website is missing:** `admin/settings/social`, `portal/groups`, `portal/litters/:id/waitlist`,
`portal/training/bookings`, `portal/training/request`, `admin/breeding/plans/:id/step`.

`admin/settings/quote-lapse` is a shape difference, not a gap — the app gave it a dedicated screen,
the website put the same fields in general Settings. Record it as an exception with that reason.

## 4. Make it block — this is the part that matters

A checker nobody runs is a checker that does not exist.

- Add `npm run parity` to **both** repos, calling the script with `--strict`.
- Wire `--strict` into **`npm run preflight`** in both repos, so it runs on the same command Cursor
  already runs before every commit.
- Add it to the GitHub Actions workflow as its own step, so it fails a PR rather than a local run
  someone can skip.
- The failure message must name the missing screens and point at `parity-exceptions.json`, so the
  person who broke it knows the two ways out: build the other side, or record why not.

**The exit code is the whole point.** A report that prints and returns 0 is what we have now, and it
has been ignored for two weeks while the gap grew.

---

## Rules
- Do not build any of the missing screens in this prompt. This is about knowing the truth, not
  closing it. Section 3 is a list, not a task.
- Do not add an exception to make a number go down. Every exception is a decision someone has to
  defend later.
- Both repos. TypeScript/Node strict where it applies. No file over 300 lines.

## Verify — paste output, not descriptions
- [ ] `node scripts/check-parity.mjs` — paste the full output. The count must be **materially lower
      than 56**, and every remaining item must be from section 3.
- [ ] Paste `parity-exceptions.json` in full so Matt can read every reason.
- [ ] Confirm no component files (`RegisterForm`, `OpenAccountButton`, `CatalogueItemEditor`) appear
      in the report at all.
- [ ] Confirm the five aliased pairs in section 1 are now matched, not flagged.
- [ ] Run `npm run preflight` in both repos and paste the parity step's output.
- [ ] **Deliberately break it**: add a throwaway route to the website only, run `npm run parity`,
      confirm it **exits 1** and names that route. Paste the exit code. Then remove the route.
- [ ] Paste the GitHub Actions step definition.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145`.

## Commit
Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
