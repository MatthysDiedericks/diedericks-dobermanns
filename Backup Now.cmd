@echo off
title Diedericks Dobermanns - backup
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\backup-to-drive.ps1"

echo.
echo   ------------------------------------------------------------
echo   Finished. Read the message above.
echo   Green BACKUP COMPLETE = done.
echo   Red STOPPED = nothing was copied, and it says why.
echo   ------------------------------------------------------------
echo.
pause
