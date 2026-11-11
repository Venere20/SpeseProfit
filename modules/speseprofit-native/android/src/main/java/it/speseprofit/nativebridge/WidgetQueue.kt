package it.speseprofit.nativebridge

import android.content.Context
import android.util.AtomicFile
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyFactory
import java.security.SecureRandom
import java.security.spec.MGF1ParameterSpec
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.PSource
import javax.crypto.spec.SecretKeySpec

/** No vault access while adding a request: only public-key encryption is available. */
object WidgetQueue {
  const val PREFS = "speseprofit_widget_queue_public"
  private const val MAX = 500
  private const val MAX_BYTES = 5 * 1024 * 1024
  private val random = SecureRandom()
  private fun encode(b: ByteArray) = Base64.encodeToString(b, Base64.NO_WRAP)
  private fun decode(s: String) = Base64.decode(s, Base64.NO_WRAP)
  private fun rsa() = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")
  private fun oaep() = OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT)
  private fun file(context: Context) = AtomicFile(File(context.noBackupFilesDir,"speseprofit-widget-pending.json"))
  fun seal(publicKey: String, text: String, purpose: String): JSONObject {
    val key = ByteArray(32).also { random.nextBytes(it) }
    try {
      val cipher=Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.ENCRYPT_MODE,SecretKeySpec(key,"AES")); cipher.updateAAD(purpose.toByteArray(Charsets.UTF_8))
      val encrypted=cipher.doFinal(text.toByteArray(Charsets.UTF_8))
      val wrap=rsa(); wrap.init(Cipher.ENCRYPT_MODE,KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(decode(publicKey))),oaep())
      return JSONObject().put("v",1).put("key",encode(wrap.doFinal(key))).put("iv",encode(cipher.iv)).put("data",encode(encrypted))
    } finally { key.fill(0) }
  }
  fun unseal(privateKey: String, json: JSONObject, purpose: String): String {
    require(json.getInt("v")==1)
    val unwrap=rsa(); val privateBytes=decode(privateKey)
    val key=try { unwrap.init(Cipher.DECRYPT_MODE,KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec(privateBytes)),oaep()); unwrap.doFinal(decode(json.getString("key"))) } finally { privateBytes.fill(0) }
    try {
      require(key.size==32); val iv=decode(json.getString("iv")); require(iv.size==12)
      val cipher=Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE,SecretKeySpec(key,"AES"),GCMParameterSpec(128,iv)); cipher.updateAAD(purpose.toByteArray(Charsets.UTF_8))
      return String(cipher.doFinal(decode(json.getString("data"))),Charsets.UTF_8)
    } finally { key.fill(0) }
  }
  private fun read(context: Context): JSONObject {
    val f=file(context)
    if (!f.baseFile.exists() && !File(f.baseFile.path+".bak").exists()) return JSONObject()
    val bytes=f.openRead().use { it.readBytes() }; require(bytes.size <= MAX_BYTES) { "Coda troppo grande." }
    return JSONObject(String(bytes,Charsets.UTF_8)).also { require(it.length() <= MAX) }
  }
  private fun write(context: Context, value: JSONObject) {
    val bytes=value.toString().toByteArray(Charsets.UTF_8); require(bytes.size<=MAX_BYTES)
    val f=file(context); val out=f.startWrite()
    try { out.write(bytes); out.fd.sync(); f.finishWrite(out) } catch(e: Exception) { f.failWrite(out); throw e }
    check(f.openRead().use { it.readBytes() }.contentEquals(bytes)) { "Salvataggio della coda non confermato." }
  }
  @Synchronized fun status(context: Context): Map<String,Any> {
    val prefs=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
    return try {
      val queue=read(context); val counts=IntArray(3)
      queue.keys().forEach { id -> val slot=queue.getJSONObject(id).optInt("slot",-1); if(slot in 0..2)counts[slot]++ }
      mapOf("count" to queue.length(),"counts" to counts.toList(),"error" to prefs.getBoolean("error",false))
    } catch (_: Exception) { mapOf("count" to -1,"counts" to listOf(0,0,0),"error" to true) }
  }
  fun markError(context: Context) { context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("error",true).commit() }
  @Synchronized fun publish(context: Context, state: JSONObject, keys: JSONObject?) {
    val slots=JSONArray(); val ids=state.optJSONArray("widgetSlots"); val templates=state.optJSONArray("expenseTemplates") ?: JSONArray()
    val shortcuts=state.optJSONArray("widgetShortcuts")
    for (i in 0..2) {
      val shortcut=shortcuts?.optJSONObject(i)
      val id=ids?.optString(i,"") ?: ""
      val legacy=(0 until templates.length()).map { templates.getJSONObject(it) }.find { it.optString("id")==id }
      if(shortcut==null && legacy==null) { slots.put(JSONObject());continue }
      val label=shortcut?.getString("label") ?: legacy!!.getString("description")
      val category=shortcut?.getString("categoryId") ?: legacy!!.optString("categoryId","")
      val type=shortcut?.getString("type") ?: "frequent"
      val out=JSONObject().put("label",label.take(40)).put("category",category).put("type",type).put("token",UUID.randomUUID().toString())
      val cents=shortcut?.optLong("cents",0) ?: legacy!!.getLong("cents")
      if(keys!=null) {
        val requiresAmount=cents<=0
        out.put("requiresAmount",requiresAmount)
        val description=shortcut?.optString("description","")?.takeIf { it.isNotBlank() } ?: label
        val model=if(shortcut==null) legacy!! else JSONObject().put("id","shortcut:"+i).put("description",description)
          .put("cents",cents).put("categoryId",category).put("requiresAmount",requiresAmount).put("origin",shortcut.getString("origin"))
        out.put("sealed",seal(keys.getString("public"),model.toString(),"speseprofit-template-v1"))
      }
      slots.put(out)
    }
    val edit=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString("slots",slots.toString())
    if(keys!=null)edit.putString("public",keys.getString("public"))
    if(try {read(context).length()==0} catch(_:Exception) {false})edit.putBoolean("error",false)
    check(edit.commit())
  }
  @Synchronized fun enqueue(context: Context, slot: Int, token: String, now: Long=System.currentTimeMillis(), amount: Long?=null): String {
    require(slot in 0..2)
    val prefs=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
    val model=JSONArray(prefs.getString("slots","[]")).getJSONObject(slot)
    require(model.optString("token")==token && token.isNotEmpty()) { "Widget aggiornato: riprova." }
    val needsAmount=model.optBoolean("requiresAmount",false)
    require(if(needsAmount) amount!=null && amount in 1..100_000_000_000L else amount==null) { "Inserisci un importo valido maggiore di zero." }
    val queue=read(context); require(queue.length()<MAX) { "Coda piena: sblocca l’app." }
    val id="widget:"+UUID.randomUUID().toString()
    val request=JSONObject().put("id",id).put("date",DailyReminder.day(now)).put("occurredAt",now).put("sealedTemplate",model.getJSONObject("sealed"))
    if(amount!=null)request.put("amountCents",amount)
    queue.put(id,seal(requireNotNull(prefs.getString("public",null)),request.toString(),"speseprofit-request-v1").put("slot",slot))
    write(context,queue)
    prefs.edit().putBoolean("error",false).commit()
    return id
  }
  @Synchronized fun pending(context: Context, keys: JSONObject): String {
    try {
      val queue=read(context); val result=JSONArray()
      queue.keys().forEach { id ->
        val item=JSONObject(unseal(keys.getString("private"),queue.getJSONObject(id),"speseprofit-request-v1"))
        require(item.getString("id")==id)
        val template=JSONObject(unseal(keys.getString("private"),item.getJSONObject("sealedTemplate"),"speseprofit-template-v1"))
        if(template.optBoolean("requiresAmount",false)) {
          val amount=item.getLong("amountCents");require(amount in 1..100_000_000_000L);template.put("cents",amount);template.remove("requiresAmount")
        } else require(!item.has("amountCents"))
        item.remove("amountCents");item.put("template",template)
        item.remove("sealedTemplate");result.put(item)
      }
      context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("error",false).commit()
      return result.toString()
    } catch(e: Exception) { context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("error",true).commit(); throw e }
  }
  @Synchronized fun acknowledge(context: Context, ids: List<String>) {
    val queue=read(context); ids.forEach { queue.remove(it) }; write(context,queue)
  }
  @Synchronized fun discard(context: Context) { write(context,JSONObject());context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("error",false).commit() }
  fun resetAfterLedgerSave(context: Context) {
    try { reset(context) } catch (_: Exception) { markError(context) }
  }
  @Synchronized fun reset(context: Context) { discard(context);check(context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().clear().commit()) }
}
