$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command ctype -ErrorAction SilentlyContinue)) {
  Write-Host "Cloudtype CLI not found. Install it first: npm i -g @cloudtype/cli" -ForegroundColor Yellow
  exit 1
}

Write-Host "Applying Cloudtype deployment from .cloudtype/app.yaml..." -ForegroundColor Cyan
ctype apply
