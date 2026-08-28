# CURSOR PROMPT — Client portal: a puppy's parents appear only once the client is committed to that breeding

**Scope: the CLIENT PORTAL.** Everything in this task is what a signed-in buyer sees at
`/portal/...` on the website, and the same screens in the app. **Nothing here changes the admin
side, and nothing here changes the public website.**

Admin already sees every dog, every pedigree and every document — that is not in question and must
not be altered. This is solely about **what a paying client is shown about the breeding behind their
puppy, and when.**

A buyer sees nothing about the breeding until they are tied to a specific litter or a specific
puppy. **At that point, their portal shows the sire and dam — with pedigree, photos and papers.**

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`.
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Verified live — build on these, do not re-derive

| Fact | Value |
|---|---|
| Dogs in the system | **175** |
| Dogs with an `owner_id` set | **0** — nothing is allocated to anyone yet |
| `pedigree_ancestors` rows | 346, across **13 dogs** — all breeding stock |
| Odessa | 14 ancestors · 4 media · 3 documents |
| Santini | 22 ancestors · 14 media · 12 documents |
| Jocelyn Makenzie | stage `deposit_paid`, **no dog allocated** — her puppy is not born |

**These already exist — reuse them, do not write replacements:**

- RPCs `my_dog_ids()`, `my_dog_parent_ids()`, `my_dog_lineage()`
- `src/lib/portal/lineage.ts`, `src/lib/portal/dogs.ts`
- `LineageParentCard.tsx`, `LineageDocuments.tsx`, `PublicDogPedigreeSection.tsx`
- `/portal/dogs/[id]` already renders `DogLineage`, `LineageDocuments` and `PublicDogPedigreeSection`

**Do not touch** `src/lib/portal/dogs.ts` — see the do-not-modify list at the end.

---

## 1 · The rule — two ways in, one way out

A client sees breeding-stock detail through **exactly two** doors:

| Condition | What they see |
|---|---|
| `dogs.owner_id` = them, **or** `waiting_list.assigned_dog_id` set | Their puppy **and** its sire and dam, with pedigree |
| `waiting_list.assigned_litter_id` set, no puppy yet | **That litter's sire and dam**, with pedigree. No puppy. |
| Neither | **Nothing.** No parents, no pedigree, no breeding stock. Not a teaser, not a blurred card. |

**Being on the waiting list is not enough — it must be a *specific* litter.** A general enquiry, an
approved application, or "reserved" with no litter attached earns nothing.

Verified live, and these are your test cases:

```
Jocelyn Makenzie   deposit_paid   assigned_litter = Odessa × Santini    ← qualifies
Nicolas Hohls      reserved       assigned_litter = Claire × Santini    ← qualifies
Deon Vlok          reserved       assigned_litter = Claire × Santini    ← qualifies, no deposit
Timothy Hastie     application    none                                  ← sees nothing
Reef Scott         approved       none                                  ← sees nothing
Felicia Nell       quote_sent     none                                  ← sees nothing
Dwayne             quote_sent     none                                  ← sees nothing
Miles Marshall     reserved       none                                  ← sees nothing
Mary-Jane          reserved       none, R10 000 deposit                 ← sees nothing
Delano Van Rooyen  reserved       none                                  ← sees nothing
```

**Note Mary-Jane: a paid deposit with no litter assigned sees nothing.** Money is not the gate —
the named pairing is. Do not add a deposit-based shortcut.

**This is commercial, not cosmetic.** Bloodline detail is what the buyer is paying for, and Matt
decides when it is given. Assigning a litter is that decision, made explicitly.

**Enforce it in RLS, not in the UI.** A client who guesses a parent's dog id must be refused by the
database. `my_dog_parent_ids()` already exists — extend the same idea to cover the
`assigned_litter_id` route, so both doors are enforced in one place rather than one in SQL and one
in a React component. **Two definitions of "may this person see this dog" will drift, and the drift
will be silent.**

## 2 · A puppy never has its own pedigree — it inherits one

**`pedigree_ancestors` holds rows for breeding stock only** — 13 dogs, all parents and grandparents.
A puppy will never have its own row, and nobody is going to type one for every puppy sold.

So the puppy's page must **resolve its pedigree through its sire and dam**, not look for one on the
puppy record. A page that queries `pedigree_ancestors` for the puppy's own id will always render
empty, and will look broken on the very screen a buyer most wants to read.

Presented from the puppy's point of view:

```
CENDRA · born 26 Sep 2026 · brown & tan female

  Sire   Santini      [photo]  → pedigree, hips/elbows, titles
  Dam    Odessa       [photo]  → pedigree, hips/elbows, titles

  Full pedigree ▸   (expands to the parents' ancestors, presented as the puppy's own)
