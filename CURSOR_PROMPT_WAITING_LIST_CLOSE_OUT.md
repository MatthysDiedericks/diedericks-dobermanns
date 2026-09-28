# Cursor Prompt — Nobody ever leaves the waiting list

## Do this first

1. Repos: `diedericksdobermann-web` and `diedericks-dobermanns`.
2. `npx tsc --noEmit` in both when done. Paste the real output.

---

## The problem

Matt opened the waiting list and found clients who collected their puppies months ago still sitting
there, with a growing counter telling him they had been **waiting 116 days**.

Counted live, 29 Sep 2026, before I closed three of them by hand:

```
waiting_list entries                      20
entries at pipeline_stage handover_complete  0
entries with an assigned dog                 1  of 20
entries at 'reserved' with no dog, no invoice, untouched since 21 Jul  4
```

### The terminal stage already exists and has never been used

```sql
check (pipeline_stage in (
  'enquiry','application','approved','quote_sent','deposit_paid',
  'matched','reserved','handover_complete','on_hold','do_not_sell','withdrawn'))
```

`handover_complete` is right there. **Zero rows have ever reached it.** The pipeline was built with an
exit and nothing was ever wired to walk through it.

### So there are three faults, not one

1. **Nothing sets `handover_complete`.** Completing a sale — handing the puppy over, marking the dog
   sold, settling the balance invoice — never touches the waiting list entry.
2. **The list does not filter.** A closed entry would still appear, because the query does not exclude
   terminal stages.
3. **The day counter measures the wrong thing.** It is days since `date_added`, regardless of stage.
   For someone served in July it is meaningless, and it is the number Matt is being asked to act on.

I have closed **Miles Marshall, Deon Vlok and Delano Van Rooyen** by hand, with a backup in
`dbp_import.waiting_list_changes`. That is the symptom cleared. This prompt is the cause.

---

## Task

### 1. Completing a placement closes the waiting list entry

Wherever a dog is handed to a client — the fulfilment pipeline, marking a dog `sold`, allocating a
puppy to a buyer — find the matching waiting list entry and move it to `handover_complete` with
`status = 'removed'`, stamping `stage_updated_at` and a `stage_change_note` naming what closed it.

**Match on the link, never on the name.** `assigned_dog_id`, `client_id`, `application_id` or
`quote_id`. If no link exists, **do not guess from a name match** — that is the rule that keeps one
client's dog off another client's record. Leave it open and let the reconciliation list below catch
it.

### 2. The list shows people who are actually waiting

Exclude `handover_complete`, `withdrawn` and `do_not_sell` from the waiting list by default. A filter
can bring them back — Matt will want to look up a past placement — but they are not "waiting".

Show the excluded count as a line, not a hidden fact: *"16 waiting · 4 closed"*.

### 3. The counter has to mean something

Today's number is days since `date_added` and it keeps running after the person has been served.

Change it to **days since the stage last changed**, from `stage_updated_at`, labelled for the stage
it is in:

```
Quote sent      12 days ago
Deposit paid    27 days ago
Reserved         5 days ago
```

That answers the question Matt is actually asking — *who is stuck* — rather than *who joined
longest ago*. Someone at `deposit_paid` for 60 days is a problem; someone who joined 116 days ago and
moved stage yesterday is not.

Keep total days on the list as a secondary figure if it is useful, but it is not the headline.

**`stage_updated_at` is unreliable on old rows** — four entries all carry 21 Jul 2026 from a bulk
import. Fall back to `date_added` where `stage_updated_at` is null or matches the import date, and
say in the UI which one is being shown.

### 4. Catch the ones that slip through

Add to the waiting list screen a small reconciliation block:

```
Reserved for more than 30 days with no assigned dog     N
Deposit paid with no assigned dog                       N
Closed but the dog was never linked                     N
```

Each expands to the rows. The first is exactly the state Matt found this morning, and it should have
been visible on the screen rather than discovered by eye.

### 5. Link the dog, retrospectively

19 of 20 entries have no `assigned_dog_id`, including people who have their puppy. Add an
**"Link puppy"** action on each entry: pick a dog from the litter they were allocated to, or search
all sold dogs. One click, stored, done.

Do not build an automatic matcher for this. Matt knows who got which puppy; the system does not, and
guessing is how records get corrupted.

---

## Tests

- Marking a dog sold to a linked client closes their waiting list entry
- Closing on a name match is impossible — only linked identifiers close an entry
- The default list excludes `handover_complete`, `withdrawn`, `do_not_sell`
- The counter reads from `stage_updated_at` and falls back to `date_added` where it is the import date
- The reconciliation block counts the three conditions correctly
- Linking a puppy to a closed entry works and does not reopen it

---

## Do not

- Do not delete waiting list entries. `handover_complete` is history worth keeping — it is how Matt
  answers "when did that client get their dog".
- Do not match a client to a dog by name.
- Do not auto-assign dogs to the 19 unlinked entries.
- Do not remove the day counter. Make it measure the right thing.
- Do not create test waiting list entries in production.

---

## Report

1. Every place that completes a placement, and the close-out you added to each.
2. The list with its default filter and the "16 waiting · 4 closed" line.
3. The counter reading from `stage_updated_at`, shown on a row with a real stage change and on one of
   the 21 Jul import rows.
4. The reconciliation block with live counts.
5. The Link puppy action working on one entry.
6. `npx tsc --noEmit` clean in both repos.
