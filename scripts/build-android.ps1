param([ValidateSet('apk', 'standalone', 'native', 'test')][string]$Target = 'apk', [ValidateSet('arm64-v8a','x86_64')][string]$Architecture = 'arm64-v8a')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $env:JAVA_HOME) {
  $localJdk = Join-Path $env:ProgramFiles 'Java\jdk-17'
  if (Test-Path (Join-Path $localJdk 'bin\java.exe')) { $env:JAVA_HOME = $localJdk }
}
if (-not $env:JAVA_HOME) { throw 'Configura JAVA_HOME verso un JDK 17 prima di compilare.' }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path $env:ANDROID_HOME)) { throw 'Installa Android SDK e configura ANDROID_HOME.' }
$buildRoot = $projectRoot
$env:ANDROID_USER_HOME = Join-Path $buildRoot 'work\android-home'
$env:GRADLE_USER_HOME = Join-Path $buildRoot 'work\gradle-home'
$env:TEMP = Join-Path $buildRoot 'work\tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force $env:ANDROID_USER_HOME,$env:GRADLE_USER_HOME,$env:TEMP | Out-Null
$env:NODE_ENV = if ($Target -eq 'standalone') { 'production' } else { 'development' }
$env:EXPO_NO_CACHE = '1'
$env:__UNSAFE_EXPO_HOME_DIRECTORY = Join-Path $projectRoot 'work\expo-home'
$env:JAVA_TOOL_OPTIONS = '-Xmx512m -XX:MaxMetaspaceSize=256m'
$env:CMAKE_BUILD_PARALLEL_LEVEL = '1'
if ($Target -eq 'standalone') {
  if ($Architecture -ne 'arm64-v8a') { throw 'La consegna standalone e configurata per ARM64.' }
  $null = & (Join-Path $PSScriptRoot 'prepare-signing.ps1')
}
$gradlePath = Join-Path $projectRoot 'android\gradlew.bat'
if (-not (Test-Path $gradlePath)) { throw 'Esegui prima npm run prebuild:android.' }
$buildTask = switch ($Target) { 'native' { ':speseprofit-native:compileDebugKotlin' } 'test' { ':speseprofit-native:connectedDebugAndroidTest' } 'standalone' { ':app:assembleRelease' } default { ':app:assembleDebug' } }
Push-Location $projectRoot
try {
  & $gradlePath -p (Join-Path $projectRoot 'android') $buildTask "-PreactNativeArchitectures=$Architecture" --no-daemon
  $buildExitCode = $LASTEXITCODE
  if ($buildExitCode -eq 0 -and $Target -eq 'standalone') {
    & (Join-Path $PSScriptRoot 'package-android.ps1')
  }
} finally {
  Pop-Location
}
exit $buildExitCode
