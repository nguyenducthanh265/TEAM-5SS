# Dựng khung Expo quanh mã nguồn đã có trong app/src. Cần Node.js LTS (node, npm, npx trong PATH).
#   powershell -ExecutionPolicy Bypass -File scripts\setup-app.ps1
# Chạy lại được: không ghi đè app/src, chỉ tạo lại file cấu hình khi chưa có package.json.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$app = Join-Path $root 'app'

foreach ($c in 'node', 'npm', 'npx') {
    if (-not (Get-Command $c -ErrorAction SilentlyContinue)) {
        Write-Host "RESULT: FAIL thiếu $c. Cài Node.js LTS (winget install OpenJS.NodeJS.LTS) rồi mở lại terminal."
        exit 1
    }
}

if (-not (Test-Path (Join-Path $app 'package.json'))) {
    $tmp = Join-Path $env:TEMP ("ecohanoi-scaffold-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
    New-Item -ItemType Directory -Force $tmp | Out-Null
    Push-Location $tmp
    npx --yes create-expo-app@latest scaffold --template blank-typescript --no-install
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host 'RESULT: FAIL create-expo-app'; exit 1 }
    Pop-Location
    $sc = Join-Path $tmp 'scaffold'
    foreach ($f in 'package.json', 'tsconfig.json', 'app.json') { Copy-Item (Join-Path $sc $f) (Join-Path $app $f) }
    New-Item -ItemType Directory -Force (Join-Path $app 'assets') | Out-Null
    Get-ChildItem (Join-Path $sc 'assets') -File | ForEach-Object {
        $dest = Join-Path $app (Join-Path 'assets' $_.Name)
        if (-not (Test-Path $dest)) { Copy-Item $_.FullName $dest }
    }
    Remove-Item -Recurse -Force $tmp
}

Push-Location $app
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install' }
    npx expo install expo-router expo-camera expo-haptics react-native-reanimated react-native-worklets expo-image-manipulator `
        '@react-native-async-storage/async-storage' react-native-safe-area-context react-native-screens react-native-gesture-handler `
        expo-linking expo-constants expo-status-bar expo-asset expo-file-system '@expo/vector-icons'
    if ($LASTEXITCODE -ne 0) { throw 'expo install' }
    npx expo install --dev jest jest-expo '@types/jest'
    if ($LASTEXITCODE -ne 0) { throw 'expo install --dev' }
    node ..\scripts\patch-app-config.mjs
    if ($LASTEXITCODE -ne 0) { throw 'patch-app-config' }
    node scripts\sync-rules.mjs
    if ($LASTEXITCODE -ne 0) { throw 'sync-rules' }
    npx tsc --noEmit
    $tsc = $LASTEXITCODE
    npx jest --ci
    $jest = $LASTEXITCODE
}
catch {
    Pop-Location
    Write-Host "RESULT: FAIL $_"
    exit 1
}
Pop-Location
if ($tsc -eq 0 -and $jest -eq 0) { Write-Host 'RESULT: PASS khung app sẵn sàng (tsc sạch, jest qua)'; exit 0 }
Write-Host "RESULT: FAIL tsc=$tsc jest=$jest (khung đã dựng; sửa lỗi kiểu/test rồi chạy lại npx tsc --noEmit và npx jest trong app/)"
exit 1
