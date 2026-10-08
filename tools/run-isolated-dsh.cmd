@echo off
rem Launch an isolated dsh web instance for screenshots / manual checks.
rem HOME must be set in the child environment: PowerShell cannot assign $HOME.
setlocal
set "HOME=%~dp0dshhome-isolated"
set "USERPROFILE=%~dp0dshhome-isolated"
if not exist "%HOME%" mkdir "%HOME%"
"D:\Program Files\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" web --port %1 --no-open
