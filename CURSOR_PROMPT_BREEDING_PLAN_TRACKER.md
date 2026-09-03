# CURSOR PROMPT — Breeding plan tracker: the plan as steps, with a visible "next"

Forecasting exists. What is missing is the **thread**. The kennel's succession plan spans years and
lives in Matt's head: *breed Cleopatra to Dharka → keep the best male → raise and train him two
years → he replaces Dharka → meanwhile Hailey's next litter produces the keep-back female → she is
bred to X in 2028.* Someone new — a trainer, a family member, Matt in eighteen months — must be able
to open one screen and see **where each line stands and what happens next**, in plain language.

This is not another planner. The pairing evaluator and heat forecasts already exist. This is a
**tracker**: a named plan, a sequence of steps, each with a status and a next action.

**Repos:** `diedericksdobermann-web` and `diedericks-dobermanns` — **both**. Internal/admin only —
no portal or public surface.
**Supabase:** `nlmwxodvquwbjinhhbmr`. Brand tokens as everywhere: `#111008 / #1C1A0E / #C4A35A /
#F5F0E8`, Cinzel/Lato.
**Migration number: check what is free first.** `0142`–`0144` were taken this week; `0145`/`0146`
may be claimed by other prompts in flight. `ls` both repos' migration folders and take the next gap.

---

## Data model

```sql
create table public.breeding_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,                        -- "Line A — Dharka succession"
  objective text not null,                   -- one plain sentence: what this line is for
  status text not null default 'active'
    check (status in ('active','paused','completed','abandoned')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.breeding_plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.breeding_plans(id) on delete cascade,
  step_order integer not null,

  -- Plain language, written for someone who knows nothing.
  title text not null,                       -- "Breed Cleopatra to Dharka (AI)"
  detail text,                               -- why, and what success looks like

  step_type text not null check (step_type in
    ('mating','whelp','select_keeper','raise','train','health_test','breed_next','retire','other')),

  status text not null default 'planned'
    check (status in ('planned','ready','in_progress','done','blocked','skipped')),

  -- Links to the live records so status can follow reality.
  dam_id uuid references public.dogs(id) on delete set null,
  sire_id uuid references public.dogs(id) on delete set null,
  litter_id uuid references public.litters(id) on delete set null,
  heat_cycle_id uuid references public.heat_cycles(id) on delete set null,
  result_dog_id uuid references public.dogs(id) on delete set null,  -- the keeper, once chosen

  -- Timing is seasons and years here, not appointments.
  expected_start date,
  expected_end date,
  actual_at date,

  blocked_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, step_order)
);
```

RLS: `is_trainer_or_above()` read, `is_admin()` write. No anon, no client.

### Status follows reality where it can

Do not build a second place Matt must remember to update. Where a step is linked to a live record,
derive:

- `mating` step with a `heat_cycle_id` → `in_progress` when the cycle records a mating/AI,
  `done` when the linked litter is whelped.
- `whelp` step → `done` when `litters.actual_whelp_date` is set.
- `select_keeper` → `done` when `result_dog_id` is set.
- `health_test` → `done` when the linked dog has the named result recorded.

Derive in a **view or query helper, not triggers** — the write path for heats and litters must not
grow side effects. Manual steps (`raise`, `train`, `breed_next` years out) are updated by hand and
that is fine. A derived status must still be overridable with a note, because reality is messier
than links.

## The screen — Breeding › Plan tracker

One page per plan, all plans listed on entry, "what needs attention" at the top.

- **Timeline layout**, vertical, one card per step: number, title, status pill, the dogs involved
  (with their card photos), expected window, and — on the step after the last `done` — a highlighted
  **"NEXT"** marker with the plain-language action.
- **The reader test drives everything.** No jargon, no abbreviations in titles. "Take Hailey's
  female puppy from the 2027 litter and pair her with a male to be selected" is right; "H2 F1
  pairing TBD" is wrong.
- A dashboard card, "Breeding programme — next steps", listing the NEXT step of every active plan.
  This is the answer to "what happens next" without opening anything.
- Blocked steps show the reason in red. A plan with a blocked step shows it on the dashboard card.
- Editing: add/insert/reorder/skip steps. Skipped stays visible, struck through — the history of
  the plan changing **is** information.

## Seed the real plan

After the schema lands, seed the actual current state as plan 1 (statuses reflecting today):

1. **[done]** Cleopatra in heat, AI to Dharka confirmed (heat 25 Aug 2026, ovulation ~5 Sep).
2. **[in_progress]** Mating window — AI Cleopatra × Dharka, first date to be recorded.
3. **[planned]** Whelp expected ~7 Nov 2026.
4. **[planned]** Select keep-back **male** at 7–8 weeks (structure + temperament first).
5. **[planned]** Raise and title him, 2027–2028; he succeeds Dharka (Dharka ~1 breeding year left).
6. **[planned]** Parallel: Hailey's next litter → keep-back **female**, pairing to be decided.

Get the details from the live `heat_cycles` and `litters` rows rather than trusting this file —
if the mating date has been recorded by the time you run, step 2 is `done`.

## Rules
- No file over 300 lines. TypeScript strict. Regenerate types after the migration.
- Migration byte-identical in both repos. App parity — both, or it is not done.
- Do not touch the write paths of heats, litters or dogs. This feature reads them.
- `ls` app files you touch and paste output; grep has false-negatived on this filesystem.

## Verify — paste output, not descriptions
- [ ] Screenshot the seeded plan. Have someone who has never seen the breeding programme read it
      aloud — that is the acceptance test. In lieu of that: paste the step titles and confirm each
      is a full plain-English sentence.
- [ ] Record a test mating date on a **test** heat row → linked step flips to done without a manual
      edit. Show before/after. Then delete the test data.
- [ ] Dashboard card shows one NEXT per active plan. Screenshot.
- [ ] A client JWT gets zero rows from both tables. Paste the empty results.
- [ ] `npx tsc --noEmit` clean both repos; `npm run preflight` passes; app screen on a device.
- [ ] `git log origin/main -1` matches `HEAD` in both repos — paste hashes. Vercel **Ready** on
      `diedericksdobermanns-web-v145`.

Do not modify: `src/lib/analytics/visitorHash.ts`, `src/components/layout/WhatsAppButton.tsx`,
`scripts/import-dbp-contacts.mjs`, `scripts/send-portal-invite-emails.mjs`.
