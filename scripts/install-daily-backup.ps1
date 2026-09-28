<#
  install-daily-backup.ps1
  Registers the daily backup with Windows Task Scheduler.

  Run this once, via "Setup Daily Backup.cmd" in the project folder.
  It replaces any previous copy of the task, so running it again is safe.

  Keep this file plain ASCII. Windows PowerShell 5.1 reads .ps1 as ANSI and a
  pasted dash or arrow breaks the whole script.

  Everything is inside a try/catch. A scheduled task that fails to register
  silently is how you end up believing you have backups when you do not.
#>

$TaskName    = 'Diedericks Dobermanns backup'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Script      = Join-Path $PSScriptRoot 'backup-to-drive.ps1'
$RunAt       = '19:00'

Write-Host ""
Write-Host "Setting up the daily backup" -ForegroundColor White
Write-Host ""

try {
  if (-not (Test-Path $Script)) {
    throw "Cannot find backup-to-drive.ps1. Expected it at: $Script"
  }

  # The task runs as whoever installs it, only while they are logged on. The
  # alternative stores a password and cannot reliably reach OneDrive folders.
  $user = "$env:USERDOMAIN\$env:USERNAME"
  Write-Host "  Installing as $user"

  $action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Script`"" `
    -WorkingDirectory $ProjectRoot

  $trigger = New-ScheduledTaskTrigger -Daily -At $RunAt

  # Each of these exists because of a way scheduled backups quietly stop:
  #   StartWhenAvailable          machine off at 19:00, run when it next wakes
  #   AllowStartIfOnBatteries     otherwise it skips whenever unplugged
  #   DontStopIfGoingOnBatteries  and does not abort halfway if you unplug
  #   ExecutionTimeLimit 0        a big copy must not be killed at 3 hours
  #   RestartCount                the drive might be plugged in a minute later
  $settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 15) `
    -MultipleInstances IgnoreNew

  $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest

  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description 'Backs up the Diedericks Dobermanns database, uploaded files, website and app to the DD-BACKUP drive.' `
    -Force | Out-Null

  # Do not trust the call returning quietly. Read it back.
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  $info = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction Stop

  Write-Host ""
  Write-Host "  Done." -ForegroundColor Green
  Write-Host ""
  Write-Host "  Task     : $TaskName"
  Write-Host "  Runs     : every day at $RunAt, or as soon as the laptop is next on"
  Write-Host "  As       : $user"
  Write-Host "  Next run : $($info.NextRunTime)"
  Write-Host "  State    : $($task.State)"
  Write-Host ""
  Write-Host "  Nothing else to do." -ForegroundColor Cyan
}
catch {
  Write-Host ""
  Write-Host "  IT DID NOT WORK" -ForegroundColor Red
  Write-Host ""
  Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ""
  Write-Host "  Send that line to Claude." -ForegroundColor Yellow
}

Write-Host ""
