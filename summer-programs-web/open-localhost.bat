@echo off
setlocal

cd /d "%~dp0"
title Summer Programs - Local Server

set "NODE_EXE="
where node >nul 2>nul && set "NODE_EXE=node"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
  echo Node.js is required but was not found.
  echo Install Node.js from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

echo Closing any existing server on port 5173...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$listeners = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue; $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $processIds) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak >nul

echo Starting the site at http://localhost:5173
echo Your browser will open automatically.
echo Keep this window open, and press Ctrl+C to stop the server.
echo.

"%NODE_EXE%" local-server.mjs
