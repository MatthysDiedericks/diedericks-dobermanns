# Cursor Prompt — Training Timeline (Trainer Logging + Visual Timeline)

## Context

Diedericks Dobermanns app. Supabase project `nlmwxodvquwbjinhhbmr`. Brand: `#111008` bg / `#C4A35A` gold / `#F5F0E8` text, Cinzel/Lato.

Matt wants a **timeline view for dogs in training**, showing progress over the training period.

**Important finding (checked live 2026-07-28): the read side already exists but has zero data, because the write side was never built.** `training_logs` (dog_id, trainer_id, training_type, session_date, duration_minutes, milestone, progress_level, notes, video_url, created_at) already exists in the DB and is already read by `hooks/useRecords.ts` (`useTrainingLogs`) and three client-portal screens (`app/(portal)/training-updates/[dogId].tsx`, `components/portal/DogTrainingTab.tsx`, `app/(portal)/dogs/[id]/milestones.tsx`) — but there is **zero admin/trainer UI to create a training_logs row**, and no `app/(tabs)/training/` section exists at all. That's why nothing shows for clients today. Building a nicer timeline component alone will not fix this — the logging UI is the actual blocker.

This prompt has two required parts. Do not skip Task 1 — it's the prerequisite for everything else.

## Task 1 — Admin/Trainer: Log Training Session (the missing write path)

New section `app/(tabs)/training/`:
- `index.tsx` — list of dogs where `category`/`status` indicates in-training (check the existing dogs query pattern used elsewhere for this filter), each row showing name, photo thumbnail, most recent `session_date`, and a session count. Tap → detail.
- `[dogId].tsx` — dog's training detail: header (photo, name, owner name via `owner_id`/`new_owner_name`), the session history for this dog (reuse `useTrainingLogs(dogId)`), and a "+ Log Session" button (trainer/admin only — check role from existing auth pattern used elsewhere in `(tabs)`).
- `LogSessionSheet.tsx` (bottom sheet or modal, `@gorhom/bottom-sheet` per house pattern) — form fields: `training_type` (short text or a small fixed picker — check `training_session_types` table for existing values and use those as options), `session_date` (date picker, defaults today), `duration_minutes` (number), `milestone` (optional text — "reached" moments like "Off-leash recall"), `progress_level` (small fixed set, e.g. Introduced / Developing / Proficient / Mastered — confirm no existing enum constraint on the column first, match it if one exists), `notes` (multiline), `video_url` (optional — reuse the existing video upload pattern from the training video library work if one exists for uploading to storage and getting a URL back; otherwise a plain URL paste field is acceptable for v1).
- New hook `useCreateTrainingLog` (or add to `hooks/useRecords.ts` alongside the existing `useTrainingLogs`) — inserts into `training_logs` with `trainer_id` from the current authenticated user.
- RLS check: confirm `training_logs` has an INSERT policy allowing trainer/admin roles (check `is_trainer_or_above()` usage elsewhere) — if missing, add a migration for it. Do not weaken any existing SELECT policy.

## Task 2 — Migration: training start + completion estimate

`dogs` table has no columns for this today (confirmed via schema check). Add via migration:
```sql
alter table public.dogs
  add column if not exists training_start_date date,
  add column if not exists training_completion_estimate date;
```
Add both as editable fields on the admin dog edit form (wherever dog fields are currently edited) — optional, admin-only.

## Task 3 — Visual timeline component

`components/training/TrainingTimeline.tsx` — a vertical connected timeline (dot + line per entry, most recent at top or bottom — pick one and be consistent), each node showing: date, `training_type`, a `progress_level` pill (color-coded), `milestone` badge if set (visually distinct from a regular session — this is the "progress" story Matt wants to see at a glance), `notes` (truncated with expand), and a video thumbnail/play affordance if `video_url` is set (currently rendered nowhere despite existing in the schema). If `training_start_date` / `training_completion_estimate` are set on the dog, show them as the timeline's start anchor and a "target" marker respectively.

Replace the flat card list in `app/(portal)/training-updates/[dogId].tsx` with this component. Also use it in the new `app/(tabs)/training/[dogId].tsx` from Task 1 (trainer/admin gets the same visual, plus their own entries highlighted or an edit affordance — read-only for now is fine if editing existing entries adds too much scope, but creating new ones must work per Task 1).

## Warnings

- Do not touch `dog_weight_logs` or the separate milestones-only screen (`app/(portal)/dogs/[id]/milestones.tsx`) — that's a different existing view, leave it as is unless it makes sense to also swap in the new timeline component there (your call, but don't break it).
- No file over 300 lines — split the form sheet from the screen if needed.
- `npx tsc --noEmit` must pass.
- RLS: trainers should only be able to log sessions for dogs they're assigned to train, if such an assignment concept already exists in the schema (check `training_bookings` for a trainer/dog link) — if not, any trainer/admin logging any in-training dog is acceptable for v1.

## Testing checklist

- [ ] Trainer/admin can log a new session for a dog in training; it appears immediately in that dog's timeline
- [ ] Client portal shows the new timeline component with real data (previously showed only empty states)
- [ ] Milestone entries are visually distinct from regular sessions
- [ ] Video thumbnail/link renders when `video_url` is set
- [ ] `training_start_date` / `training_completion_estimate` show correctly when set, and the screen doesn't break when they're null
- [ ] Non-trainer/admin roles cannot see or reach the "Log Session" action
