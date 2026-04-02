$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command ctype -ErrorAction SilentlyContinue)) {
  Write-Host "Cloudtype CLI not found. Install it first: npm i -g @cloudtype/cli" -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path ".cloudtype-home")) {
  New-Item -ItemType Directory -Path ".cloudtype-home" | Out-Null
}

$env:USERPROFILE = (Resolve-Path ".cloudtype-home").Path
$env:HOME = $env:USERPROFILE

Write-Host "Applying Cloudtype deployment from .cloudtype/app.yaml..." -ForegroundColor Cyan
cmd /c ctype apply
