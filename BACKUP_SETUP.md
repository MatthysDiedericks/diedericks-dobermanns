# Backups to the external drive

Do the first part once. After that the computer does it every day on its own.

---

## Part 1 — Name the drive (2 minutes, once)

The script finds your drive by its **name**, not its letter. Windows gives out D:, E:, F: in
whatever order things get plugged in, and a backup that writes to the wrong disk is worse than no
backup at all. The name never moves.

1. Open **File Explorer** and click **This PC**
2. Find your external drive
3. **Right-click it → Rename**
4. Type **`DD-BACKUP`** and press Enter

That's the whole setup.

---

## Part 2 — Run it once by hand (5 minutes)

Prove it works before you automate it. Automating something you've never watched run is how you end
up with a folder full of empty backups.

1. Press **Windows key**, type `powershell`, press Enter
2. Copy this line, paste it in (right-click pastes), press Enter:

```powershell
cd "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App"; powershell -ExecutionPolicy Bypass -File "scripts\backup-to-drive.ps1"
```

3. Watch it work through five steps. It takes a few minutes the first time.

**You want to see, in green:**

```
BACKUP COMPLETE
  E:\DiedericksDobermanns\2026-09-22
```

**If it stops in red**, it tells you why and it has copied nothing. The usual cause is the drive not
being plugged in or not being renamed yet.

4. Open the drive in File Explorer and look inside today's folder. You should see four folders:
   **database**, **storage**, **website**, **app**. If one is missing or empty, tell me.

---

## Part 3 — Make it daily and forget about it (5 minutes, once)

1. Press **Windows key**, type **Task Scheduler**, press Enter
2. On the right, click **Create Task…** (not "Create Basic Task" — you need the extra options)

**General tab**

- Name: `Diedericks Dobermanns backup`
- Select **Run only when user is logged on**
- Tick **Run with highest privileges**

> Why "when logged on": the other option makes Windows ask for your password and store it, and it
> can't reach OneDrive folders reliably. Logged-on is the right fit for a laptop you use daily.

**Triggers tab** → **New…**

- Begin the task: **On a schedule**
- **Daily**, start at **19:00** (or any time your machine is normally on and awake)
- Tick **Enabled** → OK

**Actions tab** → **New…**

- Action: **Start a program**
- Program/script:

```
powershell.exe
```

- Add arguments — copy this exactly, quotes included:

```
-ExecutionPolicy Bypass -File "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App\scripts\backup-to-drive.ps1"
```

- Start in:

```
C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App
```

→ OK

**Conditions tab**

- Untick **Start the task only if the computer is on AC power** — otherwise it silently skips every
  time you're on battery
- Leave the rest alone

**Settings tab**

- Tick **Run task as soon as possible after a scheduled start is missed** ← the important one. Your
  machine won't always be on at 19:00, and without this the day is simply lost.
- Tick **If the task fails, restart every:** 15 minutes, up to 3 times
- Untick **Stop the task if it runs longer than** — a big first copy can outlast the default

Click **OK**.

3. **Test it now**: find the task in the list, right-click → **Run**. It should do exactly what it did
   in Part 2.

---

## How to know it's still working

Two checks, both quick.

**The log.** On the drive: `DiedericksDobermanns\backup-log.txt`. One line per run:

```
2026-09-22 19:00 — OK — 2.14 GB — 1 backups kept — 3.2 min
```

If the newest line is more than a couple of days old, the task hasn't been running.

**The daily health check** already reports backup age every weekday morning and flags anything older
than 7 days. That's your safety net — but it only sees the copy in the project folder, so glance at
the drive log now and then too.

---

## What's on the drive, and what that means

- **database** — every table, as JSON. Includes `contacts`, `users` and `applications`.
- **storage** — every uploaded photo and document, including client ID documents.
- **website** / **app** — the code.

`node_modules` and build folders are deliberately skipped. They're large, they rebuild with
`npm install`, and keeping them would triple the size for nothing.

**The drive holds your clients' personal information.** Keep it somewhere locked when it isn't
plugged in. Don't leave it in a car, and don't lend it. If you ever replace it, wipe the old one
properly rather than binning it.

Older backups are deleted after 30 days so the drive doesn't fill up. Change `$KeepDays` at the top of
the script if you want longer.

---

## If something goes wrong

**"No drive labelled 'DD-BACKUP' is plugged in"** — plug it in, or the rename in Part 1 didn't take.
Check the name in This PC.

**"The database backup failed"** — usually the Supabase keys. They live in
`diedericks-dobermanns\.env.local`. Nothing was copied, so the previous backup is untouched.

**"The copy is suspiciously small"** — the drive may be full or failing. Check the free space.

**The task runs but nothing appears** — open Task Scheduler, click the task, look at the **History**
tab. If History is empty, click **Enable All Tasks History** on the far right.

---

## One thing this does not cover

This backs up to a drive that lives in the same building as the computer. A fire or a burglary takes
both. The Supabase project is still on the **Free plan**, which has no automatic backups of its own —
that reminder is set for 1 October. Upgrading to Pro gives you daily off-site backups held by
Supabase, and that plus this drive is a real answer rather than half of one.
