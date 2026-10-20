[CmdletBinding()]
param([string]$TaskName = 'JailOpsSim')
. (Join-Path $PSScriptRoot 'Common.ps1')
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run this script from an elevated PowerShell session.' }
if (-not (Test-Path (Join-Path $script:JailOpsRoot '.env'))) { throw 'Run Install.ps1 first.' }
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) { throw 'That task already exists. Use Start-ScheduledTask, or unregister it explicitly before creating a replacement.' }
$node = Get-JailOpsNode
Push-Location $script:JailOpsRoot
try {
    $statusText = & $node 'server\manage.js' status
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the configured database.' }
    $status = $statusText | ConvertFrom-Json
} finally { Pop-Location }
if ($status.users -eq 0) { throw 'Create an administrator account with Install.ps1 before registering startup.' }
$database = Split-Path -Parent $status.database
if ([IO.Path]::GetPathRoot($database).TrimEnd('\') -eq $database.TrimEnd('\')) { throw 'Configure DATA_DIR as a dedicated application data folder before registering startup.' }
# Grant the service identity read/execute access to this application and modify access only to its data.
& icacls.exe $script:JailOpsRoot /grant '*S-1-5-19:(OI)(CI)RX' /T /Q | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not grant application read access to LOCAL SERVICE.' }
& icacls.exe $database /grant '*S-1-5-19:(OI)(CI)M' /T /Q | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not grant database access to LOCAL SERVICE.' }
$action = New-ScheduledTaskAction -Execute $node -Argument ('"' + (Join-Path $script:JailOpsRoot 'server\index.js') + '"') -WorkingDirectory $script:JailOpsRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$taskPrincipal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\LOCAL SERVICE' -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $taskPrincipal -Settings $settings -Description 'JailOpsSim React + Node.js operations simulation server' | Out-Null
Start-ScheduledTask -TaskName $TaskName
Write-Host "Registered and started scheduled task: $TaskName"
Write-Host 'Server logs are written to data\logs. Stop any manually started server before starting this task.'
