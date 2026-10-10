# Run once as Administrator: npm run firewall:dev
$ErrorActionPreference = "Stop"
$designation = Get-Content (Join-Path $PSScriptRoot "..\.cursor\designation.json") | ConvertFrom-Json
$rules = @(
  @{ Name = "Reraw Dev TCP $($designation.devPort)"; Port = $designation.devPort }
)
foreach ($r in $rules) {
  $existing = netsh advfirewall firewall show rule name="$($r.Name)" 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Rule already exists: $($r.Name)"
    continue
  }
  netsh advfirewall firewall add rule name="$($r.Name)" dir=in action=allow protocol=TCP localport=$($r.Port) | Out-Null
  Write-Host "Added: $($r.Name)"
}
Write-Host "Done. Re-run: node scripts/verify-dev-network.mjs --wait"
