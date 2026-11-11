package it.speseprofit.nativebridge

import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.security.KeyStore
import java.util.UUID

/** Device-only tests. Each test has its own files AND Keystore alias. */
@RunWith(AndroidJUnit4::class)
class ProtectedVaultTest {
  private lateinit var context: Context
  private lateinit var name: String
  private lateinit var vault: ProtectedVault
  private val password = "prova archivio fittizio alfa"
  private val replacement = "prova archivio fittizio beta"
  private val payload = """{"version":1,"marker":"ONLY_FICTITIOUS_TEST_PAYLOAD"}"""
  @Before fun setup() {
    context = InstrumentationRegistry.getInstrumentation().targetContext
    name = "speseprofit-test-${UUID.randomUUID()}"
    vault = ProtectedVault(context, true, name)
  }
  @After fun cleanup() {
    vault.dispose()
    check(name.startsWith("speseprofit-test-"))
    context.deleteDatabase("$name.db")
    android.util.AtomicFile(java.io.File(context.noBackupFilesDir, "$name.key")).delete()
    context.getSharedPreferences("${name}_attempts", Context.MODE_PRIVATE).edit().clear().commit()
    context.getSharedPreferences("${name}_session", Context.MODE_PRIVATE).edit().clear().commit()
    KeyStore.getInstance("AndroidKeyStore").apply { load(null); deleteEntry(name) }
  }
  private fun rejected(action: () -> Unit) {
    try { action(); fail("Operation unexpectedly accepted") } catch (_: Exception) { }
  }
  @Test fun existingArchiveAcceptsManualLedgerAndRejectsFutureFormat() {
    val ticket = vault.create(password, payload)
    val manual = """{"version":2,"transactions":[],"cashIncome":{"2026-10-12":80000},"categories":[],"rules":[],"retiredSimulation":[{"origin":"bank","cents":-25000}]}"""
    vault.write(ticket, manual)
    rejected { vault.write(ticket, """{"version":4}""") }
    assertEquals(manual, vault.read(ticket))
    vault.dispose(); vault = ProtectedVault(context, true, name)
    assertEquals(manual, vault.read(vault.unlock(password)))
  }
  @Test fun encryptedFileAndWrongPassword() {
    val ticket = vault.create(password, payload)
    assertEquals(payload, vault.read(ticket))
    val bytes = context.getDatabasePath("$name.db").readBytes()
    assertFalse(String(bytes, Charsets.ISO_8859_1).contains("ONLY_FICTITIOUS_TEST_PAYLOAD"))
    assertFalse(String(bytes.take(16).toByteArray(), Charsets.US_ASCII).startsWith("SQLite format 3"))
    vault.lock(); rejected { vault.read(ticket) }
    rejected { vault.unlock("password errata") }
    assertEquals(payload, vault.read(vault.unlock(password)))
  }
  @Test fun passwordChangePersistsAcrossNewEngine() {
    val ticket = vault.create(password, payload)
    rejected { vault.changePassword(ticket, "non corretta", replacement) }
    vault.changePassword(ticket, password, replacement)
    vault.dispose(); vault = ProtectedVault(context, true, name)
    rejected { vault.unlock(password) }
    assertEquals(payload, vault.read(vault.unlock(replacement)))
  }
  @Test fun tamperedEnvelopeIsRejectedWithoutDatabaseDeletion() {
    vault.create(password, payload); vault.lock()
    val file = java.io.File(context.noBackupFilesDir, "$name.key")
    val json = org.json.JSONObject(file.readText())
    val encoded = android.util.Base64.decode(json.getString("data"), android.util.Base64.NO_WRAP)
    encoded[0] = (encoded[0].toInt() xor 1).toByte()
    file.writeText(json.put("data", android.util.Base64.encodeToString(encoded, android.util.Base64.NO_WRAP)).toString())
    rejected { vault.unlock(password) }
    assertTrue(context.getDatabasePath("$name.db").exists())
  }
  @Test fun backgroundInvalidatesSessionAndDoesNotReopenOnForeground() {
    val ticket = vault.create(password, payload)
    vault.background(); rejected { vault.read(ticket) }
    vault.foreground(); rejected { vault.write(ticket, payload) }
    val fresh = vault.unlock(password)
    assertNotEquals(ticket, fresh)
    rejected { vault.read(ticket) }
    assertEquals(payload, vault.read(fresh))
  }
  @Test fun delayPersistsAcrossEngineRestart() {
    vault.create(password, payload); vault.lock()
    repeat(5) { rejected { vault.unlock("password non valida") } }
    vault.dispose(); vault = ProtectedVault(context, true, name)
    rejected { vault.unlock(password) }
  }
  @Test fun creationNeverOverwritesExistingArchive() {
    val ticket = vault.create(password, payload)
    rejected { vault.create(replacement, """{"version":1}""") }
    assertEquals(payload, vault.read(ticket))
  }
  @Test fun nativeTimeoutClosesDatabaseAndKeyWithoutJavascript() {
    vault.dispose(); vault = ProtectedVault(context, true, name, 80)
    val ticket = vault.create(password, payload)
    Thread.sleep(500)
    assertNull(ProtectedVault::class.java.getDeclaredField("db").apply { isAccessible = true }.get(vault))
    assertNull(ProtectedVault::class.java.getDeclaredField("databaseKey").apply { isAccessible = true }.get(vault))
    rejected { vault.read(ticket) }
  }
  @Test fun tamperedDatabaseIsRejectedAndPreserved() {
    vault.create(password, payload); vault.dispose()
    val file = context.getDatabasePath("$name.db")
    val damaged = file.readBytes()
    damaged[100] = (damaged[100].toInt() xor 1).toByte()
    file.writeBytes(damaged)
    vault = ProtectedVault(context, true, name)
    rejected { vault.unlock(password) }
    assertTrue(file.exists())
    assertArrayEquals(damaged, file.readBytes())
  }