```

**Where a parent has no pedigree loaded, say so plainly** — *"Pedigree not yet recorded"* — rather
than rendering an empty tree. Only 13 of 175 dogs have one, so this will happen.

## 3 · What shows for each parent

Use the data that exists. Do not invent fields.

- **Photos** from `dog_media` where `is_public` — Santini has 14, Odessa 4
- **Pedigree** from `pedigree_ancestors`, presented as the puppy's lineage
- **Documents** from `documents` where `entity_type = 'dog'` — Santini has 12, Odessa 3. **Only health and registration papers.** Never anything client-scoped or private; the three-tier document rule already governs this.
- **Health tests** from `health_tests` where present. Both parents currently have **0 rows** — so build the section to handle empty, and do not fake it.

**Registered names matter here.** A buyer reading a pedigree wants the registered name, not the
kennel call-name. Show both where they differ.

## 4 · The moment of allocation

When Matt allocates a puppy to a client, the parents appear on the client's next visit. **Notify
them** — this is the good news moment of the entire purchase.

Reuse the existing push and notification path. Something like: *"Your puppy has been allocated. You
can now see her parents, pedigree and progress."*

**Never auto-email the client.** Matt has a standing rule: alerts go to Matt; messages to clients are
sent by Matt. A push notification into the app they installed is fine; an email is not.

## 5 · The two waiting states read very differently

### On a specific litter, puppy not yet born — Jocelyn today

She has a named pairing, so she gets the parents now. This is the screen that justifies her deposit:

```
YOUR LITTER — Odessa × Santini
Due 26 September · collection planned for 6 December

  Sire   Santini   [photo]  → pedigree, papers
  Dam    Odessa    [photo]  → pedigree, papers

Your puppy has not been chosen yet. Once she is allocated to you,
her photos, weights, vaccinations and progress appear here.
```

### On no specific litter — Mary-Jane, Miles, Felicia and the rest

No parents, no pedigree, no litter name. Say where they stand and nothing more:

```
You are on the waiting list.
We will be in touch as soon as a litter is matched to you.
```

**Do not name a sire, dam or litter on this screen, and do not hint at one.** Seven of your ten
waiting-list clients are in this state, and one of them has paid a deposit — the wording has to be
warm without promising a pairing that has not been decided.

---

## The app

Same rule, same gate, same inheritance. **Test it from the app** — the app reads the same RPCs, so
the RLS gate covers it, but confirm the pedigree renders and the pre-allocation message shows.

## Rules

- No allocation, no parents. Enforced in RLS, not the UI.
- Pedigree resolves through sire and dam. Never look for one on the puppy.
- Missing pedigree says "not yet recorded". Never an empty tree.
- Only health and registration documents cross to the client. Never private or client-scoped ones.
- Push on allocation. **Never an automatic email.**
- Reuse `my_dog_ids()`, `my_dog_parent_ids()`, `my_dog_lineage()` and the existing lineage components.
- Never revoke `EXECUTE` on `is_admin()` or `is_trainer_or_above()`.
- No file over 300 lines. Regenerate types in **both** repos with `Set-Content -Encoding utf8`, never `>`.

## Verify — paste output, not descriptions

Nothing is allocated today, so **create a test allocation, verify, then reverse it.** Say which dog
you used and confirm you reversed it.

- [ ] **Jocelyn (`40600d35-9f1e-488c-8d39-fac579fca45e`) sees Santini and Odessa today**, via her `assigned_litter_id`, with no puppy allocated. Impersonate her JWT and paste the parent rows.
- [ ] **Mary-Jane — R10 000 deposit, no `assigned_litter_id` — sees nothing.** Paste the count; it must be 0. **A deposit must not open the door.**
- [ ] Felicia, Dwayne, Miles, Delano, Timothy and Reef all see the plain waiting-list message, naming no litter.
- [ ] Clearing Jocelyn's `assigned_litter_id` immediately removes the parents from her portal. Restore it afterwards.
- [ ] Allocate a test puppy from Odessa × Santini to her. Her dog page now shows **Santini as sire and Odessa as dam**.
- [ ] The puppy's pedigree renders from the parents — paste the ancestor count, expect **14 + 22**.
- [ ] The puppy has **no** `pedigree_ancestors` row of its own. Confirm the page still renders a full pedigree.
- [ ] Santini's 14 photos and Odessa's 4 are visible; the documents shown are health and registration only — list them.
- [ ] The health-tests section renders cleanly with **0 rows**, without an error or a blank box.
- [ ] Allocate a puppy with a parent that has **no** pedigree — it says "Pedigree not yet recorded", not an empty tree.
- [ ] **A client with no allocation who requests a parent's dog id directly is refused by RLS.** Paste the query and the empty result. This is the test that matters.
- [ ] **A different client cannot see this puppy's parents.** Test with a second real account.
- [ ] Allocation fires a push, and **no email is sent**. Show the notification row and confirm no send.
- [ ] Registered name and call-name both appear where they differ.
- [ ] App: same gate, same pedigree, same pre-allocation message — test from the app.
- [ ] For each app file, `ls` the path and paste the output. **Do not rely on grep; it has returned false negatives on this filesystem.**
- [ ] The test allocation has been reversed and `dogs.owner_id` is back to its previous value.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**. App: `npx tsc --noEmit` exits 0.

### Prove it reached the remote

- [ ] `git log origin/main -1` matches `HEAD` in **both** repos. Paste both hashes.
- [ ] Vercel build succeeded. **Committing is not shipping.**

## Commit

Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder. Separate commits for: the RLS gate, pedigree inheritance, the parent cards, the
pre-allocation state, app parity.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`, `src/lib/portal/dogs.ts`,
`src/lib/portal/training.ts`, `src/lib/portal/buyerJourneySteps.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`.
