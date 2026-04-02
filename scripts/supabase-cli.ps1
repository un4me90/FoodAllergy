$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Test-Path ".supabase-home")) {
  New-Item -ItemType Directory -Path ".supabase-home" | Out-Null
}

$env:USERPROFILE = (Resolve-Path ".supabase-home").Path
$env:HOME = $env:USERPROFILE

$supabaseCmd = ".\node_modules\.bin\supabase.cmd"
if (-not (Test-Path $supabaseCmd)) {
  Write-Host "Local Supabase CLI not found. Run 'npm install' in the repo root first." -ForegroundColor Yellow
  exit 1
}

if ($args.Count -eq 0) {
  & $supabaseCmd --help
  exit $LASTEXITCODE
}

& $supabaseCmd @args
exit $LASTEXITCODE
