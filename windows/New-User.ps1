[CmdletBinding()]
param([ValidateSet('admin', 'operator')][string]$Role = 'operator')
. (Join-Path $PSScriptRoot 'Common.ps1')
$node = Get-JailOpsNode
$username = Read-Host 'Username (3-40 letters, digits, dots, underscores, or hyphens)'
$securePassword = Read-Host 'Password (12-128 characters)' -AsSecureString
$confirmation = Read-Host 'Confirm password' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$confirmPointer = [IntPtr]::Zero
try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $confirmPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmation)
    $clearPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $confirmText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPointer)
    if ($clearPassword -cne $confirmText) { throw 'Passwords do not match. No account was created.' }
    $payload = @{ username = $username; password = $clearPassword; role = $Role } | ConvertTo-Json -Compress
    # ASCII JSON escapes preserve Unicode passwords through Windows PowerShell 5.1's default pipe encoding.
    $payload = [regex]::Replace($payload, '[^\x00-\x7F]', { param($match) '\u{0:x4}' -f [int][char]$match.Value })
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $node
    $info.Arguments = '"' + (Join-Path $script:JailOpsRoot 'server\manage.js') + '" create-user'
    $info.WorkingDirectory = $script:JailOpsRoot
    $info.UseShellExecute = $false
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    [void]$process.Start()
    $process.StandardInput.WriteLine($payload)
    $process.StandardInput.Close()
    $output = $process.StandardOutput.ReadToEnd()
    $errorOutput = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw ('Account creation failed: ' + $errorOutput.Trim()) }
    Write-Host $output.Trim()
    $process.Dispose()
} finally {
    if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
    if ($confirmPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPointer) }
    $clearPassword = $null; $confirmText = $null; $payload = $null
    $securePassword.Dispose(); $confirmation.Dispose()
}
