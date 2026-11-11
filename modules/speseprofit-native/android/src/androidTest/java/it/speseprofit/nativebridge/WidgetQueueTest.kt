package it.speseprofit.nativebridge

import android.content.Context
import android.util.AtomicFile
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class WidgetQueueTest {
  private lateinit var context: Context
  private lateinit var vault: ProtectedVault
  private lateinit var name: String
  private var ticket=0L
  private val password="prova widget archivio locale"
  private val model=JSONObject("""{"id":"coffee","description":"CAFFE_SECRET_WIDGET","cents":120,"categoryId":"dining","origin":"card"}""")
  private fun state()=JSONObject().put("widgetSlots",JSONArray(listOf("coffee","",""))).put("expenseTemplates",JSONArray().put(model))
  private fun token()=JSONArray(context.getSharedPreferences(WidgetQueue.PREFS,Context.MODE_PRIVATE).getString("slots","[]")).getJSONObject(0).getString("token")
  @Before fun setup() {
    context=InstrumentationRegistry.getInstrumentation().targetContext
    check(context.packageName!="it.speseprofit.personal")
    name="speseprofit-widget-test-"+UUID.randomUUID().toString()
    vault=ProtectedVault(context,true,name)
    ticket=vault.create(password,"""{"version":2}""")
    WidgetQueue.reset(context)
    WidgetQueue.publish(context,state(),vault.widgetQueueKeys(ticket))
  }
  @After fun cleanup() {
    WidgetQueue.reset(context);vault.dispose();context.deleteDatabase(name+".db")
    AtomicFile(File(context.noBackupFilesDir,name+".key")).delete()
    java.security.KeyStore.getInstance("AndroidKeyStore").apply {load(null);deleteEntry(name)}
  }
  @Test fun actualFourSectionRemoteViewsShowPendingWithoutAmounts() {
    val examples=JSONArray().put(JSONObject(model.toString()).put("description","Caffè"))
      .put(JSONObject(model.toString()).put("id","fuel").put("description","Benzina").put("categoryId","transport"))
      .put(JSONObject(model.toString()).put("id","food").put("description","Spesa").put("categoryId","food"))
    WidgetQueue.publish(context,JSONObject().put("widgetSlots",JSONArray(listOf("coffee","fuel","food"))).put("expenseTemplates",examples),vault.widgetQueueKeys(ticket))
    WidgetQueue.enqueue(context,0,token())
    val cal=java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("Europe/Rome"))
    cal.add(java.util.Calendar.DAY_OF_MONTH,-((cal.get(java.util.Calendar.DAY_OF_WEEK)+5)%7))
    val week=java.text.SimpleDateFormat("yyyy-MM-dd",java.util.Locale.ROOT).apply {timeZone=java.util.TimeZone.getTimeZone("Europe/Rome")}.format(cal.time)
    val instant=java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",java.util.Locale.ROOT).apply {timeZone=java.util.TimeZone.getTimeZone("UTC")}.format(java.util.Date())
    context.getSharedPreferences(BalanceWidget.PREFS,Context.MODE_PRIVATE).edit().putString("source","manual").putString("weekStart",week).putString("balanceState","positive").putString("calculatedAt",instant).commit()
    InstrumentationRegistry.getInstrumentation().runOnMainSync {
      val view=BalanceWidget.createViews(context,777).apply(context,null)
      view.measure(android.view.View.MeasureSpec.makeMeasureSpec(640,android.view.View.MeasureSpec.EXACTLY),android.view.View.MeasureSpec.makeMeasureSpec(720,android.view.View.MeasureSpec.EXACTLY))
      view.layout(0,0,640,720)
      assertEquals("Caffè",view.findViewById<android.widget.TextView>(R.id.widget_slot_0).text.toString())
      assertEquals("Benzina",view.findViewById<android.widget.TextView>(R.id.widget_slot_1).text.toString())
      assertEquals("Spesa",view.findViewById<android.widget.TextView>(R.id.widget_slot_2).text.toString())
      assertTrue(view.findViewById<android.widget.TextView>(R.id.widget_updated).text.toString().contains("Ultimo saldo"))
      assertTrue(view.findViewById<android.widget.TextView>(R.id.widget_total_pending).text.toString().contains("1 spesa in attesa"))
      val bitmap=android.graphics.Bitmap.createBitmap(640,720,android.graphics.Bitmap.Config.ARGB_8888)
      view.draw(android.graphics.Canvas(bitmap))
      File(context.cacheDir,"widget-preview.png").outputStream().use {bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,it)}
    }
  }
  @Test fun queueCleanupFailureDoesNotTurnSuccessfulLedgerSaveIntoFailure() {
    val target=File(context.noBackupFilesDir,"speseprofit-widget-pending.json.new")
    check(target.mkdir());val blocker=File(target,"block").apply {writeText("test")}
    try {
      WidgetQueue.resetAfterLedgerSave(context)
      assertEquals(true,WidgetQueue.status(context)["error"])
      assertEquals("""{"version":2}""",vault.read(ticket))
    } finally {check(blocker.delete());check(target.delete())}
  }
  @Test fun failedAppendDoesNotConfirmOrOverwritePreviousRequests() {
    WidgetQueue.enqueue(context,0,token())
    val file=File(context.noBackupFilesDir,"speseprofit-widget-pending.json")
    val before=file.readBytes()
    context.getSharedPreferences(WidgetQueue.PREFS,Context.MODE_PRIVATE).edit().remove("tap-0").commit()
    val target=File(file.path+".new");check(target.mkdir());val blocker=File(target,"block").apply {writeText("test")}
    try {
      try {WidgetQueue.enqueue(context,0,token());fail("Append unexpectedly succeeded")} catch(_: Exception) {}
      assertArrayEquals(before,file.readBytes());assertEquals(1,WidgetQueue.status(context)["count"])
    } finally {check(blocker.delete());check(target.delete())}
  }
  @Test fun lockedWidgetCanAppendButCannotReadPrivateKey() {
    val original=ticket;vault.lock()
    try {vault.widgetQueueKeys(original);fail("Locked vault exposed queue key")} catch(_: IllegalStateException) {}
    WidgetQueue.enqueue(context,0,token(),1792356600000L)
    assertEquals(1,WidgetQueue.status(context)["count"])
    val bytes=File(context.noBackupFilesDir,"speseprofit-widget-pending.json").readText()
    assertFalse(bytes.contains("CAFFE_SECRET_WIDGET"));assertFalse(bytes.contains("\"cents\""))
    ticket=vault.unlock(password)
    val requests=JSONArray(WidgetQueue.pending(context,vault.widgetQueueKeys(ticket)))
    assertEquals(120,requests.getJSONObject(0).getJSONObject("template").getInt("cents"))
  }
  @Test fun queueSurvivesVaultReopenAndKeepsOriginalSnapshot() {
    val id=WidgetQueue.enqueue(context,0,token(),1792356600000L)
    model.put("cents",999)
    WidgetQueue.publish(context,state(),vault.widgetQueueKeys(ticket))
    vault.dispose();vault=ProtectedVault(context,true,name);ticket=vault.unlock(password)
    val request=JSONArray(WidgetQueue.pending(context,vault.widgetQueueKeys(ticket))).getJSONObject(0)
    assertEquals(id,request.getString("id"));assertEquals(120,request.getJSONObject("template").getInt("cents"))
    assertEquals(1792356600000L,request.getLong("occurredAt"))
    WidgetQueue.acknowledge(context,listOf(id));assertEquals(0,WidgetQueue.status(context)["count"])
    WidgetQueue.acknowledge(context,listOf(id));assertEquals(0,WidgetQueue.status(context)["count"])
  }
  @Test fun repeatedTapsAreAcceptedButOutdatedButtonsAreRejected() {
    val old=token();WidgetQueue.enqueue(context,0,old)
    WidgetQueue.enqueue(context,0,old)
    assertEquals(listOf(2,0,0),WidgetQueue.status(context)["counts"])
    WidgetQueue.publish(context,state(),vault.widgetQueueKeys(ticket))
    try {WidgetQueue.enqueue(context,0,old);fail("Old widget configuration accepted")} catch(_: IllegalArgumentException) {}
    assertEquals(2,WidgetQueue.status(context)["count"])
  }
  @Test fun corruptedQueueIsNotDiscardedOrOverwritten() {
    val id=WidgetQueue.enqueue(context,0,token())
    val file=File(context.noBackupFilesDir,"speseprofit-widget-pending.json")
    val data=JSONObject(file.readText());val encrypted=data.getJSONObject(id)
    val text=encrypted.getString("data");encrypted.put("data",(if(text[0]=='A') "B" else "A")+text.substring(1));file.writeText(data.toString())
    val before=file.readBytes()
    try {WidgetQueue.pending(context,vault.widgetQueueKeys(ticket));fail("Tampered ciphertext accepted")} catch(_: Exception) {}
    assertArrayEquals(before,file.readBytes());assertEquals(1,WidgetQueue.status(context)["count"]);assertEquals(true,WidgetQueue.status(context)["error"])
  }
  @Test fun wrongPurposeAndWrongKeyCannotDecrypt() {
    val keys=vault.widgetQueueKeys(ticket);val cipher=WidgetQueue.seal(keys.getString("public"),"PRIVATE_TEST","one")
    try {WidgetQueue.unseal(keys.getString("private"),cipher,"two");fail("Wrong purpose accepted")} catch(_: Exception) {}
    val generator=java.security.KeyPairGenerator.getInstance("RSA").apply {initialize(2048)}
    val other=android.util.Base64.encodeToString(generator.generateKeyPair().private.encoded,android.util.Base64.NO_WRAP)
    try {WidgetQueue.unseal(other,cipher,"one");fail("Wrong key accepted")} catch(_: Exception) {}
  }
  @Test fun discardAndResetRemoveOnlyPendingRequestsAndPublicConfiguration() {
    WidgetQueue.enqueue(context,0,token())
    WidgetQueue.discard(context);assertEquals(0,WidgetQueue.status(context)["count"])
    assertTrue(token().isNotEmpty())
    WidgetQueue.reset(context);assertFalse(context.getSharedPreferences(WidgetQueue.PREFS,Context.MODE_PRIVATE).contains("public"))
    assertEquals("""{"version":2}""",vault.read(ticket))
  }

  @Test fun countersAreDerivedFromDurableQueueAndAcknowledgment() {
    val first=WidgetQueue.enqueue(context,0,token()); WidgetQueue.enqueue(context,0,token())
    assertEquals(listOf(2,0,0),WidgetQueue.status(context)["counts"])
    WidgetQueue.acknowledge(context,listOf(first))
    assertEquals(listOf(1,0,0),WidgetQueue.status(context)["counts"])
  }
  @Test fun shortcutLabelIsIndependentFromEncryptedDescription() {
    val shortcut=JSONObject().put("type","frequent").put("label","Bar").put("categoryId","dining").put("cents",120).put("description","PRIVATE_TRANSACTION_DESCRIPTION").put("origin","card")
    WidgetQueue.publish(context,JSONObject().put("widgetShortcuts",JSONArray().put(shortcut).put(shortcut).put(shortcut)),vault.widgetQueueKeys(ticket))
    val config=context.getSharedPreferences(WidgetQueue.PREFS,Context.MODE_PRIVATE).getString("slots","")!!
    assertTrue(config.contains("Bar"));assertFalse(config.contains("PRIVATE_TRANSACTION_DESCRIPTION"));assertFalse(config.contains("cents"))
    WidgetQueue.enqueue(context,0,token())
    val request=JSONArray(WidgetQueue.pending(context,vault.widgetQueueKeys(ticket))).getJSONObject(0)
    assertEquals("PRIVATE_TRANSACTION_DESCRIPTION",request.getJSONObject("template").getString("description"))
  }
  @Test fun categoryWithoutAmountNeverEnqueuesZero() {
    val shortcut=JSONObject().put("type","category").put("label","Alimentari").put("categoryId","food").put("description","").put("origin","card")
    WidgetQueue.publish(context,JSONObject().put("widgetShortcuts",JSONArray().put(shortcut).put(shortcut).put(shortcut)),vault.widgetQueueKeys(ticket))
    val slot=JSONArray(context.getSharedPreferences(WidgetQueue.PREFS,Context.MODE_PRIVATE).getString("slots","[]")).getJSONObject(0)
    assertTrue(slot.has("sealed"));assertTrue(slot.getBoolean("requiresAmount"))
    try { WidgetQueue.enqueue(context,0,token());fail("Missing amount enqueued") } catch(_: Exception) {}
    assertEquals(0,WidgetQueue.status(context)["count"])
  }

  @Test fun amountOnlyEntryCanQueueWhileLockedWithoutExposingAmounts() {
    val shortcut=JSONObject().put("type","category").put("label","Alimentari").put("categoryId","food").put("description","PRIVATE_CATEGORY_DESCRIPTION").put("origin","card")
    WidgetQueue.publish(context,JSONObject().put("widgetShortcuts",JSONArray().put(shortcut).put(shortcut).put(shortcut)),vault.widgetQueueKeys(ticket))
    vault.lock();WidgetQueue.enqueue(context,0,token(),1792356600000L,4250L)
    assertEquals(listOf(1,0,0),WidgetQueue.status(context)["counts"])
    val raw=File(context.noBackupFilesDir,"speseprofit-widget-pending.json").readText()
    assertFalse(raw.contains("amountCents"));assertFalse(raw.contains("PRIVATE_CATEGORY_DESCRIPTION"))
    ticket=vault.unlock(password)
    val expense=JSONArray(WidgetQueue.pending(context,vault.widgetQueueKeys(ticket))).getJSONObject(0).getJSONObject("template")
    assertEquals(4250L,expense.getLong("cents"));assertEquals("food",expense.getString("categoryId"));assertEquals("PRIVATE_CATEGORY_DESCRIPTION",expense.getString("description"))
  }
  @Test fun amountEntryValidatesCommaZeroAndExcessDecimals() {
    assertEquals(120L,QuickExpenseActivity.parseAmount("1,20"));assertEquals(4250L,QuickExpenseActivity.parseAmount("42.50"))
    listOf("","0","-1","1,234","1.000,00").forEach { raw -> try {QuickExpenseActivity.parseAmount(raw);fail("Invalid amount accepted")} catch(_: IllegalArgumentException) {} }
    try {WidgetQueue.enqueue(context,0,token(),System.currentTimeMillis(),500L);fail("Fixed amount overridden")} catch(_: IllegalArgumentException) {}
    assertEquals(0,WidgetQueue.status(context)["count"])
  }

  @Test fun successfulConfigurationClearsRecoveredErrorButKeepsPendingFailureVisible() {
    WidgetQueue.markError(context);assertEquals(true,WidgetQueue.status(context)["error"])
    WidgetQueue.publish(context,state(),vault.widgetQueueKeys(ticket));assertEquals(false,WidgetQueue.status(context)["error"])
    WidgetQueue.enqueue(context,0,token());WidgetQueue.markError(context)
    WidgetQueue.publish(context,state(),vault.widgetQueueKeys(ticket));assertEquals(true,WidgetQueue.status(context)["error"])
    WidgetQueue.pending(context,vault.widgetQueueKeys(ticket));assertEquals(false,WidgetQueue.status(context)["error"])
  }
}
