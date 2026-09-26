@echo off
setlocal
cd /d "%~dp0"
echo.
echo === PDF Stamp ^& Sign: Agent One-Click ===
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\activate.ps1" -Background -NoOpen
exit /b %ERRORLEVEL%
