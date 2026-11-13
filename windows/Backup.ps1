[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$Destination)
. (Join-Path $PSScriptRoot 'Common.ps1')
$node = Get-JailOpsNode
$fullDestination = [IO.Path]::GetFullPath($Destination)
Push-Location $script:JailOpsRoot
try {
    & $node 'server\manage.js' backup $fullDestination
    if ($LASTEXITCODE -ne 0) { throw 'Backup failed. The existing database was not changed.' }
} finally { Pop-Location }
