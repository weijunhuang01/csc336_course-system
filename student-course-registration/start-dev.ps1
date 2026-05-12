# Run from repo root: .\start-dev.ps1
# Opens two windows: Node backend + Vite frontend. Fix backend/.env MySQL if the backend exits.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

$exe = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }

Write-Host "Starting backend: $backend" -ForegroundColor Cyan
Start-Process -FilePath $exe -WorkingDirectory $backend -ArgumentList @(
  "-NoExit",
  "-Command",
  "Write-Host 'Backend (Ctrl+C to stop)' -ForegroundColor Green; node server.js"
)

Start-Sleep -Seconds 2

Write-Host "Starting frontend: $frontend" -ForegroundColor Cyan
Start-Process -FilePath $exe -WorkingDirectory $frontend -ArgumentList @(
  "-NoExit",
  "-Command",
  "Write-Host 'Frontend (Ctrl+C to stop)' -ForegroundColor Green; npm run dev"
)

Write-Host "Done. Open http://localhost:5173 - wait for Database Connected in the backend window." -ForegroundColor Yellow
