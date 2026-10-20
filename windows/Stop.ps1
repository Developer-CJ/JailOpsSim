[CmdletBinding()]
param([string]$TaskName = 'JailOpsSim')
$ErrorActionPreference = 'Stop'
Stop-ScheduledTask -TaskName $TaskName
Write-Host "Stopped scheduled task: $TaskName"
