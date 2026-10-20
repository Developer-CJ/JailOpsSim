Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:JailOpsRoot = Split-Path -Parent $PSScriptRoot

function Get-JailOpsNode {
    $bundled = Join-Path $script:JailOpsRoot 'runtime\node.exe'
    if (Test-Path $bundled) { $node = $bundled }
    else {
        $command = Get-Command node.exe -ErrorAction SilentlyContinue
        if (-not $command) { throw 'Node.js 24 is required. Use the deployment ZIP containing runtime\node.exe.' }
        $node = $command.Source
    }
    $version = & $node --version
    if ($LASTEXITCODE -ne 0 -or $version -notmatch '^v24\.') { throw 'This application requires the included Node.js 24 runtime.' }
    return $node
}
