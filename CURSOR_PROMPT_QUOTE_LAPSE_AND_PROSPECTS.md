# CURSOR PROMPT — Unpaid quotes must lapse on their own, and free the puppy

A buyer applies, is approved, is quoted — and then goes quiet. Today nothing happens. The quote
sits open forever, the puppy stays `reserved` against a sale that is not happening, and a buyer who
**has** paid sits behind them. That is the problem to solve: not the reminder, the **release**.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand `#111008 / #1C1A0E / #C4A35A / #F5F0E8`, Cinzel/Lato.
**Next free migration: `0150`.** (`0148` payment-capture fixes and `0149` lapse-hold columns are
both already applied live and present in both repos.)

---

## The ladder

Measured from **`quotes.sent_at`**, not `created_at`. A quote nobody sent is not a quote the buyer
has failed to answer. `sent_at` is reliably stamped — all 11 currently-sent quotes have it.

| Day | What happens | Who is told |
|---|---|---|
| 30 | First reminder | Buyer |
| 60 | Final notice — "this lapses on {{date}}" | Buyer |
| 90 | Quote lapses, puppy released, contact becomes a prospect | Matt |

**Day 90 is not arbitrary — it is already the quote's own life.** `app_settings.quote_validity_days`
is `90`, so every quote already carries `valid_until = sent_at + 90 days` printed on it. Lapsing on
day 90 means the automation enforces the term the buyer was already given in writing, rather than
inventing a shorter one behind it. Where `valid_until` is present and differs from day 90,
**`valid_until` wins** — the document the buyer holds is the promise; the setting is only the default
used to compute it.

**Do not send anything on day 90.** By then the buyer has had two reminders and made a decision by
silence. A third message announcing that we have cancelled them reads as a rebuke and burns a lead
we are about to put into the prospect list. Matt is told; the buyer is not.

**Nothing in the current book trips on the first run.** The oldest sent quote is 22 days out
(DD-1133, DD-1134). No backlog guard is needed — 30 days gives it for free. Verify this yourself
before shipping; if it is no longer true, say so rather than mailing eleven people at once.

---

## Four things that make this safe

### 0. The hold already exists — honour it before anything else

Migration `0149` is **already applied live** and adds `quotes.lapse_hold_until`,
`lapse_hold_reason` and `lapse_hold_set_by`. **While `lapse_hold_until` is in the future, the ladder
must skip that quote completely** — no reminder, no final notice, no expiry, no dog release.

This is not a nice-to-have. **DD-1141 (Timothy Hastie, R55 000, sent 20 Aug 2026) is on hold until
18 Nov 2026** because Matt has agreed to wait while the buyer's funds clear. Check the hold first,
before the day count, before everything.

It is a date and not a boolean on purpose: a boolean hold gets set once and never cleared, and six
months later nobody remembers why a quote is exempt. A date expires and forces the question again.

Build the admin side of it too:

- **Hold this quote** on the quote detail screen — a date picker and a required reason. Refuse to
  save a hold with no reason; the reason has to outlive the person who set it.
- Show the hold plainly on the quotes list — a chip reading **On hold until 18 Nov**, not a silent
  exemption. An invisible exemption is how a puppy sits blocked for a year.
- A held quote must still appear in the "Lapsing soon" view, marked as held, so Matt sees what he is
  carrying rather than losing it from the screen entirely.

### 1. It must skip anyone who is actually paying

Before any reminder or lapse, check the buyer has **no payment of any kind**. Reuse
`client_has_payment()` — it already resolves `client_id` ↔ `contact_id` both ways and checks
`invoices`, `invoice_payments`, `payments` and `payment_orders`. Do not write a second version.

Also skip where:

- the quote has a `converted_invoice_id` — it has moved on
- a `proof_of_payment` document exists against the quote, **even unverified**. Someone who has
  uploaded a slip is mid-transaction, and a system that cancels them while Matt is checking the bank
  is worse than no system at all
- the buyer replied. There is no reply field today, so add `quotes.last_client_activity_at` and
  stamp it when they open the quote in the portal, accept it, or upload a proof. **Any activity
  restarts the clock from that moment** — silence is what lapses a quote, not elapsed time alone

### 2. It must release the puppy — this is the point

