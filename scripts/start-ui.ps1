param([int]$Port=8081,[string]$ApiUrl='http://127.0.0.1:8001',[switch]$Native)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
$portable=Join-Path (Split-Path -Parent $repoRoot) '.tools/node-v24.22.3-win-x64'
if(Test-Path -LiteralPath (Join-Path $portable 'node.exe')) { $env:Path=$portable+';'+$env:Path }
if(-not(Get-Command node -ErrorAction SilentlyContinue)) { throw 'Cần Node.js LTS trong PATH (hoặc runtime portable của workspace).' }
$env:EXPO_PUBLIC_API_URL=$ApiUrl
Push-Location (Join-Path $repoRoot 'app')
try {
  if(-not(Test-Path -LiteralPath 'node_modules/expo/bin/cli')) { throw 'Chạy npm ci trong app trước.' }
  node scripts/sync-rules.mjs
  if($LASTEXITCODE -ne 0) { throw 'Đồng bộ luật thất bại.' }
  if($Native) { node node_modules/expo/bin/cli start --port $Port }
  else { node node_modules/expo/bin/cli start --web --port $Port }
} finally { Pop-Location }
