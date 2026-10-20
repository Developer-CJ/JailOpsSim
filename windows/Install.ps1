[CmdletBinding()]
param(
    [ValidateRange(1, 65535)][int]$Port = 3000,
    [ValidateSet('127.0.0.1', '0.0.0.0')][string]$BindAddress = '127.0.0.1'
)
. (Join-Path $PSScriptRoot 'Common.ps1')
Set-Location $script:JailOpsRoot
$node = Get-JailOpsNode
if (-not (Test-Path 'dist\index.html') -or -not (Test-Path 'node_modules\express\package.json')) {
    throw 'The deployment files are incomplete. Extract the entire Windows deployment ZIP, including dist and node_modules.'
}
if (-not (Test-Path '.env')) {
    @("HOST=$BindAddress", "PORT=$Port", 'DATA_DIR=./data', 'COOKIE_SECURE=false', 'TRUST_PROXY=false') | Set-Content '.env' -Encoding ASCII
    Write-Host 'Created .env. Existing installations retain their configuration and database.'
} else { Write-Host 'Existing .env retained. Change HOST or PORT there if required.' }
$statusText = & $node 'server\manage.js' status
if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed.' }
$status = $statusText | ConvertFrom-Json
if ($status.users -eq 0) {
    Write-Host 'Create your first administrator account. There is no default password.'
    & (Join-Path $PSScriptRoot 'New-User.ps1') -Role admin
} else { Write-Host ('Database ready. Existing accounts: ' + $status.users) }
Write-Host 'Installation complete. Run .\windows\Start.ps1 to start the full application.'
Write-Host 'For automatic startup, run .\windows\Register-StartupTask.ps1 from an elevated PowerShell session.'