On lapse, for every `quote_items` row with `subject_kind = 'dog'`, set that dog back to
`available` **only if it is currently `reserved` and no other live quote or invoice claims it**.
Never touch a dog that is `sold`, `deceased`, or reserved against somebody else. Mirror the guards in
`src/lib/finance/reserveQuotedDogs.ts` — that file is the reservation side of the same coin and its
rules were written carefully.

Write the release as a SQL function so it cannot be skipped by a caller that forgets, and log every
released dog to `audit_log` with the quote number that freed it. When Matt asks in three weeks why a
puppy came back onto the list, that row is the answer.

### 3. Use `expired`, not `cancelled`

`quotes_status_check` already allows both, and `expired` is currently unused. Keep them distinct:

- **`expired`** — the system lapsed it on a timer
- **`cancelled`** — a person decided

Matt cancelled duplicates by hand on 1 Sep. If the automation also writes `cancelled`, those two
kinds of event become indistinguishable in the ledger forever.

---

## What to build

### Migration `0150`

```sql
alter table public.quotes
  add column last_client_activity_at   timestamptz,
  add column reminder_first_sent_at    timestamptz,
  add column reminder_final_sent_at    timestamptz,
  add column lapsed_at                 timestamptz,
  add column lapse_reason              text;

comment on column public.quotes.last_client_activity_at is
  'Set when the buyer opens, accepts or uploads proof against this quote. Resets
   the lapse clock — silence is what lapses a quote, not elapsed time alone.';
```

**Name the stamps `first` and `final`, not `30d` and `60d`.** The day counts are settings and Matt
will change them; a column called `reminder_30d_sent_at` becomes a lie the first time he moves the
ladder to 45.

Settings so Matt can change the ladder without a deploy — add to `app_settings`:

```
quote_reminder_first_days = 30
quote_reminder_final_days = 60
quote_lapse_days          = 90
quote_lapse_enabled       = true
```

`quote_validity_days` is already `90` and governs the same promise as `quote_lapse_days`. Say so on
the settings screen. Do not let the two drift apart silently, or the system will lapse a quote the
buyer was told in writing was still live.

Read them with sane fallbacks. **`quote_lapse_enabled` is a kill switch** — if Matt sees something
going wrong at 07:45 he must be able to stop it from the admin without waiting for a deploy.

### The daily job

Follow the existing pattern exactly — `generate-recurring-invoices-daily` is the closest model: a
plain SQL function called from `pg_cron`.

```sql
select public.process_quote_lapse_ladder();
```

Schedule at `45 7 * * *`, after recurring invoices (07:30) so the two never contend.

The function must be **idempotent** — running it twice in a day must not send two reminders. The
`reminder_first_sent_at` / `reminder_final_sent_at` stamps are what guarantee that; check them, do
not just check the day count.

### The two reminders

Send to the buyer via the existing `send-email` edge function and log to `notifications_log`, the
same way `sendApplicationReceivedEmail` does. Do not invent a new mail path.

**Never send to a contact with `marketing_opt_out_at` set**, and never send twice for the same tier.

**These come from Matt personally — first person, signed "Matt", not "the Diedericks Dobermanns
team".** That is his decision and it matters to how this is built: an automated mail carrying his
name must behave like a mail he wrote.

- `reply_to` must be a mailbox Matt actually reads — use `app_settings.quote_email`
  (`diedericksdobermanns@gmail.com`), never a no-reply address. The whole point of the day-30 note is
  to make replying easy; bouncing the reply destroys it.
- No marketing footer, no unsubscribe block, no newsletter styling. This is correspondence about a
  transaction the buyer entered into, not a campaign. Dressing it as marketing invites it into a
  spam folder and misrepresents what it is.
- Plain and short. The existing quote email's letterhead is right; a hero image is not.

Use the real copy below. Do not paraphrase it — Matt approved these words.

**Day 30 — subject: `Your quotation {{quote_number}} — still open`**

