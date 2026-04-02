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

if ($env:CLOUDTYPE_TOKEN) {
  Write-Host "Logging into Cloudtype CLI with CLOUDTYPE_TOKEN..." -ForegroundColor Cyan
  cmd /c "ctype login -t $env:CLOUDTYPE_TOKEN"
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

function Escape-YamlSingleQuoted([string]$value) {
  return $value.Replace("'", "''")
}

$requiredVars = @(
  "DATABASE_URL",
  "NEIS_API_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY"
)

$missingVars = @($requiredVars | Where-Object { -not $env:$_ })
if ($missingVars.Count -gt 0) {
  Write-Host ("Missing required environment variables: " + ($missingVars -join ", ")) -ForegroundColor Yellow
  exit 1
}

$envMap = [ordered]@{
  NODE_ENV = if ($env:NODE_ENV) { $env:NODE_ENV } else { "production" }
  TZ = if ($env:TZ) { $env:TZ } else { "Asia/Seoul" }
  PORT = if ($env:PORT) { $env:PORT } else { "3001" }
  DATABASE_URL = $env:DATABASE_URL
  DATABASE_SSL = if ($env:DATABASE_SSL) { $env:DATABASE_SSL } else { "true" }
  NEIS_API_KEY = $env:NEIS_API_KEY
  VAPID_PUBLIC_KEY = $env:VAPID_PUBLIC_KEY
  VAPID_PRIVATE_KEY = $env:VAPID_PRIVATE_KEY
  VAPID_SUBJECT = if ($env:VAPID_SUBJECT) { $env:VAPID_SUBJECT } else { "mailto:admin@foodallergy.local" }
  VAPID_EMAIL = if ($env:VAPID_EMAIL) { $env:VAPID_EMAIL } else { "mailto:admin@foodallergy.local" }
}

$yamlLines = @(
  "name: food-allergy-app",
  "app: dockerfile",
  "",
  "options:",
  "  env:"
)

foreach ($entry in $envMap.GetEnumerator()) {
  $escapedValue = Escape-YamlSingleQuoted([string]$entry.Value)
  $yamlLines += "    - name: $($entry.Key)"
  $yamlLines += "      value: '$escapedValue'"
}

$yamlLines += @(
  "  ports: 3001",
  "  dockerfile: Dockerfile",
  "",
  "context:",
  "  preset: node.js"
)

$generatedYamlPath = Join-Path ".cloudtype" "app.generated.yaml"
Set-Content -LiteralPath $generatedYamlPath -Value ($yamlLines -join [Environment]::NewLine) -Encoding UTF8

Write-Host "Applying Cloudtype deployment from generated config..." -ForegroundColor Cyan
cmd /c "ctype apply -f .cloudtype\\app.generated.yaml"
