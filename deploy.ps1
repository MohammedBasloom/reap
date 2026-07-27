# Deploy the REAP app to Netlify via the API (no Node/CLI required).
# Token: set $env:NETLIFY_AUTH_TOKEN, or save it as the only line of D:\REAP\.netlify-token
param([string]$Site = "reapapp.netlify.app")

$token = $env:NETLIFY_AUTH_TOKEN
foreach ($name in @(".netlify-token", "netlify-token.txt", ".netlify-token.txt")) {
  if ($token) { break }
  $f = Join-Path $PSScriptRoot $name
  if (Test-Path $f) { $token = (Get-Content $f -Raw).Trim() }
}
$tokenFile = Join-Path $PSScriptRoot ".netlify-token"
if (-not $token) { Write-Error "No Netlify token. Create one at app.netlify.com/user/applications and save it to $tokenFile"; exit 1 }

# Stage only what the site needs (no server script, build helpers, or secrets)
$staging = Join-Path $env:TEMP "reap-deploy-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory $staging | Out-Null
foreach ($f in @("index.html", "model.html", "valuation.html")) {
  Copy-Item (Join-Path $PSScriptRoot $f) $staging
}
foreach ($d in @("src", "assets", "vendor")) {
  Copy-Item (Join-Path $PSScriptRoot $d) (Join-Path $staging $d) -Recurse
}

# Build the zip with .NET so entry names use forward slashes — PS 5.1's
# Compress-Archive writes backslashes, which Netlify treats as flat filenames.
$zip = Join-Path $env:TEMP "reap-deploy.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem $staging -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($staging.Length + 1).Replace("\", "/")
  [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $rel)
}
$archive.Dispose()

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$resp = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites/$Site/deploys" `
  -Method Post -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/zip" -InFile $zip

Write-Output "Deploy submitted: state=$($resp.state), id=$($resp.id)"
Write-Output "Live at: $($resp.ssl_url)"
