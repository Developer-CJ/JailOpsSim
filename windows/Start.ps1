[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'Common.ps1')
Set-Location $script:JailOpsRoot
if (-not (Test-Path '.env')) { throw 'Run .\windows\Install.ps1 first.' }
$node = Get-JailOpsNode
& $node 'server\index.js'
exit $LASTEXITCODE
