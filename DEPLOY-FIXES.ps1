# DEPLOY-FIXES.ps1
# ---------------------------------------------------------------------------
# Commits + pushes ONLY the specific files changed for the current fixes.
# Uses absolute paths so it works no matter which folder you run it from.
#
# HOW TO RUN (from any terminal):
#   powershell -ExecutionPolicy Bypass -File "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App\DEPLOY-FIXES.ps1"
#
# WHY THIS SCRIPT EXISTS:
# The two projects are SEPARATE git repos with DIFFERENT roots:
#   - Website repo root : ...\diedericksdobermann App\diedericksdobermann-web
#   - App repo root     : ...\diedericksdobermann App          <-- the PARENT folder
# Running "git add src/app/..." from the wrong folder silently stages nothing,
# then "git push" reports "Everything up-to-date" and nothing deploys.
#
# It stages ONLY the intended files, because `git status` in these repos lists
# every file as modified (line-ending noise) - never use `git add -A` here.
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

$Base   = "C:\Users\mathy\OneDrive\Documents\Claude\Projects\diedericksdobermann App"
$WebDir = Join-Path $Base "diedericksdobermann-web"
$AppDir = $Base   # app repo root IS the parent folder

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# ---------------------------------------------------------------------------
# CURRENT CHANGE SET — edit these two lists for each new deploy
# ---------------------------------------------------------------------------
$WebCommitMessage = "Fix portal build: commit regenerated dog types (registration_number, coat_type) + documents lib"
$webFiles = @(
  "src/types/database.types.ts",
  "src/lib/portal"
)

$AppCommitMessage = ""      # leave empty to skip the app repo this run
$appFiles = @()

# ---------------------------------------------------------------------------
# 1. WEBSITE
# ---------------------------------------------------------------------------
if ($webFiles.Count -gt 0) {
  Write-Step "WEBSITE: diedericksdobermanns-web"
  Set-Location $WebDir

  # PRE-FLIGHT: the #1 cause of failed builds in this project is committing a
  # PARTIAL change set — a file that imports something whose companion file was
  # left behind. `tsc --noEmit` cannot catch it because tsc reads the working
  # directory while git ships something different. Happened three times on
  # 2026-07-30/31 (format.ts untracked, then 23 portal files, then regenerated
  # database.types.ts left out).
  #
  # So: list everything git sees as changed but NOT in this change set, and make
  # the human look at it before anything is committed.
  $changedAll = @(git status --porcelain -- src/ | ForEach-Object { ($_ -replace '^..\s+', '').Trim('"') })
  $notIncluded = @()
  foreach ($c in $changedAll) {
    $covered = $false
    foreach ($f in $webFiles) { if ($c -like "$f*") { $covered = $true; break } }
    if (-not $covered) { $notIncluded += $c }
  }
  if ($notIncluded.Count -gt 0) {
    Write-Host ""
    Write-Host "  WARNING - changed under src/ but NOT in this change set:" -ForegroundColor Yellow
    $notIncluded | Select-Object -First 25 | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
    Write-Host "  (line-ending noise is normal here; a NEW file or a regenerated" -ForegroundColor Yellow
    Write-Host "   types file is NOT - that will fail the Vercel build)" -ForegroundColor Yellow
    Write-Host ""
  }

  # -LiteralPath and git's :(literal) are BOTH required. Next.js route folders
  # like `[slug]` contain square brackets, which PowerShell's Test-Path AND
  # git's pathspec both treat as wildcard character classes. Without these,
  # such files silently report "MISSING (skipped)" and never get committed —
  # this actually happened on 2026-07-29 and shipped a half-finished fix.
  # Track files that don't exist on disk. THAT is the real failure mode (the
  # bracket/glob trap) — a file that exists but stages nothing simply means it
  # already matches HEAD, which is normal and must not block the commit.
  $missingWeb = @()
  foreach ($f in $webFiles) {
    if (Test-Path -LiteralPath (Join-Path $WebDir $f)) {
      git add -- ":(literal)$f"
      Write-Host "  ok: $f" -ForegroundColor Green
    } else {
      Write-Host "  MISSING FROM DISK: $f" -ForegroundColor Red
      $missingWeb += $f
    }
  }

  if ($missingWeb.Count -gt 0) {
    Write-Host ""
    Write-Host "STOP - $($missingWeb.Count) file(s) in the list do not exist on disk." -ForegroundColor Red
    Write-Host "Check for a typo, or for the [brackets]/(parens) glob trap." -ForegroundColor Red
    Write-Host "Nothing committed." -ForegroundColor Red
    exit 1
  }

  $stagedWeb = @(git diff --cached --name-only)
  Write-Host "  -> $($stagedWeb.Count) file(s) with actual changes to commit" -ForegroundColor Cyan

  if ($stagedWeb.Count -gt 0) {
    git commit -m $WebCommitMessage
    git push
    Write-Host "WEBSITE PUSHED - Vercel redeploys in ~1-2 min" -ForegroundColor Green
  } else {
    Write-Host "Nothing to commit for website (already pushed?)" -ForegroundColor Yellow
  }
}

