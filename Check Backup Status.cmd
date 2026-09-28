@echo off
title Diedericks Dobermanns - backup status
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$t = Get-ScheduledTask -TaskName 'Diedericks Dobermanns backup' -ErrorAction SilentlyContinue;" ^
  "Write-Host '';" ^
  "if (-not $t) {" ^
  "  Write-Host '  THE DAILY BACKUP IS NOT SET UP' -ForegroundColor Red;" ^
  "  Write-Host '';" ^
  "  Write-Host '  Right-click \"Setup Daily Backup.cmd\" and choose Run as administrator.' -ForegroundColor Yellow;" ^
  "} else {" ^
  "  $i = Get-ScheduledTaskInfo -TaskName 'Diedericks Dobermanns backup';" ^
  "  Write-Host '  DAILY BACKUP IS SET UP' -ForegroundColor Green;" ^
  "  Write-Host '';" ^
  "  Write-Host ('  State     : ' + $t.State);" ^
  "  Write-Host ('  Next run  : ' + $i.NextRunTime);" ^
  "  Write-Host ('  Last run  : ' + $i.LastRunTime);" ^
  "  $r = $i.LastTaskResult;" ^
  "  if ($r -eq 0) { Write-Host '  Last result: OK' -ForegroundColor Green }" ^
  "  elseif ($r -eq 267011) { Write-Host '  Last result: has not run yet' }" ^
  "  else { Write-Host ('  Last result: FAILED (code ' + $r + ')') -ForegroundColor Red };" ^
  "};" ^
  "Write-Host '';" ^
  "$log = 'D:\DiedericksDobermanns\backup-log.txt';" ^
  "if (Test-Path $log) {" ^
  "  Write-Host '  Last backups on the drive:' -ForegroundColor Cyan;" ^
  "  Get-Content $log -Tail 5 | ForEach-Object { Write-Host ('    ' + $_) };" ^
  "} else {" ^
  "  Write-Host '  No log on the drive yet. Either it has never run, or the drive is unplugged.' -ForegroundColor Yellow;" ^
  "};" ^
  "Write-Host ''"

echo.
pause
