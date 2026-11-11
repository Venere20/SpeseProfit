package it.speseprofit.nativebridge
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.json.JSONObject
import org.json.JSONArray
import android.util.AtomicFile
import java.io.File
import java.util.UUID
@RunWith(AndroidJUnit4::class)
class BankInboxTest {
 @Test fun encryptedDurableInboxDeduplicatesAndAcknowledgesOnlyExplicitly(){
  val c=InstrumentationRegistry.getInstrumentation().targetContext
  check(c.packageName!="it.speseprofit.personal")
  val name="speseprofit-fineco-test-"+UUID.randomUUID().toString()
  val vault=ProtectedVault(c,true,name);val password="archivio sintetico prove fineco"
  try {
   val ticket=vault.create(password,"""{"version":2}""");val keys=vault.widgetQueueKeys(ticket)
   BankInbox.configure(c,null,null)
   BankInbox.configure(c,JSONObject().put("activatedAt",1).put("smsSender","12345"),keys.getString("public"))
   val event=JSONObject().put("id","fixture-one").put("source","sms").put("sender","12345").put("receivedAt",100).put("body","PRIVATE_SYNTHETIC_BANK_TEXT")
   BankInbox.enqueue(c,event);BankInbox.enqueue(c,event)
   assertEquals(1,BankInbox.status(c)["pending"])
   val file=File(c.noBackupFilesDir,"fineco-inbox.json")
   assertFalse(file.readText().contains("PRIVATE_SYNTHETIC_BANK_TEXT"))
   assertEquals(1,JSONArray(BankInbox.pending(c,keys.getString("private"))).length())
   assertEquals(1,BankInbox.status(c)["pending"])
   BankInbox.ack(c,listOf("sms:fixture-one"));assertEquals(0,BankInbox.status(c)["pending"])
   BankInbox.enqueue(c,event.put("id","second"));BankInbox.configure(c,null,null)
   assertEquals(false,BankInbox.status(c)["enabled"]);assertEquals(0,BankInbox.status(c)["pending"])
   vault.write(ticket,"""{"version":3}""");assertTrue(vault.read(ticket).contains("3"))
  } finally {
   BankInbox.configure(c,null,null);vault.dispose();c.deleteDatabase(name+".db");AtomicFile(File(c.noBackupFilesDir,name+".key")).delete()
   java.security.KeyStore.getInstance("AndroidKeyStore").apply{load(null);deleteEntry(name)}
  }
 }
}
