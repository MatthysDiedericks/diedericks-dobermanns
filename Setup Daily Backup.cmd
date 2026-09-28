@echo off
title Diedericks Dobermanns - set up the daily backup

rem Windows 11 hides "Run as administrator" behind "Show more options" for .cmd
rem files, so telling someone to right-click is unreliable. This asks Windows
rem for admin rights itself: a plain double-click is enough, and all the person
rem sees is the normal Yes/No prompt.

net session >nul 2>&1
if %errorlevel% equ 0 goto :elevated

echo.
echo   Asking Windows for permission...
echo   Click YES on the prompt that appears.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs" 2>nul
if %errorlevel% neq 0 (
  echo.
  echo   You clicked No, or this account cannot get administrator rights.
  echo   Nothing was set up. Run it again and click Yes.
  echo.
  pause
)
exit /b

:elevated
cd /d "%~dp0"
echo.
echo   Running with administrator rights.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-daily-backup.ps1"

echo.
echo   ----------------------------------------------------
echo   Read the message above.
echo   Green "Done." = the daily backup is set.
echo   Anything red  = it did not work. Send me the text.
echo   ----------------------------------------------------
echo.
pause
