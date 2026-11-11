$ErrorActionPreference = 'Stop'
$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('speseprofit-signing-test-' + [guid]::NewGuid().ToString('N'))
$fixtureScripts = Join-Path $fixtureRoot 'scripts'
$fixtureSigning = Join-Path $fixtureRoot 'work\signing'
try {
  New-Item -ItemType Directory -Force $fixtureScripts,$fixtureSigning | Out-Null
  $helper = Join-Path $fixtureScripts 'prepare-signing.ps1'
  Copy-Item -LiteralPath (Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts\prepare-signing.ps1') -Destination $helper
  $key = Join-Path $fixtureSigning 'speseprofit-local.p12'
  $credentials = Join-Path $fixtureSigning 'credentials.json'
  # Synthetic bytes only: exercising credential handling must never touch the real signing key.
  [IO.File]::WriteAllText($key, 'ONLY_SYNTHETIC_KEY_BYTES')
  $syntheticSecret = 'fixture-secret-' + [guid]::NewGuid().ToString('N')
  @{password=$syntheticSecret;alias='speseprofit-local'} | ConvertTo-Json | Set-Content -LiteralPath $credentials -Encoding utf8
  $before = (Get-FileHash -LiteralPath $key -Algorithm SHA256).Hash
  $public = & $helper
  if ($public.Keys -contains 'password' -or ($public | ConvertTo-Json -Compress).Contains($syntheticSecret)) { throw 'Default invocation exposes the synthetic secret.' }
  $storedText = Get-Content -LiteralPath $credentials -Raw
  $stored = $storedText | ConvertFrom-Json
  if ($stored.PSObject.Properties.Name -contains 'password' -or $storedText.Contains($syntheticSecret) -or -not $stored.protectedPassword) { throw 'Legacy plaintext was not migrated.' }
  $private = & $helper -ForSigning
  if ($private.password -ne $syntheticSecret) { throw 'Credential round trip failed.' }
  $json = & $helper -ForSigning -Json | ConvertFrom-Json
  if ($json.password -ne $syntheticSecret) { throw 'Gradle JSON contract failed.' }
  $originalModulePath = $env:PSModulePath
  try {
    $env:PSModulePath = ''
    $isolatedJson = & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $helper -ForSigning -Json
    if ($LASTEXITCODE -ne 0) { throw 'Signing caller failed without an inherited module path.' }
    $isolatedCredential = $isolatedJson | ConvertFrom-Json
    if ($isolatedCredential.password -ne $syntheticSecret) { throw 'Isolated Gradle caller returned an invalid credential.' }
  } finally { $env:PSModulePath = $originalModulePath }

  if ((Get-FileHash -LiteralPath $key -Algorithm SHA256).Hash -ne $before) { throw 'Existing synthetic key changed.' }
  $second = & $helper
  if ($second.Keys -contains 'password') { throw 'Repeated public invocation exposes credentials.' }
  $allowed = @([Security.Principal.WindowsIdentity]::GetCurrent().User.Value, 'S-1-5-18')
  foreach ($file in @($fixtureSigning,$key,$credentials)) {
    $acl = Get-Acl -LiteralPath $file
    if (-not $acl.AreAccessRulesProtected) { throw 'Signing ACL still inherits permissions.' }
    foreach ($entry in $acl.Access) {
      if ($entry.AccessControlType -eq 'Allow' -and $entry.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed) { throw 'Unexpected signing ACL principal.' }
    }
  }
  $stored.protectedPassword = 'invalid-encrypted-credential'
  $stored | ConvertTo-Json | Set-Content -LiteralPath $credentials -Encoding utf8
  $rejected = $false
  try { $null = & $helper -ForSigning } catch { $rejected = $true }
  if (-not $rejected) { throw 'Damaged protected credential was accepted.' }
  if ((Get-FileHash -LiteralPath $key -Algorithm SHA256).Hash -ne $before) { throw 'Failure rotated the synthetic key.' }
  Remove-Item -LiteralPath $credentials
  $rejected = $false
  try { $null = & $helper } catch { $rejected = $true }
  if (-not $rejected) { throw 'Incomplete signing pair was accepted.' }
  Remove-Item -LiteralPath $key
  $fresh = & $helper
  if ($fresh.Keys -contains 'password' -or -not (Test-Path -LiteralPath $key)) { throw 'Fresh creation did not preserve public output.' }
  $freshHash = (Get-FileHash -LiteralPath $key -Algorithm SHA256).Hash
  $freshSecret = & $helper -ForSigning
  $env:SPESEPROFIT_TEST_STORE_PASSWORD = $freshSecret.password
  try {
    & (Join-Path $env:JAVA_HOME 'bin\keytool.exe') -list -keystore $key -storetype PKCS12 -alias speseprofit-local -storepass:env SPESEPROFIT_TEST_STORE_PASSWORD *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Synthetic new keystore cannot be opened.' }
  } finally { Remove-Item Env:SPESEPROFIT_TEST_STORE_PASSWORD -ErrorAction SilentlyContinue }
  $null = & $helper
  if ((Get-FileHash -LiteralPath $key -Algorithm SHA256).Hash -ne $freshHash) { throw 'Fresh key rotated on second invocation.' }
  Write-Output 'PASS: default redaction, plaintext migration, DPAPI round trip, Gradle contract, ACL, key preservation, damaged secret and incomplete pair.'
} finally {
  $resolvedFixture = [IO.Path]::GetFullPath($fixtureRoot)
  $resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
  if (-not $resolvedFixture.StartsWith($resolvedTemp,[StringComparison]::OrdinalIgnoreCase) -or -not ([IO.Path]::GetFileName($resolvedFixture)).StartsWith('speseprofit-signing-test-')) { throw 'Unsafe fixture cleanup target.' }
  if (Test-Path -LiteralPath $resolvedFixture) { Remove-Item -LiteralPath $resolvedFixture -Recurse -Force }
}
