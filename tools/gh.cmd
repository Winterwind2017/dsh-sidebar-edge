@echo off
rem Run gh with this project's isolated setup:
rem   - GH_CONFIG_DIR -> the token lives in _gh-config inside the project, because
rem     the agent's file sandbox cannot write %APPDATA%\GitHub CLI
rem   - HTTP(S)_PROXY -> gh ignores the browser's proxy setting, so it is set here
rem
rem   usage: tools\gh.cmd auth status
rem          tools\gh.cmd repo view Winterwind2017/dsh-sidebar-edge
rem
rem Override the proxy port with GHPORT (0 disables the proxy):
rem   set GHPORT=0 && tools\gh.cmd auth status
setlocal
if "%GHPORT%"=="" set "GHPORT=7897"
set "GH_CONFIG_DIR=%~dp0..\.gh-config"
if "%GHPORT%"=="0" (
  set "HTTP_PROXY="
  set "HTTPS_PROXY="
) else (
  set "HTTP_PROXY=http://127.0.0.1:%GHPORT%"
  set "HTTPS_PROXY=http://127.0.0.1:%GHPORT%"
)
gh %*
