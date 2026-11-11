$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sdkPath = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$imagePath = Join-Path $sdkPath 'system-images\android-36.1\google_apis_playstore\x86_64'
if (-not (Test-Path (Join-Path $imagePath 'system.img'))) { throw 'Immagine Android API 36.1 x86_64 non disponibile.' }
$testRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'work\vault-emulator'))
if (-not $testRoot.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Percorso di test non valido.' }
$env:ANDROID_AVD_HOME = Join-Path $testRoot 'avd'
$env:ANDROID_EMULATOR_HOME = Join-Path $testRoot 'home'
$env:ANDROID_SDK_ROOT = $sdkPath
$profile = Join-Path $env:ANDROID_AVD_HOME 'SpeseProfitVaultTest.avd'
New-Item -ItemType Directory -Force $profile,$env:ANDROID_EMULATOR_HOME | Out-Null
@"
avd.ini.encoding=UTF-8
path=$profile
target=android-36.1
"@ | Set-Content -Encoding ascii (Join-Path $env:ANDROID_AVD_HOME 'SpeseProfitVaultTest.ini')
@"
AvdId=SpeseProfitVaultTest
avd.ini.displayname=SpeseProfit Vault Test
avd.ini.encoding=UTF-8
abi.type=x86_64
image.sysdir.1=$imagePath\
tag.id=google_apis_playstore
target=android-36.1
PlayStore.enabled=false
disk.dataPartition.size=2G
hw.cpu.arch=x86_64
hw.cpu.ncore=2
hw.ramSize=2048
hw.lcd.width=720
hw.lcd.height=1280
hw.lcd.density=320
hw.keyboard=yes
hw.mainKeys=no
hw.sdCard=no
hw.camera.back=none
hw.camera.front=none
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader_indirect
showDeviceFrame=no
fastboot.forceColdBoot=yes
fastboot.forceFastBoot=no
"@ | Set-Content -Encoding ascii (Join-Path $profile 'config.ini')
$emulator = Start-Process -FilePath (Join-Path $sdkPath 'emulator\emulator.exe') -ArgumentList @('-avd','SpeseProfitVaultTest','-port','5580','-no-window','-no-audio','-no-snapshot','-no-boot-anim') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $testRoot 'stdout.log') -RedirectStandardError (Join-Path $testRoot 'stderr.log')
$emulator.Id | Set-Content (Join-Path $testRoot 'emulator.pid')
Write-Output 'Emulatore isolato avviato: emulator-5580; nessun profilo esistente modificato.'
