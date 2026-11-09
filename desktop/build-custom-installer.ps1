$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$package = Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
$version = $package.version
$releaseDir = Join-Path $projectRoot ("release-{0}\nsis-web" -f $version)
$engineName = "Sams-Canvas-Update-Engine-$version.exe"
$setupName = "Sams-Canvas-Setup-$version.exe"
$customSetupName = "Sams-Canvas-Setup-$version.exe"
$oldSetup = Join-Path $releaseDir $setupName
$engine = Join-Path $releaseDir $engineName
$customSetup = Join-Path $projectRoot ("installer\out\SamsCanvasSetup.exe")
$finalSetup = Join-Path $releaseDir $customSetupName
$manifestPath = Join-Path $releaseDir 'latest.yml'
$manifest = Get-Content -LiteralPath $manifestPath -Raw
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'

function Get-Sha256Hex([string]$Path) {
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($algorithm.ComputeHash([System.IO.File]::ReadAllBytes($Path))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
}

if (-not (Test-Path -LiteralPath $compiler)) { throw "The built-in .NET Framework compiler was not found: $compiler" }
if (-not (Test-Path -LiteralPath $oldSetup) -and -not (Test-Path -LiteralPath $engine)) { throw "electron-builder did not produce the update engine: $oldSetup" }
if (-not (Test-Path -LiteralPath $manifestPath)) { throw "electron-builder did not produce latest.yml: $manifestPath" }

$source = Join-Path $projectRoot 'installer\SamsCanvasSetup.cs'
$icon = Join-Path $projectRoot 'dist\app.ico'
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ "/out:$customSetup" "/win32icon:$icon" /reference:System.dll /reference:System.Core.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.Web.Extensions.dll $source
if ($LASTEXITCODE -ne 0) { throw "Could not compile custom setup (csc exit $LASTEXITCODE)." }

if ($manifest -notmatch '(?m)^customInstaller:' -and (Test-Path -LiteralPath $oldSetup)) {
    Move-Item -LiteralPath $oldSetup -Destination $engine -Force
}
if (-not (Test-Path -LiteralPath $engine)) { throw "The silent update engine is missing: $engine" }
Copy-Item -LiteralPath $customSetup -Destination $finalSetup -Force
$manifestParts = [regex]::Split($manifest, '(?m)^packages:', 2)
if ($manifestParts.Count -ne 2) { throw "The updater manifest has no x64 package section: $manifestPath" }
$mainManifest = $manifestParts[0]
$packageManifest = 'packages:' + $manifestParts[1]
$setupSha = [Convert]::ToBase64String(([System.Security.Cryptography.SHA512]::Create()).ComputeHash([System.IO.File]::ReadAllBytes($finalSetup)))
$engineSha = [BitConverter]::ToString(([System.Security.Cryptography.SHA256]::Create()).ComputeHash([System.IO.File]::ReadAllBytes($engine))).Replace('-', '').ToLowerInvariant()
$mainManifest = [regex]::Replace($mainManifest, '(?m)^  - url: .+$', "  - url: $customSetupName")
$mainManifest = [regex]::Replace($mainManifest, '(?m)^path: .+$', "path: $customSetupName")
$mainManifest = [regex]::Replace($mainManifest, '(?m)^sha512: .+$', "sha512: $setupSha")
$mainManifest = [regex]::Replace($mainManifest, '(?m)^(    sha512: ).+$', "`${1}$setupSha")
$manifest = $mainManifest + "customInstaller:`r`n  engine: $engineName`r`n  engineSha256: $engineSha`r`n" + $packageManifest
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($manifestPath, $manifest, $utf8NoBom)

Write-Host "Created the branded setup: $finalSetup"
Write-Host "Kept the silent engine for in-app updates: $engine"