# ---------------------------------------------------------------------------
# 2. MOBILE APP  (source only - phone needs an APK rebuild to show changes)
# ---------------------------------------------------------------------------
if ($appFiles.Count -gt 0) {
  Write-Step "MOBILE APP: diedericks-dobermanns"
  Set-Location $AppDir

  # NOTE: app-repo paths MUST be prefixed with "diedericks-dobermanns/"
  # because this repo's root is the PARENT folder.
  # See the note in the WEBSITE section: -LiteralPath + :(literal) are required
  # because Expo Router folders like `(admin)` and `[id]` contain glob chars.
  $missingApp = @()
  foreach ($f in $appFiles) {
    if (Test-Path -LiteralPath (Join-Path $AppDir $f)) {
      git add -- ":(literal)$f"
      Write-Host "  ok: $f" -ForegroundColor Green
    } else {
      Write-Host "  MISSING FROM DISK: $f" -ForegroundColor Red
      $missingApp += $f
    }
  }

  if ($missingApp.Count -gt 0) {
    Write-Host ""
    Write-Host "STOP - $($missingApp.Count) app file(s) do not exist on disk." -ForegroundColor Red
    Write-Host "Remember app-repo paths need the 'diedericks-dobermanns/' prefix." -ForegroundColor Red
    Write-Host "Nothing committed for the app." -ForegroundColor Red
    exit 1
  }

  $stagedApp = @(git diff --cached --name-only)
  Write-Host "  -> $($stagedApp.Count) file(s) with actual changes to commit" -ForegroundColor Cyan

  if ($stagedApp.Count -gt 0) {
    git commit -m $AppCommitMessage
    git push
    Write-Host "APP PUSHED - rebuild the APK to see changes on your phone" -ForegroundColor Green
  } else {
    Write-Host "Nothing to commit for app (already pushed?)" -ForegroundColor Yellow
  }
}

Write-Step "DONE"
Write-Host "CHECK VERCEL SHOWS 'Ready', NOT 'Error' before testing." -ForegroundColor Yellow
Write-Host ""
Write-Host "Then test:" -ForegroundColor White
Write-Host "  /portal/login  -> client login" -ForegroundColor White
Write-Host "  Submit a test application -> all admins should get an email" -ForegroundColor White
Write-Host ""
Write-Host "STILL TO DO (needs the edge function + cron, not yet built):" -ForegroundColor Yellow
Write-Host "  daily 07:00 reminders for applications left unactioned" -ForegroundColor Yellow
Write-Host ""
Write-Host "REMINDER: diedericksdobermanns.com is served by the '-v145' Vercel project," -ForegroundColor Yellow
Write-Host "  not 'diedericksdobermanns-web'. If a future env-var change doesn't seem to" -ForegroundColor Yellow
Write-Host "  take effect, check it was made on '-v145' - see Vercel Domains tab to confirm." -ForegroundColor Yellow
Write-Host ""
# NOTE: deliberately no Read-Host here. A trailing "Press Enter to close" prompt
# swallowed the next pasted command twice on 2026-07-29, making it look like the
# script had run again when it hadn't.
