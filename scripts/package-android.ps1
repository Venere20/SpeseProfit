$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = Join-Path $env:ProgramFiles 'Java\jdk-17' }
$sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$tools = Join-Path $sdkRoot 'build-tools\36.0.0'
$source = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $source)) { throw 'Compila prima la variante standalone.' }
$destination = Join-Path $projectRoot 'work\distribution'
New-Item -ItemType Directory -Force $destination | Out-Null
$apk = Join-Path $destination 'SpeseProfit-0.1.0-arm64.apk'
$signing = & (Join-Path $PSScriptRoot 'prepare-signing.ps1') -ForSigning
$env:SPESEPROFIT_APK_PASSWORD = $signing.password
try {
  # Replaces any template debug signature; the delivered APK has our private key.
  & (Join-Path $tools 'apksigner.bat') sign --ks $signing.path --ks-key-alias $signing.alias --ks-pass env:SPESEPROFIT_APK_PASSWORD --key-pass env:SPESEPROFIT_APK_PASSWORD --out $apk $source
  if ($LASTEXITCODE -ne 0) { throw 'Firma APK fallita.' }
} finally { Remove-Item Env:SPESEPROFIT_APK_PASSWORD -ErrorAction SilentlyContinue }
$verification = & (Join-Path $tools 'apksigner.bat') verify --verbose --print-certs $apk
if ($LASTEXITCODE -ne 0 -or -not ($verification -match 'CN=SpeseProfit Local')) { throw 'Verifica della firma privata fallita.' }
$verification | Set-Content -Encoding utf8 (Join-Path $destination 'signature.txt')
$badging = & (Join-Path $tools 'aapt2.exe') dump badging $apk
if ($LASTEXITCODE -ne 0) { throw 'Verifica pacchetto fallita.' }
if ($badging -match '^application-debuggable') { throw 'APK di debug: consegna rifiutata.' }
if (-not ($badging -match "native-code: 'arm64-v8a'")) { throw 'Architettura inattesa.' }
$badging | Set-Content -Encoding utf8 (Join-Path $destination 'package.txt')
$manifest = & (Join-Path $tools 'aapt2.exe') dump xmltree $apk --file AndroidManifest.xml
if ($LASTEXITCODE -ne 0) { throw 'Manifest non leggibile.' }
$manifest | Set-Content -Encoding utf8 (Join-Path $destination 'manifest.txt')
if (-not ($manifest -match 'allowBackup.*0x0') -or -not ($manifest -match 'usesCleartextTraffic.*0x0')) { throw 'Configurazione privacy release inattesa.' }
if ($manifest -match 'android.permission.(SYSTEM_ALERT_WINDOW|VIBRATE|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|READ_MEDIA_)') { throw 'Permessi superflui nel pacchetto.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($apk)
try {
  $bundle = $zip.GetEntry('assets/index.android.bundle')
  if (-not $bundle -or $bundle.Length -lt 1000) { throw 'Bundle JavaScript offline assente.' }
  if (-not ($zip.Entries.FullName -contains 'lib/arm64-v8a/libsqlcipher.so')) { throw 'SQLCipher ARM64 assente.' }
  if ($zip.Entries.FullName -match '\.(p12|jks|keystore)$') { throw 'Materiale di firma incluso nel pacchetto.' }
  $reader = [IO.StreamReader]::new($bundle.Open(), [Text.Encoding]::UTF8)
  try { $bundleText = $reader.ReadToEnd(); if ($bundleText.Contains($signing.password)) { throw 'Segreto di firma nel bundle.' } }
  finally { $reader.Dispose(); $bundleText = $null }
} finally { $zip.Dispose() }
$hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  SpeseProfit-0.1.0-arm64.apk" | Set-Content (Join-Path $destination 'SHA256SUMS.txt')
Write-Output "APK firmato e verificato: $apk"
Write-Output "SHA256: $hash"
