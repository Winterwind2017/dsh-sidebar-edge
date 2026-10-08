@echo off
rem Log in to GitHub for this project.
rem
rem Two environment quirks on this machine, both handled here:
rem   1. gh's default config lives in %APPDATA%\GitHub CLI, which the agent's
rem      file sandbox cannot write; GH_CONFIG_DIR points it into the project
rem      (git-ignored) so the login can persist.
rem   2. gh stores the token in Windows Credential Manager by default; when that
rem      write is refused the whole login is discarded, so --insecure-storage
rem      keeps it in the config file instead.
rem
rem The connectivity probe uses PowerShell (curl.exe is unreliable here), and the
rem proxy is set for gh/git as well, since they ignore the browser's proxy setting.
rem
rem usage: tools\gh-auth.cmd            (proxy port 7897)
rem        tools\gh-auth.cmd 7890       (other port)
rem        tools\gh-auth.cmd 0          (no proxy / direct)
setlocal EnableDelayedExpansion
set "PROXY_PORT=%~1"
if "%PROXY_PORT%"=="" set "PROXY_PORT=7897"
if "%PROXY_PORT%"=="0" (
  set "HTTP_PROXY="
  set "HTTPS_PROXY="
) else (
  set "HTTP_PROXY=http://127.0.0.1:%PROXY_PORT%"
  set "HTTPS_PROXY=http://127.0.0.1:%PROXY_PORT%"
)
set "GH_CONFIG_DIR=%~dp0..\.gh-config"
if not exist "%GH_CONFIG_DIR%" mkdir "%GH_CONFIG_DIR%"

echo ============================================================
echo  gh config dir : %GH_CONFIG_DIR%
if "%PROXY_PORT%"=="0" (echo  proxy         : disabled ^(direct^)) else (echo  proxy         : %HTTP_PROXY%)
echo  storage mode  : plain file ^(--insecure-storage^)
echo ============================================================
echo.

echo [1/3] probing GitHub reachability...
set "PYEXE="
for %%P in (python.exe python3.exe) do (
  if not defined PYEXE (
    for /f "delims=" %%W in ('where %%P 2^>nul') do if not defined PYEXE set "PYEXE=%%W"
  )
)
if not defined PYEXE if exist "C:\Users\yuche\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" set "PYEXE=C:\Users\yuche\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
if defined PYEXE (
  echo       using %PYEXE%
  "%PYEXE%" -c "import urllib.request,sys; proxy='http://127.0.0.1:%PROXY_PORT%'; h=urllib.request.ProxyHandler({'http':proxy,'https':proxy}) if %PROXY_PORT% else urllib.request.ProxyHandler({}); o=urllib.request.build_opener(h); r=o.open('https://api.github.com/',timeout=25); print('      api.github.com -> HTTP', r.status)"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest 'https://api.github.com/' -UseBasicParsing -TimeoutSec 25; Write-Host ('      api.github.com -> HTTP ' + $r.StatusCode) } catch { Write-Host ('      probe FAILED: ' + $_.Exception.Message) }"
)
echo.

echo [2/3] logging in now (GitHub.com / HTTPS / web browser)...
echo   A one-time code will be printed below; paste it into the browser page.
echo   If it reports a network timeout, re-run with the other mode:
echo       tools\gh-auth.cmd 0        (direct, no proxy)
echo.
gh auth login --hostname github.com --git-protocol https --web --insecure-storage
if errorlevel 1 (
  echo.
  echo   Login failed - see the message above.
  pause
  exit /b 1
)

echo.
echo [3/3] verifying and wiring git...
gh auth status
if errorlevel 1 (
  echo   gh auth status failed - the login did not persist.
  pause
  exit /b 1
)
if "%PROXY_PORT%"=="0" (
  git config --global --unset http.proxy 2>nul
  git config --global --unset https.proxy 2>nul
) else (
  git config --global http.proxy %HTTP_PROXY%
  git config --global https.proxy %HTTP_PROXY%
)
git config --global credential.helper "!gh auth git-credential"
echo   git proxy + gh credential helper configured.
echo.
if exist "%GH_CONFIG_DIR%\hosts.yml" (
  echo [gh-auth] SUCCESS - hosts.yml written, login persisted.
) else (
  echo [gh-auth] hosts.yml NOT written - login did not persist.
)
echo ============================================================
pause
