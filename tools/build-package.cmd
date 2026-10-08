@echo off
rem Build the Edge Add-ons submission package.
rem The zip root must be the extension itself (manifest.json at top level).
setlocal
set "ROOT=%~dp0.."
set "SRC=%ROOT%\extension"
set "OUT=%ROOT%\dist"
set "ZIP=%OUT%\dsh-sidebar-edge-1.0.0.zip"

if not exist "%OUT%" mkdir "%OUT%"
if exist "%ZIP%" del /q "%ZIP%"

powershell -NoProfile -Command ^
  "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('%SRC%','%ZIP%',[System.IO.Compression.CompressionLevel]::Optimal,$false)"

if exist "%ZIP%" (
  for %%A in ("%ZIP%") do echo built %%~nxA  (%%~zA bytes^)
) else (
  echo BUILD FAILED
  exit /b 1
)
