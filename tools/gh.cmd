@echo off
rem Run any gh command with this project's config dir and the local proxy.
rem   usage: tools\gh.cmd auth status
rem          tools\gh.cmd repo create my-repo --public
rem Override the proxy port with the GHPORT environment variable:
rem   set GHPORT=7890 && tools\gh.cmd auth status
setlocal
if "%GHPORT%"=="" set "GHPORT=7897"
set "HTTP_PROXY=http://127.0.0.1:%GHPORT%"
set "HTTPS_PROXY=http://127.0.0.1:%GHPORT%"
set "GH_CONFIG_DIR=%~dp0..\.gh-config"
if "%GHPORT%"=="0" (
  set "HTTP_PROXY="
  set "HTTPS_PROXY="
)
gh %*
