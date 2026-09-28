<#
  backup-to-drive.ps1
  Diedericks Dobermanns - one command that puts everything on the external drive.

  What it saves, and why all four matter:
    1. Database data      backups\<timestamp>\         (backup-supabase.mjs)
    2. Uploaded files     backups-storage\<timestamp>\ (backup-storage.mjs)
    3. Website code       diedericksdobermann-web
    4. App code           diedericks-dobermanns

  The schema lives in supabase\migrations\*.sql inside the repos, so 1 + 2 + 3
  restores the whole business. Any one of them alone does not.

  HOW IT FINDS THE DRIVE
  Not by letter. Windows hands out D:, E:, F: in whatever order things are
  plugged in, and a backup that writes to the wrong disk is worse than no
  backup. It finds the drive by its NAME (volume label).

  NOTE FOR ANYONE EDITING THIS FILE
  Keep it to plain ASCII. Windows PowerShell 5.1 reads .ps1 files as ANSI, so a
  dash or arrow pasted from a document turns into garbage and the script dies
  with "Unexpected token". That is exactly what happened on 22 Sep 2026.

  RUN
    Double-click "Backup Now.cmd" in the project folder.
#>

$ErrorActionPreference = 'Stop'

$DriveLabel  = 'DD-BACKUP'   # the name on the drive, not a letter
$KeepDays    = 30            # older dated folders on the drive are deleted
$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Say  { param($m) Write-Host "  $m" }
function Step { param($m) Write-Host ""; Write-Host $m -ForegroundColor Cyan }
function Fail {
  param($m)
  Write-Host ""
  Write-Host "STOPPED: $m" -ForegroundColor Red
  Write-Host ""
  exit 1
}

$started = Get-Date
Write-Host ("Diedericks Dobermanns backup - " + $started.ToString('yyyy-MM-dd HH:mm')) -ForegroundColor White

# ---- 1. Find the drive ------------------------------------------------------
Step "1/5  Looking for the drive named $DriveLabel"

$vol = Get-Volume | Where-Object { $_.FileSystemLabel -eq $DriveLabel } | Select-Object -First 1
if (-not $vol -or -not $vol.DriveLetter) {
  Write-Host ""
  Write-Host "STOPPED: No drive named '$DriveLabel' is plugged in." -ForegroundColor Red
  Write-Host "         Plug it in, or rename it in This PC (right-click the drive, Rename)." -ForegroundColor Red
  Write-Host "         Nothing was backed up." -ForegroundColor Red
  Write-Host ""
  exit 1
}

$DriveRoot = "$($vol.DriveLetter):\DiedericksDobermanns"
$freeGb = [math]::Round($vol.SizeRemaining / 1GB, 1)
Say "Found it on $($vol.DriveLetter): - $freeGb GB free"
if ($vol.SizeRemaining -lt 5GB) { Fail "Less than 5 GB free. Clear some space first." }

New-Item -ItemType Directory -Force -Path $DriveRoot | Out-Null

# ---- 2. Database ------------------------------------------------------------
Step "2/5  Saving the database"
Push-Location $ProjectRoot
try {
  node scripts/backup-supabase.mjs
  if ($LASTEXITCODE -ne 0) { Fail "The database backup failed. Nothing was copied to the drive." }
  Say "Done"
} finally { Pop-Location }

# ---- 3. Uploaded files ------------------------------------------------------
Step "3/5  Saving uploaded photos and documents"
Push-Location $ProjectRoot
try {
  node scripts/backup-storage.mjs
  if ($LASTEXITCODE -ne 0) { Fail "The file backup failed. Nothing was copied to the drive." }
  Say "Done"
} finally { Pop-Location }

# ---- 4. Copy to the drive ---------------------------------------------------
$stamp  = $started.ToString('yyyy-MM-dd')
$target = Join-Path $DriveRoot $stamp
Step "4/5  Copying everything to $target"

# /MIR mirrors. /XD skips folders that are large, rebuildable and pointless to
# keep: node_modules restores with npm install, .next and .expo are build output.
$skip = @('node_modules', '.next', '.expo', 'dist', 'build', '.turbo')
$xd = @()
foreach ($s in $skip) { $xd += '/XD'; $xd += $s }

$jobs = @(
  @{ Name = 'Database backups'; From = (Join-Path $ProjectRoot 'backups');                  To = (Join-Path $target 'database') },
  @{ Name = 'Uploaded files';   From = (Join-Path $ProjectRoot 'backups-storage');          To = (Join-Path $target 'storage')  },
  @{ Name = 'Website code';     From = (Join-Path $ProjectRoot 'diedericksdobermann-web');  To = (Join-Path $target 'website')  },
  @{ Name = 'App code';         From = (Join-Path $ProjectRoot 'diedericks-dobermanns');    To = (Join-Path $target 'app')      }
)

foreach ($j in $jobs) {
  if (-not (Test-Path $j.From)) { Say "$($j.Name): nothing to copy (skipped)"; continue }
  Say "$($j.Name)..."
  & robocopy $j.From $j.To /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS /NP @xd | Out-Null
  # robocopy: 0-7 is success, 8 and above is a real failure
  if ($LASTEXITCODE -ge 8) { Fail "Copying $($j.Name) failed (robocopy code $LASTEXITCODE)." }
}

# ---- 5. Check it and tidy up ------------------------------------------------
Step "5/5  Checking the copy and clearing old ones"

$size = (Get-ChildItem $target -Recurse -File -ErrorAction SilentlyContinue |
         Measure-Object -Property Length -Sum).Sum
if (-not $size -or $size -lt 1MB) { Fail "The copy is suspiciously small. Check the drive." }
$sizeGb = [math]::Round($size / 1GB, 2)
Say "Today's backup: $sizeGb GB"

$cutoff = (Get-Date).AddDays(-$KeepDays).ToString('yyyy-MM-dd')
Get-ChildItem $DriveRoot -Directory |
  Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' -and $_.Name -lt $cutoff } |
  ForEach-Object {
    Say "Removing old backup $($_.Name)"
    Remove-Item $_.FullName -Recurse -Force
  }

$kept = @(Get-ChildItem $DriveRoot -Directory | Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' }).Count
$mins = [math]::Round(((Get-Date) - $started).TotalMinutes, 1)

$line = "{0} | OK | {1} GB | {2} backups kept | {3} min" -f $started.ToString('yyyy-MM-dd HH:mm'), $sizeGb, $kept, $mins
Add-Content -Path (Join-Path $DriveRoot 'backup-log.txt') -Value $line

Write-Host ""
Write-Host "BACKUP COMPLETE" -ForegroundColor Green
Write-Host "  $target" -ForegroundColor Green
Write-Host "  $kept backups on the drive. Log: $DriveRoot\backup-log.txt" -ForegroundColor Green
Write-Host ""
Write-Host "The drive now holds client names, emails and ID documents." -ForegroundColor Yellow
Write-Host "Keep it somewhere locked. Do not leave it in a car." -ForegroundColor Yellow
