@echo off
rem Run git for THIS repository with the project-local configuration, avoiding
rem %USERPROFILE%\.gitconfig (which the agent's file sandbox cannot write):
rem   - GIT_CONFIG_GLOBAL -> .gh-config\gitconfig (identity, proxy, credential helper)
rem   - GH_CONFIG_DIR     -> so the `!gh auth git-credential` helper finds the token
rem   - HTTP(S)_PROXY     -> git ignores the browser's proxy setting
rem
rem   usage: tools\git.cmd status
rem          tools\git.cmd push origin main
rem          tools\git.cmd log --oneline -5
rem
rem Override the proxy port with GHPORT (0 disables the proxy):
rem   set GHPORT=0 && tools\git.cmd ls-remote --heads origin
setlocal
if "%GHPORT%"=="" set "GHPORT=7897"
set "GH_CONFIG_DIR=%~dp0..\.gh-config"
set "GIT_CONFIG_GLOBAL=%~dp0..\.gh-config\gitconfig"
if "%GHPORT%"=="0" (
  set "HTTP_PROXY="
  set "HTTPS_PROXY="
) else (
  set "HTTP_PROXY=http://127.0.0.1:%GHPORT%"
  set "HTTPS_PROXY=http://127.0.0.1:%GHPORT%"
)
git %*
