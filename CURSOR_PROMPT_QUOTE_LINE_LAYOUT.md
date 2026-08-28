# CURSOR PROMPT — Fix the quote line-item row: it is unreadable and unlabelled

The quote builder's line-item row is broken on screen. Two faults, one visual and one worse.

**Repo:** `diedericksdobermann-web` (and the app equivalent — see below).
Brand: bg `#111008`, surface `#1C1A0E`, gold `#C4A35A`, text `#F5F0E8`. Cinzel / Lato.

---

## Fault 1 — the row is squeezed until text renders vertically

`src/components/finance/QuoteLineItems.tsx` line ~124:

```
sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]
```

Six columns, switched on at the `sm` breakpoint (640px). But this form sits between the admin
navigation and the live preview panel, so the middle column is far narrower than the viewport.
The `auto` columns collapse to minimum content width and the item-type select renders **one
character per line** — a vertical column reading `S t a n d a r d`. The description beside it is
clipped to three characters.

The breakpoint is measuring the wrong thing. **The viewport is wide; the column is not.**

**Fix:** stop forcing one row. Use a layout that survives a narrow column:

- **Description on its own row, full width.** It is the field that needs the most space and it is now a textarea.
- **Beneath it, one row: Type · Qty · Unit price · Line total · reorder/remove.**
- Only collapse to a single row at `xl` and above, and only if the container genuinely has the width — prefer a container query over a viewport breakpoint if the project supports it, since the container is the real constraint.
- Give the select a real minimum width (`min-w-[9rem]`) so it can never wrap mid-word again. **No field may ever render text vertically.**

## Fault 2 — the fields are unlabelled, which is the more serious one

The row currently shows a dropdown, then `1`, then `20000`, with nothing saying which is which.
Matt cannot tell quantity from unit price from line total. On a document that goes to a client for
tens of thousands of rand, an unlabelled number is a mistake waiting to be sent.

**Label every field.** Small, uppercase, gold-dim, above each input, consistent with `labelClass`:

- **Type**
- **Description**
- **Qty**
- **Unit price (R)**
- **Line total** — computed, read-only, visually distinct from an input so nobody tries to type in it

On the narrow layout the labels sit above their fields. Do **not** rely on placeholders instead of
labels — a placeholder disappears the moment someone types, exactly when they most need to check
what they are filling in.

## Fault 3 — nothing shows what still needs completing

Matt's words: *"look at the lines given where i need to complete or enter details"*. He cannot see
what is outstanding.

Mark every incomplete line clearly:

- A line with no description → *"Add a description"* under the field.
- A line with no price, or price 0 where zero is not allowed → *"Set a price"* in gold.
- The delivery decision block already says *"Undecided — required before send"*. Good. **Use the same wording and the same gold treatment everywhere**, so "gold means you must act" is learned once.
- A **summary strip above the Send button**: *"2 things to complete before this quote can be sent: a price on line 1, and the delivery decision."* Click a line in that list to focus the field.

The Send control stays disabled while anything is outstanding, with the reason visible next to it —
**never a disabled button with no explanation**.

## Keep what already works

- The live **Preview** panel is correct and useful. Do not disturb it.
- **Delivery decision** defaulting and the "required before send" block are working as intended.
- `+ ADD FROM CATALOGUE` and `+ FREE-TEXT LINE` are right. Leave them.
- The `1 line · R20 000,00` running total is good — keep it, and keep it accurate as lines change.

## The app

`diedericks-dobermanns` has the same builder in a genuinely narrow viewport. Check
`components/finance/LineItemRow.tsx`: every field labelled, one field per row where needed, and the
same "what is outstanding" summary above Send. On a phone, stacked and labelled beats compact every
time.

---

## Rules

- No field may render text vertically at any width. Minimum widths on every select.
- Every input has a visible label. Placeholders are never a substitute.
- Outstanding items are stated in words, never implied by a disabled control.
- Line total is computed and not editable.
- Do not change the pricing logic, the preview, or the delivery decision behaviour — this is layout and labelling only.
- No file over 300 lines. Split the row into its own component if needed.

## Verify

- [ ] At the width in Matt's screenshot — admin nav plus form plus preview visible — the item-type select shows "Standard Puppy" on one line, horizontally.
- [ ] Narrow the browser to 800px and to 1400px: no field wraps mid-word at any width.
- [ ] Every field carries a visible label: Type, Description, Qty, Unit price, Line total.
- [ ] Line total is read-only and visibly not an input.
- [ ] A line with no price shows "Set a price" and blocks Send.
- [ ] The summary above Send names every outstanding item, including the delivery decision.
- [ ] Clicking an item in that summary focuses the field it refers to.
- [ ] Send is never disabled without the reason shown beside it.
- [ ] Adding and removing lines keeps the running total correct.
- [ ] The app's line row is fully labelled and readable on a phone.
- [ ] Website: `npx tsc --noEmit` exits 0 **and `npx next build` succeeds**.
- [ ] App: `npx tsc --noEmit` exits 0.

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
