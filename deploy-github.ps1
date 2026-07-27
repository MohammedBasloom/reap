# Deploy REAP to GitHub Pages — free, no deploy caps.
# One-time: save a GitHub personal access token (classic, "repo" scope)
# as the only line of D:\REAP\.github-token
param([string]$Repo = "reap", [string]$Message = "Update site")

$tokenFile = Join-Path $PSScriptRoot ".github-token"
$token = $env:GITHUB_TOKEN
foreach ($name in @(".github-token", "github-token.txt", ".github-token.txt")) {
  if ($token) { break }
  $f = Join-Path $PSScriptRoot $name
  if (Test-Path $f) { $token = (Get-Content $f -Raw).Trim() }
}
if (-not $token) { Write-Error "No GitHub token. Create one at github.com/settings/tokens (classic, 'repo' scope) and save it to $tokenFile"; exit 1 }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$H = @{ Authorization = "token $token"; "User-Agent" = "reap-deploy"; Accept = "application/vnd.github+json" }

# Who am I?
$me = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $H
$login = $me.login
Write-Output "GitHub user: $login"

# Ensure the repo exists (public — required for free GitHub Pages)
$repoExists = $true
try { Invoke-RestMethod -Uri "https://api.github.com/repos/$login/$Repo" -Headers $H | Out-Null }
catch { $repoExists = $false }
if (-not $repoExists) {
  Write-Output "Creating repo $login/$Repo..."
  Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $H -Method Post -ContentType "application/json" `
    -Body (@{ name = $Repo; description = "REAP - Real Estate Assessment Platform"; homepage = "https://$login.github.io/$Repo/" } | ConvertTo-Json) | Out-Null
}

# Commit local changes
Set-Location $PSScriptRoot
if (-not (Test-Path ".git")) { git init -b main | Out-Null }
if (-not (git config user.email)) { git config user.name "Mohammed Basloom"; git config user.email "moh.baslom@gmail.com" }
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { git commit -m $Message | Out-Null; Write-Output "Committed: $Message" } else { Write-Output "No changes to commit" }

# Push (token used per-invocation, never stored in git config).
# Integrate any remote-only commits first (e.g. a CNAME added on GitHub),
# then push. NEVER report success on a failed push.
$remote = "https://x-access-token:$token@github.com/$login/$Repo.git"
git fetch $remote main 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
  # Rebase local work onto the current remote tip so the push fast-forwards.
  git rebase FETCH_HEAD 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { git rebase --abort 2>&1 | Out-Null; Write-Error "Rebase onto remote main failed (conflict). Resolve manually, then re-run."; exit 1 }
}
git push $remote HEAD:main 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "PUSH FAILED - nothing deployed. Remote may have diverged; resolve and retry."; exit 1 }
Write-Output "Pushed to github.com/$login/$Repo"

# Enable GitHub Pages from the main branch (idempotent)
try {
  Invoke-RestMethod -Uri "https://api.github.com/repos/$login/$Repo/pages" -Headers $H -Method Post -ContentType "application/json" `
    -Body (@{ source = @{ branch = "main"; path = "/" } } | ConvertTo-Json) | Out-Null
  Write-Output "GitHub Pages enabled"
} catch {
  # 409 = already enabled
}

Write-Output "Live at: https://$login.github.io/$Repo/  (first build takes ~1 minute)"
