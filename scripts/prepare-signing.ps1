param([switch]$ForSigning, [switch]$Json)
$ErrorActionPreference = 'Stop'
# Gradle can inherit a module search path from a different PowerShell version.
foreach ($builtInModule in @('Microsoft.PowerShell.Security','Microsoft.PowerShell.Utility','Microsoft.PowerShell.Management')) {
  Import-Module (Join-Path $PSHOME ("Modules\" + $builtInModule + "\" + $builtInModule + '.psd1')) -ErrorAction Stop
}
if ($Json -and -not $ForSigning) { throw 'Il formato interno richiede il chiamante di firma.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
$signingDir = Join-Path $projectRoot 'work\signing'
$keyFile = Join-Path $signingDir 'speseprofit-local.p12'
$credentialsFile = Join-Path $signingDir 'credentials.json'

function Protect-SigningPath([string]$LiteralPath, [switch]$Directory) {
  $userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $systemSid = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
  $acl = Get-Acl -LiteralPath $LiteralPath
  if ($Directory) {
    $inheritance = [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
  } else {
    $inheritance = [Security.AccessControl.InheritanceFlags]::None
  }
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($existing in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($existing) }
  foreach ($identity in @($userSid,$systemSid)) {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity,'FullControl',$inheritance,'None','Allow'))
  }
  if ($PSVersionTable.PSVersion.Major -ge 6) {
    if ($Directory) { [IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]::new($LiteralPath),$acl) }
    else { [IO.FileSystemAclExtensions]::SetAccessControl([IO.FileInfo]::new($LiteralPath),$acl) }
  } else {
    if ($Directory) { [IO.Directory]::SetAccessControl($LiteralPath,$acl) }
    else { [IO.File]::SetAccessControl($LiteralPath,$acl) }
  }
}
function Save-ProtectedCredential([string]$Password, [string]$Alias) {
  $secure = ConvertTo-SecureString -String $Password -AsPlainText -Force
  try {
    # Windows DPAPI CurrentUser; copying this JSON and keystore does not reveal the password.
    $blob = ConvertFrom-SecureString -SecureString $secure
    $body = @{ version=2; alias=$Alias; protectedPassword=$blob } | ConvertTo-Json
    $staging = Join-Path $signingDir ('.credential-' + [guid]::NewGuid().ToString('N') + '.tmp')
    try {
      [IO.File]::WriteAllText($staging,$body,[Text.UTF8Encoding]::new($false))
      Protect-SigningPath -LiteralPath $staging
      if (Test-Path -LiteralPath $credentialsFile) { [IO.File]::Replace($staging,$credentialsFile,[NullString]::Value) }
      else { [IO.File]::Move($staging,$credentialsFile) }
    } finally {
      if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging }
    }
  } finally { $secure.Dispose() }
}
function Read-ProtectedCredential([string]$Blob) {
  $secure = ConvertTo-SecureString -String $Blob
  $pointer = [IntPtr]::Zero
  try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    $secure.Dispose()
  }
}

try {
New-Item -ItemType Directory -Force $signingDir | Out-Null
Protect-SigningPath -LiteralPath $signingDir -Directory
if ((Test-Path -LiteralPath $keyFile) -xor (Test-Path -LiteralPath $credentialsFile)) { throw 'Firma locale incompleta: nessun file viene sovrascritto.' }
if (-not (Test-Path -LiteralPath $keyFile)) {
  if (-not $env:JAVA_HOME) { $env:JAVA_HOME = Join-Path $env:ProgramFiles 'Java\jdk-17' }
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  $secret = [BitConverter]::ToString($bytes).Replace('-','').ToLowerInvariant()
  [Array]::Clear($bytes,0,$bytes.Length)
  $env:SPESEPROFIT_KEYTOOL_PASSWORD = $secret
  try {
    $keytoolPath = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
    if (-not (Test-Path -LiteralPath $keytoolPath)) { throw 'Keytool non disponibile nel JDK configurato.' }
    $previousErrorPreference = $ErrorActionPreference
    try {
      # PowerShell 5 treats keytool's normal stderr progress as an error with Stop.
      # Check the native exit code, rather than interpreting progress as failure.
      $ErrorActionPreference = 'Continue'
      & $keytoolPath -genkeypair -keystore $keyFile -storetype PKCS12 -alias speseprofit-local -keyalg RSA -keysize 3072 -validity 3650 -dname 'CN=SpeseProfit Local' -storepass:env SPESEPROFIT_KEYTOOL_PASSWORD -keypass:env SPESEPROFIT_KEYTOOL_PASSWORD *> (Join-Path $signingDir 'keytool.log')
      $keytoolExitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousErrorPreference }
    if ($keytoolExitCode -ne 0 -or -not (Test-Path -LiteralPath $keyFile)) { throw 'Creazione firma locale non riuscita.' }
    Save-ProtectedCredential -Password $secret -Alias 'speseprofit-local'
  } finally { Remove-Item Env:SPESEPROFIT_KEYTOOL_PASSWORD -ErrorAction SilentlyContinue; $secret=$null }
}
$credentials = Get-Content -LiteralPath $credentialsFile -Raw | ConvertFrom-Json
if (-not ($credentials.alias -is [string]) -or -not $credentials.alias) { throw 'Alias della firma locale non valido.' }
if ($credentials.PSObject.Properties.Name -contains 'password') {
  if (-not ($credentials.password -is [string]) -or -not $credentials.password) { throw 'Credenziale locale non valida.' }
  Save-ProtectedCredential -Password $credentials.password -Alias $credentials.alias
  $credentials = Get-Content -LiteralPath $credentialsFile -Raw | ConvertFrom-Json
}
if ($credentials.version -ne 2 -or -not ($credentials.protectedPassword -is [string]) -or -not $credentials.protectedPassword) { throw 'Credenziale protetta non valida. Nessuna chiave viene rigenerata.' }
Protect-SigningPath -LiteralPath $keyFile
Protect-SigningPath -LiteralPath $credentialsFile
$public = @{path=$keyFile;alias=$credentials.alias}
if ($ForSigning) {
  $secret = Read-ProtectedCredential -Blob $credentials.protectedPassword
  if (-not $secret) { throw 'Credenziale protetta non disponibile per questo utente Windows.' }
  try {
    $result = @{path=$keyFile;alias=$credentials.alias;password=$secret}
    if ($Json) { $result | ConvertTo-Json -Compress } else { $result }
  } finally { $secret=$null }
} else { $public }

} catch {
  if ($Json) {
    $safeCategory = $_.CategoryInfo.Category.ToString()
    $safeType = $_.Exception.GetType().Name
    $safeCommand = if ($_.Exception.CommandName -match '^[A-Za-z][A-Za-z-]+$') { $_.Exception.CommandName } else { 'Internal' }
    [Console]::Error.WriteLine("SigningCredentialError:$safeCategory" + ":$safeType" + ":$safeCommand")
    exit 1
  }
  throw
}
