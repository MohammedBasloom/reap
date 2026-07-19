# One-time: turn reapapp.netlify.app into a permanent redirect to GitHub Pages.
# Run once when Netlify credits are available — after this, no Netlify deploys
# are ever needed again; all updates go through GitHub (deploy-github.ps1).
param([string]$Site = "reapapp.netlify.app")

$token = $env:NETLIFY_AUTH_TOKEN
foreach ($name in @(".netlify-token", "netlify-token.txt")) {
  if ($token) { break }
  $f = Join-Path $PSScriptRoot $name
  if (Test-Path $f) { $token = (Get-Content $f -Raw).Trim() }
}
if (-not $token) { Write-Error "No Netlify token found."; exit 1 }

$zip = Join-Path $env:TEMP "reap-redirect.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
[void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $PSScriptRoot "netlify-redirect\_redirects"), "_redirects")
$archive.Dispose()

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$resp = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites/$Site/deploys" `
  -Method Post -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/zip" -InFile $zip

Write-Output "Redirect deployed: state=$($resp.state)"
Write-Output "reapapp.netlify.app now forwards to https://mohammedbasloom.github.io/reap/"
