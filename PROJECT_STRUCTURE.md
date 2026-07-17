# Project Structure — Read This Before Opening in Cursor or Editing Anything

This file exists because a duplicate/stray folder (`diedericks-dobermann-web`) was accidentally
created alongside the real website folder, went unnoticed, and could have caused Cursor's AI to
edit or create files in the wrong place. It was found and deleted on 2026-07-17. This document
prevents it happening again.

## Always open Cursor at the TOP level

```
C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App
```

Never open Cursor directly on `diedericks-dobermanns\` or `diedericksdobermann-web\` alone — the
`scripts\` folder lives at the top level and is invisible to Cursor if you open a subfolder.

## The exact, correct top-level folders — memorize these spellings

| Folder name (exact) | What it is | GitHub repo |
|---|---|---|
| `diedericks-dobermanns` | Mobile app (React Native / Expo) | `MatthysDiedericks/diedericks-dobermanns` |
| `diedericksdobermann-web` | Website (Next.js) — note: **no hyphen** between "diedericks" and "dobermann", **singular** "dobermann" | `MatthysDiedericks/diedericksdobermanns-web` (repo name has an extra "s" — that's normal, GitHub repo names don't have to match the local folder name) |
| `scripts` | One-off Node scripts (photo/video uploads, data imports) — shared by both projects, must be run from inside `diedericks-dobermanns\` as `node ../scripts/<file>.mjs` |
| `content` | Shared markdown content (legal docs, etc.) |
| `LEGAL` | Source legal documents (Privacy Policy, T&Cs) |
| `.github` | GitHub Actions / repo config |

**If you ever see a folder with a similar-but-not-identical name** (e.g. `diedericks-dobermann-web`,
`diedericksdobermanns-web`, `dobermann-app`, anything with "copy", "(1)", "old", "backup" in the
name) — stop and ask before using it. It is almost certainly a duplicate created by a sync
conflict or a misconfigured tool, not a real second project.

## Why duplicates happen here

This folder is synced via OneDrive. OneDrive occasionally creates a second copy of a folder if
two devices/tools try to create the same folder at the same time, or if a tool (Cursor, a script)
is pointed at a slightly different path than intended and creates a new folder instead of finding
the existing one. The folder name it creates is usually *almost* correct, which makes it easy to
miss.

## Standing rule (for Claude and for Cursor)

Before creating **any** new top-level folder or file, or before telling Cursor to create one,
check this file first to confirm it doesn't already exist under a slightly different name. Before
running any script that uploads files or writes to Supabase, confirm the script's actual location
via `scripts/` at the top level — don't let a tool "helpfully" recreate a missing-looking file.

## Periodic health check

Run this occasionally (Matt, or ask Claude to run it) to catch new duplicates early:

```
find "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App" -maxdepth 1 -type d
```

Should always return exactly: `.github`, `content`, `diedericks-dobermanns`, `diedericksdobermann-web`,
`LEGAL`, `scripts` (plus `.git`). If anything else appears, investigate before using it.

---

## Git structure — read this before running any git command

There are **two separate git repositories** in this project, and they are easy to confuse:

1. **The outer/top-level repo** — `.git` lives directly inside `diedericksdobermann App\` (the
   very top folder you open in Cursor). Its remote is `github.com/MatthysDiedericks/diedericks-dobermanns`.
   This repo's working tree is the **entire project folder** — the app, `scripts\`, `LEGAL\`,
   `content\`, every `CURSOR_PROMPT_*.md` file, and (until 2026-07-17) an accidental duplicate copy
   of the whole website. Running `git status`/`git add`/`git commit` from inside `diedericks-dobermanns\`
   still operates on **this** outer repo — `diedericks-dobermanns\` is not its own repo, just a
   subfolder of one.
2. **The website's own repo** — `.git` lives inside `diedericksdobermann-web\`. Its remote is
   `github.com/MatthysDiedericks/diedericksdobermanns-web`. This is what Vercel actually deploys
   from. As of 2026-07-17, the outer repo's `.gitignore` excludes `diedericksdobermann-web/`
   entirely, so the outer repo no longer tracks a second copy of it — this repo is the single
   source of truth for the website's history.

**Standing rule: git write operations (`add`, `commit`, `push`, `rm`, `reset --hard`, etc.) must
always be run by Matt, directly in his own local Cursor/PowerShell terminal — never by Claude
through its sandbox against the OneDrive-synced copy of this folder.**

**Why:** On 2026-07-17, Claude ran `git rm -r --cached` against the outer repo from its sandbox
and corrupted `.git/index` (`bad signature 0x00000000` / `fatal: index file corrupt`) — twice,
reproducibly. The most likely cause is OneDrive's sync client locking/reading `.git/index` at the
same moment Claude's git process was writing to it, since OneDrive syncs the entire project folder
in real time, `.git` included. No commit history or file content was lost either time (`git log`
and `git fsck` confirmed HEAD and all objects were intact, matching what was already on GitHub) —
`git reset` safely rebuilt the index from the last commit both times — but repeatedly attempting
git surgery from the sandbox against a live-syncing folder is a real risk not worth taking.
Claude may still run **read-only** git commands from the sandbox (`status`, `log`, `diff`,
`remote -v`, `fsck`) to investigate — only writes are off-limits.

**How to apply:** Whenever a git write operation is needed, Claude should give Matt the exact
commands to paste into his own terminal (as already established for `npm`/`eas`/`expo` commands
for the same underlying reason — this project's git and package-manager work has always been
Matt-executed, this just extends that same rule explicitly to git).
