@echo off
setlocal
cd /d "%~dp0"
echo.
echo === PDF Stamp ^& Sign: Verify ===
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\verify.ps1"
set EXITCODE=%ERRORLEVEL%
echo.
if "%EXITCODE%"=="0" echo Verification PASSED.
if not "%EXITCODE%"=="0" echo Verification returned code %EXITCODE%.
pause
exit /b %EXITCODE%
