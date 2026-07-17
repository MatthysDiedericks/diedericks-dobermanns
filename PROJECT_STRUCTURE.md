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
