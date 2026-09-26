@echo off
setlocal
cd /d "%~dp0"
echo.
echo === PDF Stamp ^& Sign: Activate ===
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\activate.ps1"
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo Activation exited with code %EXITCODE%.
  pause
)
exit /b %EXITCODE%