> Good morning {{first_name}},
>
> A quick note on quotation **{{quote_number}}**, sent on {{sent_date}}.
>
> It's still open and your place is still yours. Nothing has been given away.
>
> A deposit of **{{deposit_amount}}** is what secures it. Until that reflects, the puppy stays
> available to other applicants — that isn't pressure, it's just how we keep things fair to everyone
> waiting.
>
> You can view the quotation and upload your proof of payment in your portal:
> {{portal_link}}
>
> If your circumstances have changed, tell me. I'd far rather hold it for you a while longer, or
> release it cleanly, than leave you wondering. Either is fine — just let me know.
>
> Matt
> Diedericks Dobermanns

**Day 60 — subject: `Your quotation {{quote_number}} lapses on {{lapse_date}}`**

> Good morning {{first_name}},
>
> This is the last note I'll send on this one.
>
> Quotation **{{quote_number}}** lapses on **{{lapse_date}}**, and {{dog_name}} goes back onto the
> available list that day.
>
> If you still want him, a deposit of {{deposit_amount}} before then keeps him:
> {{portal_link}}
>
> If not, there are genuinely no hard feelings — and I'll keep you on the list for future litters.
>
> Matt
> Diedericks Dobermanns

Merge fields:

- `{{first_name}}` — the contact's given name only, never the full name. A mail from Matt personally
  does not open "Good morning Jacoline Pretorius".
- `{{deposit_amount}}` — read `app_settings.quote_deposit_amount` (**already seeded live, value
  `10000`**) and format it as `R10 000`. **Do not parse a figure out of `quote_terms`.** That setting
  is prose written for the buyer and its wording will change; scraping a rand value out of a sentence
  is a bug waiting for the day someone rewrites the sentence. If `quote_deposit_amount` is missing or
  not a number, print "a deposit" rather than a wrong figure.
- `{{dog_name}}` — falls back to "the puppy" when no specific dog is on the quote. A litter or
  unallocated line has no name to use, and most future-litter quotes are in exactly that state.

**Do not mention the litter's go-home date.** It was considered and Matt ruled it out: every buyer in
the current litter has paid, so the only people who would ever see that line are future buyers for
whom it would read as pressure rather than information.

State the actual date, never "in 30 days". People act on dates.

### Day 90 — lapse

In one transaction:

1. `quotes.status = 'expired'`, stamp `lapsed_at`, set `lapse_reason` to a readable sentence.
2. Release the dogs, per rule 2 above.
3. Set the linked application back to `approved` and add a note. **Do not archive it and do not set
   it to `declined`.** Matt approved this person; if they come back with money next month he should
   not have to re-screen them. The word Matt used was "reapply" — what he means is *pay again from
   the start*, not *be vetted again from scratch*.
4. Remove their `waiting_list` row only if it has no payment against it.
   `trg_waiting_list_require_payment` means an unpaid row should not have existed anyway, but check
   rather than assume.
5. Notify **Matt** — one email listing every quote that lapsed that morning and every puppy that
   came back. One email, not one per quote.

### Day 90 — the prospect move

`contacts.contact_type` already has a **`prospect`** value (5 contacts already use it), and
`contacts` already carries `marketing_opt_in`, `marketing_opt_in_at`, `marketing_opt_in_source` and
`marketing_opt_out_at`. **Do not create a new table or a new type.** Set:

```
contact_type = 'prospect'
tags         = tags || 'lapsed-quote'
source_ref   = the lapsed quote number
```

**Read this next part carefully — it is the one that can cause real trouble.**

Becoming a `prospect` must **not** set `marketing_opt_in`. The application form does not ask for
marketing consent — the only consent field on `applications` is `agreed_to_terms`, which is consent
to the terms of an application, not permission to market to them. Under POPIA, treating a lapsed
enquiry as marketing consent because they once filled in a form is exactly the inference the Act
does not allow.

So they land in the prospect list as a **record**, not as a mailing list member. `marketing_opt_in`
stays whatever it already was. If Matt wants to market to them, the newsletter opt-in on the website
already exists and already sets `marketing_opt_in_source` properly — that is the lawful route, and
`campaigns` / `campaign_recipients` must keep filtering on `marketing_opt_in = true`.

Put this reasoning in a comment on the function. The next person to touch it will be tempted to
"fix" it.

### Admin visibility

- Quotes list: add **`Lapsed`** and **`Cancelled`** filter chips. Neither state has a chip today, so
  quotes in them are invisible to every filter and appear only under All — which is how two
  cancelled duplicates sat unnoticed on 1 Sep. Cancelling something and thereby hiding it is worse
  than leaving it alone.
