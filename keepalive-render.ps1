$ErrorActionPreference = 'Stop'

$url = 'https://food-allergy-app.onrender.com/api/health'

try {
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Output "[$timestamp] keepalive ok: $($response.StatusCode)"
} catch {
  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Output "[$timestamp] keepalive failed: $($_.Exception.Message)"
  exit 1
}
