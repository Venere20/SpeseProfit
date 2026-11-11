package it.speseprofit.nativebridge

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import net.zetetic.database.sqlcipher.SQLiteDatabase
import org.bouncycastle.crypto.generators.Argon2BytesGenerator
import org.bouncycastle.crypto.params.Argon2Parameters
import org.json.JSONObject
import java.security.KeyStore
import java.security.SecureRandom
import java.text.Normalizer
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** Separate archive: no plaintext migration, export, backup or recovery API. */
class ProtectedVault(private val context: Context, initialForeground: Boolean, namespace: String = "speseprofit-vault-v1", private val idleMillis: Long = 120_000) {
  init { require(Regex("speseprofit-[a-z0-9-]{1,80}").matches(namespace)); require(idleMillis in 1..120_000) }
  private val alias = namespace
  private val databaseFile = context.getDatabasePath("$namespace.db")
  private val envelope = AtomicFile(java.io.File(context.noBackupFilesDir, "$namespace.key"))
  private val attempts = context.getSharedPreferences("${namespace}_attempts", Context.MODE_PRIVATE)
  private val sessionPreferences = context.getSharedPreferences("${namespace}_session", Context.MODE_PRIVATE)
  @Volatile private var retentionMillis = runCatching { sessionPreferences.getLong("retentionMillis", 0L) }
    .getOrDefault(0L).let { if (it in SESSION_TIMEOUTS) it else 0L }
  @Volatile private var sessionActive = false
  @Volatile private var resumable = false
  private val epoch = AtomicLong(0)
  private val closer = Executors.newSingleThreadScheduledExecutor()
  @Volatile private var foreground = initialForeground
  private var idle: java.util.concurrent.ScheduledFuture<*>? = null
  private var touchedAt = 0L
  private var db: SQLiteDatabase? = null
  private var databaseKey: ByteArray? = null
  private var session = -1L
  private val random = SecureRandom()
  companion object {
    private val FALLBACK_ATTEMPT_BOOT_ID = "process:" + java.util.UUID.randomUUID()
    private val SESSION_TIMEOUTS = setOf(0L, 60_000L, 300_000L, 900_000L, 1_800_000L)
  }
  private fun timeoutMillis() = if (retentionMillis > 0) retentionMillis else idleMillis

