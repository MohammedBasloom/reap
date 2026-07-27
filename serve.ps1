# Minimal static file server for the REAP app (no Node/Python required).
param([int]$Port = 8321)

$root = $PSScriptRoot
$mime = @{
  ".html"="text/html; charset=utf-8"; ".htm"="text/html; charset=utf-8"
  ".js"="application/javascript; charset=utf-8"; ".jsx"="text/babel; charset=utf-8"
  ".css"="text/css; charset=utf-8"; ".json"="application/json; charset=utf-8"
  ".png"="image/png"; ".jpg"="image/jpeg"; ".jpeg"="image/jpeg"; ".gif"="image/gif"
  ".svg"="image/svg+xml"; ".ico"="image/x-icon"; ".woff"="font/woff"; ".woff2"="font/woff2"; ".ttf"="font/ttf"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    # Build helper: POST /save?name=<file> writes the request body to build/<file>.
    if ($ctx.Request.HttpMethod -eq "POST" -and $ctx.Request.Url.AbsolutePath -eq "/save") {
      $name = $ctx.Request.QueryString["name"]
      if ($name -and $name -notmatch '[\\/:]') {
        $buildDir = Join-Path $root "build"
        if (-not (Test-Path $buildDir)) { New-Item -ItemType Directory $buildDir | Out-Null }
        $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream, [System.Text.Encoding]::UTF8)
        $body = $reader.ReadToEnd()
        [System.IO.File]::WriteAllText((Join-Path $buildDir $name), $body, (New-Object System.Text.UTF8Encoding($false)))
        $ok = [System.Text.Encoding]::UTF8.GetBytes("saved $name ($($body.Length) chars)")
        $ctx.Response.OutputStream.Write($ok, 0, $ok.Length)
      } else {
        $ctx.Response.StatusCode = 400
      }
      $ctx.Response.OutputStream.Close()
      continue
    }
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrEmpty($rel)) { $rel = "index.html" }
    $path = Join-Path $root $rel
    $full = [System.IO.Path]::GetFullPath($path)
    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    try { $ctx.Response.StatusCode = 500 } catch {}
  } finally {
    try { $ctx.Response.OutputStream.Close() } catch {}
  }
}
