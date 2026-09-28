# Cursor Prompt — Tell the person their expense saved

## Do this first

1. Read the whole file before changing anything.
2. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
3. **No migration.** Nothing is wrong with the data.
4. `npx tsc --noEmit` in both repos when done. Paste the real output.

---

## What is happening, in Felicia's words

> *"It looks like it's saying it did not load — but when I log out and back in again, it did load."*

**The expense saves correctly every time.** I checked the live database: there are **no duplicate
expenses at all**, which also tells us she is not saving twice out of frustration. She is entering
a real expense, being shown something that reads as failure, and walking away.

## Why

`src/components/finance/CreateExpenseForm.tsx`, lines 95–101:

```tsx
const [error, setError] = useState<string | null>(null);
const [busy, setBusy] = useState(false);

const goList = () => {
  router.push("/admin/finance/expenses");
  router.refresh();
};
```

**There is an error state and no success state.** On success the form simply navigates away.

And the navigation is the problem. `router.push` moves to the expenses list, which the Next.js App
Router may render from its **client-side cache** — the copy it already had, without the new row.
`router.refresh()` is fired immediately after, but it does not block the navigation and does not
wait. On a phone, on a slow connection, the cached list wins the race.

So Felicia lands on a list that does not contain what she just typed. The only reasonable
conclusion is that it failed.

**Logging out clears the client router cache. That is why it appears on the way back in** — and it
is the detail that confirms this diagnosis rather than a permissions or database problem.

The same pattern will be in the app. Check it.

---

## Task 1 — Confirm the save, on the screen, before going anywhere

Add a success state alongside the error state. When the server action returns without an error:

1. **Show a clear confirmation where she is already looking** — *"Saved. R11,200.00 — Agrimark,
   28 Aug 2026."* Repeat the amount and the supplier back to her. A bare "Saved" tick is weaker: it
   confirms that something happened, not that the right thing happened.
2. **Wait for `router.refresh()` to settle, then navigate.** Await it, or navigate only once the
   list is known to be fresh. Do not fire and forget.
3. If she stays on the page, leave the confirmation visible for a few seconds — long enough to read
   on a phone with one hand.

**Never navigate away as the only signal of success.** That is the whole fault here: an absence of
error was being used to mean success, and the person never saw either.

## Task 2 — Offer the obvious next action

She is usually capturing a batch off a pile of invoices. After a save, offer **"Add another"**
alongside returning to the list — keeping the date, supplier and payment account, clearing the
description and amount. That is the shape of the actual job and it removes four taps per invoice.

## Task 3 — Make a failure unmistakable, and never lose her typing

The current error path sets a message but the form keeps its values, which is right. Keep that, and
make sure it is true on a **network** failure as well as a validation one — not only on the
`setError` paths already written.

If the save fails, the message must say what to do: *"Not saved — check your connection and press
Save again. Nothing has been lost."*

## Task 4 — The same fault, everywhere else

`goList()` — push then refresh, with no success state — is a pattern. **Grep both repos for it**
and report every screen that does the same thing. Likely candidates: invoices, payments, quotes,
health records, dog edits.

Fix the finance ones in this pass. **List the others and stop** — Matt should decide whether they
go in the same change or a later one.

---

## Do not

- Do not change the server action. `revalidateFinance()` already revalidates the right paths; the
  fault is entirely on the client.
- Do not add a global toast library for this. A confirmation in the form is clearer and one less
  dependency.
- Do not clear the form on error.
- Do not create test expenses in production. Use a preview environment.

---

## Report

1. Screenshot of the confirmation after saving, showing the amount and supplier echoed back.
2. Screenshot of "Add another" with the date and supplier retained.
3. Screenshot of a failed save — network off — with the values still on screen.
4. **Proof the list is fresh:** save an expense, arrive at the list, and show the new row present
   without any manual reload. This is the actual bug; show it fixed.
5. The grep result for the `push`-then-`refresh`-with-no-success pattern, listing every other
   screen that has it.
6. The same on the app.
7. `npx tsc --noEmit` clean in both repos.

**Matt:** once this is live, ask Felicia to enter one expense and tell you what she sees. Her
answer is the test — not the screenshots.