  @Test fun retainedSessionGetsFreshTicketAndRejectsBackgroundOperations() {
    val original = vault.create(password, payload)
    vault.configureSessionTimeout(original, 60_000)
    vault.background()
    rejected { vault.read(original) }
    rejected { vault.write(original, payload) }
    assertNull(vault.resume())
    vault.foreground()
    val resumed = requireNotNull(vault.resume())
    assertNotEquals(original, resumed)
    rejected { vault.read(original) }
    assertEquals(payload, vault.read(resumed))
    vault.lock()
    // Must fail even before the asynchronous database closer has run.
    assertNull(vault.resume())
    rejected { vault.read(resumed) }
  }

  @Test fun durationPersistsButAuthenticationDoesNotSurviveEngineRestart() {
    val original = vault.create(password, payload)
    vault.configureSessionTimeout(original, 300_000)
    vault.dispose()
    vault = ProtectedVault(context, true, name)
    assertEquals(300_000L, vault.sessionTimeout())
    assertNull(vault.resume())
    assertEquals(payload, vault.read(vault.unlock(password)))
  }

  @Test fun unsupportedOrTamperedDurationsCannotCreateLongLivedSessions() {
    val original = vault.create(password, payload)
    for (duration in listOf(-1L, 1L, 60_001L, 86_400_000L)) {
      rejected { vault.configureSessionTimeout(original, duration) }
      assertEquals(0L, vault.sessionTimeout())
    }
    vault.dispose()
    context.getSharedPreferences("${name}_session", Context.MODE_PRIVATE)
      .edit().putLong("retentionMillis", 86_400_000L).commit()
    vault = ProtectedVault(context, true, name)
    assertEquals(0L, vault.sessionTimeout())
    assertNull(vault.resume())
    assertEquals(payload, vault.read(vault.unlock(password)))
  }

  @Test fun backgroundRetentionExpiresWithoutJavascriptAndClearsKey() {
    val original = vault.create(password, payload)
    vault.configureSessionTimeout(original, 60_000)
    vault.background()
    Thread.sleep(61_000)
    assertNull(ProtectedVault::class.java.getDeclaredField("db").apply { isAccessible = true }.get(vault))
    assertNull(ProtectedVault::class.java.getDeclaredField("databaseKey").apply { isAccessible = true }.get(vault))
    vault.foreground()
    assertNull(vault.resume())
    rejected { vault.read(original) }
  }
}