  private fun store() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
  private fun encode(bytes: ByteArray) = Base64.encodeToString(bytes, Base64.NO_WRAP)
  private fun decode(text: String) = Base64.decode(text, Base64.NO_WRAP)
  private fun normalized(text: String) = Normalizer.normalize(text, Normalizer.Form.NFC)
  private fun passwordPolicy(text: String) {
    PasswordPolicy.problem(text)?.let { throw IllegalArgumentException(it) }
  }
  private fun derive(password: String, salt: ByteArray): ByteArray {
    val chars = normalized(password).toCharArray()
    val result = ByteArray(32)
    try {
      val generator = Argon2BytesGenerator()
      generator.init(Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
        .withVersion(Argon2Parameters.ARGON2_VERSION_13).withSalt(salt)
        .withMemoryAsKB(19 * 1024).withIterations(2).withParallelism(1).build())
      generator.generateBytes(chars, result)
      return result
    } finally { chars.fill('\u0000') }
  }
  private fun encrypt(key: SecretKey, bytes: ByteArray): JSONObject {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, key)
    cipher.updateAAD("speseprofit-vault-v1".toByteArray(Charsets.UTF_8))
    return JSONObject().put("iv", encode(cipher.iv)).put("data", encode(cipher.doFinal(bytes)))
  }
  private fun decrypt(key: SecretKey, json: JSONObject): ByteArray {
    val iv = decode(json.getString("iv"))
    require(iv.size == 12)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
    cipher.updateAAD("speseprofit-vault-v1".toByteArray(Charsets.UTF_8))
    return cipher.doFinal(decode(json.getString("data")))
  }
  private fun deviceKey(): SecretKey = store().getKey(alias, null) as SecretKey
  private fun wrap(password: String, key: ByteArray): ByteArray {
    val salt = ByteArray(16).also { random.nextBytes(it) }
    val derived = derive(password, salt)
    var inner: ByteArray? = null
    try {
      inner = JSONObject().put("version", 1).put("salt", encode(salt))
        .put("wrapped", encrypt(SecretKeySpec(derived, "AES"), key)).toString().toByteArray(Charsets.UTF_8)
      return encrypt(deviceKey(), inner).put("version", 1).toString().toByteArray(Charsets.UTF_8)
    } finally { derived.fill(0); salt.fill(0); inner?.fill(0) }
  }
  private fun unwrap(password: String): ByteArray {
    val outer = JSONObject(envelope.openRead().use { require(it.channel.size() in 1..16_384); it.readBytes().toString(Charsets.UTF_8) })
    require(outer.getInt("version") == 1)
    val plaintext = decrypt(deviceKey(), outer)
    var derived: ByteArray? = null
    try {
      val inner = JSONObject(plaintext.toString(Charsets.UTF_8))
      require(inner.getInt("version") == 1)
      val salt = decode(inner.getString("salt"))
      require(salt.size == 16)
      derived = derive(password, salt)
      return decrypt(SecretKeySpec(derived, "AES"), inner.getJSONObject("wrapped")).also { require(it.size == 32) }
    } finally { derived?.fill(0); plaintext.fill(0) }
  }
  private fun persistEnvelope(bytes: ByteArray) {
    val output = envelope.startWrite()
    try { output.write(bytes); envelope.finishWrite(output) }
    catch (error: Exception) { envelope.failWrite(output); throw error }
    finally { bytes.fill(0) }
  }
  private fun checkForeground(ticket: Long) {
    check(foreground && epoch.get() == ticket) { "Archivio bloccato. Sbloccalo di nuovo." }
  }
  private fun closeDatabase() {
    sessionActive = false; resumable = false
    idle?.cancel(false); idle = null
    try { db?.close() } finally { db = null; databaseKey?.fill(0); databaseKey = null; session = -1 }
  }
  private fun keepAlive(ticket: Long) {
    touchedAt = android.os.SystemClock.elapsedRealtime()
    idle?.cancel(false)
    val touched = touchedAt
    idle = closer.schedule({ synchronized(this) { if (session == ticket && touchedAt == touched) lock() } }, timeoutMillis(), java.util.concurrent.TimeUnit.MILLISECONDS)
  }
  fun foreground() { foreground = true }
  fun background() {
    foreground = false
    // Invalidate ALL old tickets, including queued operations, even when retaining
    // the key in memory. Only a fresh foreground resume can obtain a new ticket.
    epoch.incrementAndGet()
    if (retentionMillis == 0L || !sessionActive || !resumable) lock()
  }
  // Invalidate immediately, even if Argon2 or a database operation is in progress.
  fun lock() {
    sessionActive = false; resumable = false
    val ticket = epoch.incrementAndGet()
    if (!closer.isShutdown) try {
      closer.execute { synchronized(this) { if (session < ticket) closeDatabase() } }
    } catch (_: java.util.concurrent.RejectedExecutionException) { /* Already disposed and closed. */ }
  }
  fun dispose() {
    foreground = false; sessionActive = false; resumable = false; epoch.incrementAndGet()
    synchronized(this) { closeDatabase() }
    closer.shutdownNow()
  }
  @Synchronized fun status(): String {
    val hasEnvelope = envelope.baseFile.exists() || java.io.File(envelope.baseFile.path + ".bak").exists()
    val hasDatabase = databaseFile.exists()
    return if (!hasEnvelope && !hasDatabase) "missing" else if (hasEnvelope && hasDatabase && store().containsAlias(alias)) "ready" else "damaged"
  }
  private val attemptBootId: String by lazy {
    runCatching { "boot:" + android.provider.Settings.Global.getInt(context.contentResolver, android.provider.Settings.Global.BOOT_COUNT) }
      .getOrElse { FALLBACK_ATTEMPT_BOOT_ID }
  }
  private fun attemptState() = AttemptCooldown.State(attempts.getInt("count", 0),
    attempts.getLong("untilElapsed", -1L), attempts.getString("bootId", null))
  private fun persistAttempts(state: AttemptCooldown.State) {
    check(attempts.edit().putInt("count", state.count).putLong("untilElapsed", state.untilElapsed)
      .putString("bootId", state.bootId).remove("until").commit()) { "Impossibile salvare il controllo dei tentativi." }
  }
  private fun checkDelay() {
    val now = android.os.SystemClock.elapsedRealtime()
    val saved = attemptState()
    val restored = AttemptCooldown.restore(saved, now, attemptBootId)
    if (restored != saved) persistAttempts(restored)
    check(AttemptCooldown.allowed(restored, now)) { "Troppi tentativi. Attendi prima di riprovare." }
  }
  private fun failedAttempt() {
    persistAttempts(AttemptCooldown.failed(attemptState(), android.os.SystemClock.elapsedRealtime(), attemptBootId))
  }
  private fun resetAttempts() { check(attempts.edit().clear().commit()) }
  private fun open(key: ByteArray, create: Boolean = false): SQLiteDatabase {
    System.loadLibrary("sqlcipher")
    databaseFile.parentFile?.mkdirs()
    return SQLiteDatabase.openDatabase(databaseFile.absolutePath, key, null,
      SQLiteDatabase.OPEN_READWRITE or (if (create) SQLiteDatabase.CREATE_IF_NECESSARY else 0),
      net.zetetic.database.DatabaseErrorHandler { _, _ -> throw android.database.sqlite.SQLiteException("Archivio danneggiato: apertura negata senza cancellazione.") }, null)
  }
  @Synchronized fun create(password: String, initial: String): Long {
    require(status() == "missing") { "Archivio già presente o incompleto. Nessun dato sovrascritto." }
    passwordPolicy(password); validateJson(initial)
    val ticket = epoch.get(); checkForeground(ticket)
    val key = ByteArray(32).also { random.nextBytes(it) }
    var created = false
    try {
      val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
      require(!store().containsAlias(alias)) { "Chiave già presente: verifica necessaria." }
      generator.init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
      val generated = generator.generateKey(); created = true
      check(generated.encoded == null)
      db = open(key, true); databaseKey = key
      db!!.execSQL("CREATE TABLE vault_state(id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL)")
      db!!.execSQL("INSERT INTO vault_state(id,json) VALUES(1,?)", arrayOf<Any>(initial))
      val wrapped = wrap(password, key)
      checkForeground(ticket)
      resetAttempts(); persistEnvelope(wrapped); checkForeground(ticket)
      session = ticket; sessionActive = true; resumable = retentionMillis > 0; keepAlive(ticket); checkForeground(ticket)
      return ticket
    } catch (error: Exception) {
      closeDatabase(); key.fill(0)
      // Only files and key created by this attempt; never an existing archive.
      if (created) { context.deleteDatabase(databaseFile.name); envelope.delete(); store().deleteEntry(alias) }
      throw error
    }
  }
  @Synchronized fun unlock(password: String): Long {
    require(status() == "ready") { "Archivio non disponibile. Nessun ripristino automatico." }
    checkDelay()
    val ticket = epoch.get(); checkForeground(ticket)
    closeDatabase()
    var key: ByteArray? = null
    try {
      key = unwrap(password)
      db = open(key); databaseKey = key
      db!!.rawQuery("SELECT json FROM vault_state WHERE id=1", null).use { check(it.moveToFirst()) }
      checkForeground(ticket); resetAttempts(); session = ticket; sessionActive = true; resumable = retentionMillis > 0; keepAlive(ticket); checkForeground(ticket)
      return ticket
    } catch (_: Exception) {
      closeDatabase(); key?.fill(0)
      if (foreground && epoch.get() == ticket) failedAttempt()
      throw IllegalStateException("Password non valida o archivio non disponibile.")
    }
  }
  private fun requireSession(ticket: Long): SQLiteDatabase {
    checkForeground(ticket)
    check(sessionActive && session == ticket) { "Sessione scaduta. Sblocca l’archivio." }
    if (android.os.SystemClock.elapsedRealtime() - touchedAt >= timeoutMillis()) { lock(); throw IllegalStateException("Sessione scaduta.") }
    keepAlive(ticket)
    return checkNotNull(db)
  }
  @Synchronized fun sessionTimeout(): Long = retentionMillis
  @Synchronized fun configureSessionTimeout(ticket: Long, milliseconds: Long) {
    requireSession(ticket)
    require(milliseconds in SESSION_TIMEOUTS) { "Durata della sessione non valida." }
    check(sessionPreferences.edit().putLong("retentionMillis", milliseconds).commit())
    retentionMillis = milliseconds
    resumable = milliseconds > 0
    keepAlive(ticket)
    if (!foreground && milliseconds == 0L) lock()
    checkForeground(ticket)
  }
  @Synchronized fun resume(): Long? {
    val previousEpoch = epoch.get()
    if (!foreground) return null
    if (!sessionActive || !resumable || retentionMillis == 0L || session < 0 || db == null ||
        android.os.SystemClock.elapsedRealtime() - touchedAt >= timeoutMillis()) {
      lock()
      return null
    }
    val ticket = previousEpoch + 1
    if (!epoch.compareAndSet(previousEpoch, ticket)) return null
    session = ticket
    keepAlive(ticket)
    checkForeground(ticket)
    return ticket
  }
  @Synchronized fun touch(ticket: Long) { requireSession(ticket) }
  @Synchronized fun read(ticket: Long): String {
    val database = requireSession(ticket)
    return database.rawQuery("SELECT json FROM vault_state WHERE id=1", null).use {
      check(it.moveToFirst()); it.getString(0).also { checkForeground(ticket) }
    }
  }
  private fun validateJson(json: String) {
    require(json.toByteArray(Charsets.UTF_8).size <= 16 * 1024 * 1024) { "Archivio troppo grande." }
    require(JSONObject(json).getInt("version") in 1..3) { "Formato archivio non supportato." }
  }
  @Synchronized fun write(ticket: Long, json: String) {
    val database = requireSession(ticket); validateJson(json)
    database.beginTransaction()
    try {
      database.execSQL("UPDATE vault_state SET json=? WHERE id=1", arrayOf<Any>(json))
      checkForeground(ticket); database.setTransactionSuccessful()
    } finally { database.endTransaction() }
  }
  @Synchronized fun widgetQueueKeys(ticket: Long): JSONObject {
    val database = requireSession(ticket)
    database.execSQL("CREATE TABLE IF NOT EXISTS widget_queue_keys(id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL)")
    database.rawQuery("SELECT json FROM widget_queue_keys WHERE id=1", null).use {
      if (it.moveToFirst()) return JSONObject(it.getString(0)).also { checkForeground(ticket) }
    }
    val generator = java.security.KeyPairGenerator.getInstance("RSA").apply { initialize(3072) }
    val pair = generator.generateKeyPair()
    val privateBytes = pair.private.encoded
    try {
      val json = JSONObject().put("public", encode(pair.public.encoded)).put("private", encode(privateBytes))
      checkForeground(ticket)
      database.execSQL("INSERT INTO widget_queue_keys(id,json) VALUES(1,?)", arrayOf<Any>(json.toString()))
      return json
    } finally { privateBytes.fill(0) }
  }
  @Synchronized fun changePassword(ticket: Long, current: String, next: String) {
    requireSession(ticket); passwordPolicy(next); checkDelay()
    val key = try { unwrap(current) } catch (_: Exception) { failedAttempt(); throw IllegalStateException("Password attuale non valida.") }
    try {
      val wrapped = wrap(next, key)
      checkForeground(ticket); resetAttempts(); persistEnvelope(wrapped)
    } finally { key.fill(0) }
  }
}