- On each open quote row, show days since sent and which reminders have gone, so Matt can watch the
  ladder run rather than trust it.
- A dashboard card: **"Lapsing soon"** — quotes at day 60 or later, held ones included and marked.
  Matt should be able to phone someone before the system lets them go.
- App parity: the same card and the same chips.

---

## Rules

- **Both repos.** TypeScript strict, no `any`, no file over 300 lines.
- Do not touch `trg_waiting_list_require_payment`, `client_has_payment` or
  `promote_waitlist_on_payment` — all three were verified working on 1 Sep.
- Do not change `reserveQuotedDogs.ts`. Read it, mirror its guards in the release function.
- Nothing in this feature may send a **quote**, an **invoice** or a **contract**. It sends reminders
  about a quote already sent. Matt presses send on documents, always.
- `ls` every app file you touch and paste the output — grep has false-negatived on this filesystem.

## Verify — paste output, not descriptions

Use real rows, inside a transaction you roll back. **Do not leave test quotes in production** —
Cursor has previously left `VERIFY` rows on a real client's ledger on this project.

- [ ] Run the function against the book **as it stands, unmodified**. Confirm it does **nothing** —
      the oldest sent quote is 22 days out. Paste the output.
- [ ] Backdate **DD-1150** (Samantha Matos, sent 30 Aug, no payment) to `sent_at = now() - 31 days`
      in a transaction. Run. Confirm exactly one first reminder, `reminder_first_sent_at` stamped,
      status still `sent`. Roll back. Paste before and after.
- [ ] Run twice in a row on that same state. Confirm the second run sends **nothing**. This is the
      failure that would embarrass Matt in front of a client.
- [ ] Backdate the same quote to 91 days. Confirm status `expired`, `lapsed_at` set, dog released to
      `available`, contact now `prospect`. Paste the dog's status before and after.
- [ ] **Confirm `marketing_opt_in` is unchanged by the lapse.** Paste the value before and after.
- [ ] **Backdate DD-1141 (Timothy Hastie) to 120 days. Confirm the function ignores it entirely** —
      no reminder, no lapse, dog untouched — because `lapse_hold_until` is 18 Nov 2026. Then set the
      hold to a past date and confirm it lapses normally. Paste both runs.
- [ ] Take a quote that **does** have a payment (DD-1152, Ronel Emmenes, R10 000 received) and
      backdate it to 120 days. Confirm the function ignores it entirely. This and the hold test are
      the two that matter most.
- [ ] Confirm a quote whose buyer has an unverified `proof_of_payment` document is skipped.
- [ ] Confirm a dog reserved against a *different* live quote is never released.
- [ ] Set `quote_lapse_enabled = false` and confirm the function does nothing at all.
- [ ] Paste the **rendered day-30 email**, headers included, for a real buyer. Confirm: it opens
      with a first name only, the deposit amount is right, `reply_to` is
      `diedericksdobermanns@gmail.com` and not a no-reply, it is signed "Matt", and there is **no**
      marketing footer or unsubscribe block.
- [ ] Paste the rendered day-60 email showing the real lapse date and the real dog name.
- [ ] Render one for a quote with **no specific dog** and confirm `{{dog_name}}` falls back to
      "the puppy" rather than printing an empty gap or a token.
- [ ] Screenshot the Lapsed and Cancelled chips, the hold chip, and the "Lapsing soon" card, on web
      and app.
- [ ] `npx tsc --noEmit` clean in both repos; `npm run preflight` passes.

### Prove it reached the remote
- [ ] `git log origin/main -1` matches `HEAD` in **both** repos — paste both hashes.
- [ ] Vercel **Ready** on `diedericksdobermanns-web-v145` — the only project; a red build is real.
- [ ] Migration `0150` applied live, present in both repos, and the cron job visible in `cron.job`.

## Commit
Two repos, separate commits. **Website:** from `diedericksdobermann-web/`. **App:** repo root is the
**parent** folder.

Do not modify (committing is fine): `src/lib/analytics/visitorHash.ts`,
`src/components/layout/WhatsAppButton.tsx`, `scripts/import-dbp-contacts.mjs`,
`scripts/send-portal-invite-emails.mjs`.
