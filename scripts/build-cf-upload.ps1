# Cloudflare Pages Direct Upload: build dist + ZIP with forward slashes in entry names.
# File is ASCII-only so Windows PowerShell 5.1 parses it on any system code page.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not $env:PATH.Contains("nodejs")) {
  $nodeDir = "C:\Program Files\nodejs"
  if (Test-Path $nodeDir) { $env:PATH = "$nodeDir;$env:PATH" }
}

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$distPath = Join-Path $root "dist"
if (-not (Test-Path -LiteralPath $distPath)) {
  Write-Error "dist folder missing after build."
}

$indexHtml = Join-Path $distPath "index.html"
if (-not (Test-Path -LiteralPath $indexHtml)) {
  Write-Error "dist must contain index.html at root."
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = Join-Path $root "cloudflare-pages-upload.zip"
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }

$distRoot = (Resolve-Path -LiteralPath $distPath).Path.TrimEnd('\')
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

try {
  Get-ChildItem -LiteralPath $distPath -Recurse -File | ForEach-Object {
    $full = $_.FullName
    $rel = $full.Substring($distRoot.Length).TrimStart('\')
    if ([string]::IsNullOrEmpty($rel)) { return }
    $entryName = $rel -replace '\\', '/'
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $full,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    )
  }
}
finally {
  $zip.Dispose()
}

$readZip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$bad = @()
try {
  foreach ($e in $readZip.Entries) {
    if ($e.FullName.Contains('\')) { $bad += $e.FullName }
  }
  $entryCount = $readZip.Entries.Count
}
finally {
  $readZip.Dispose()
}

if ($bad.Count -gt 0) {
  Write-Error ("ZIP has backslashes in names: " + ($bad -join "; "))
}

# Local /... refs in index.html must exist under dist (skip // and http).
$htmlRaw = Get-Content -LiteralPath $indexHtml -Raw
$htmlPattern = '(?:src|href)="(/[^"]+)"'
foreach ($m in [regex]::Matches($htmlRaw, $htmlPattern)) {
  $p = $m.Groups[1].Value
  if ($p.StartsWith("//")) { continue }
  if ($p -match '^(?i)https?:') { continue }
  $relFs = $p.TrimStart('/') -replace '/', [System.IO.Path]::DirectorySeparatorChar
  $fs = Join-Path $distPath $relFs
  if (-not (Test-Path -LiteralPath $fs)) {
    Write-Error ("index.html points to " + $p + " but file missing: " + $fs)
  }
}

Write-Host ("OK: " + $zipPath + " | " + $entryCount + " entries | paths use /")
