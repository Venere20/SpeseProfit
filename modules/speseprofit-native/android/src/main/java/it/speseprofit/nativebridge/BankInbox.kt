package it.speseprofit.nativebridge
import android.content.Context
import android.content.BroadcastReceiver
import android.content.Intent
import android.provider.Telephony
import android.util.AtomicFile
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import java.security.MessageDigest

object BankInbox {
 @Volatile var changed:(()->Unit)?=null
 const val PREFS="speseprofit_fineco"
 fun prefs(c:Context)=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
 private fun file(c:Context)=AtomicFile(File(c.noBackupFilesDir,"fineco-inbox.json"))
 private fun read(c:Context):JSONObject {val f=file(c);return try {f.openRead().use{require(it.channel.size()<=5*1024*1024);JSONObject(String(it.readBytes(),Charsets.UTF_8))}}catch(e:java.io.FileNotFoundException){JSONObject()}}
 private fun write(c:Context,json:JSONObject){val bytes=json.toString().toByteArray(Charsets.UTF_8);require(bytes.size<=5*1024*1024);val f=file(c);val out=f.startWrite();try{out.write(bytes);f.finishWrite(out)}catch(e:Exception){f.failWrite(out);throw e}}
 @Synchronized fun configure(c:Context,config:JSONObject?,publicKey:String?) {
  if(config==null){androidx.work.WorkManager.getInstance(c).cancelUniqueWork("fineco-gmail");write(c,JSONObject());check(prefs(c).edit().clear().commit());return}
  check(prefs(c).edit().putLong("since",config.getLong("activatedAt")).putString("sender",config.getString("smsSender")).putString("public",requireNotNull(publicKey)).commit())
 }
 @Synchronized fun enqueue(c:Context,message:JSONObject){
  val p=prefs(c);if(p.getLong("since",0)<=0||message.getLong("receivedAt")<p.getLong("since",0))return
  if(message.has("activation")&&message.getLong("activation")!=p.getLong("since",0))return
  val q=read(c);val id=message.getString("source")+":"+message.getString("id");if(q.has(id))return;require(q.length()<500){"Coda Fineco piena: sblocca l'app."}
  q.put(id,WidgetQueue.seal(requireNotNull(p.getString("public",null)),message.toString(),"fineco-inbox-v1"));write(c,q);runCatching{changed?.invoke()}
 }
 @Synchronized fun pending(c:Context,privateKey:String):String {val q=read(c);val out=JSONArray();q.keys().forEach{out.put(JSONObject(WidgetQueue.unseal(privateKey,q.getJSONObject(it),"fineco-inbox-v1")))};return out.toString()}
 @Synchronized fun ack(c:Context,ids:List<String>){val q=read(c);ids.forEach{q.remove(it)};write(c,q)}
 fun error(c:Context,text:String){prefs(c).edit().putString("error",text).commit()}
 @Synchronized fun status(c:Context):Map<String,Any> {val p=prefs(c);return mapOf("enabled" to (p.getLong("since",0)>0),"smsGranted" to (androidx.core.content.ContextCompat.checkSelfPermission(c,android.Manifest.permission.RECEIVE_SMS)==android.content.pm.PackageManager.PERMISSION_GRANTED),"gmail" to (p.getString("gmail","")?:""),"lastSync" to p.getLong("lastSync",0).toDouble(),"error" to (p.getString("error","")?:""),"pending" to try{read(c).length()}catch(_:Exception){-1})}
}
class FinecoSmsReceiver:BroadcastReceiver(){
 override fun onReceive(context:Context,intent:Intent){if(intent.action!=Telephony.Sms.Intents.SMS_RECEIVED_ACTION)return
  val result=goAsync();java.util.concurrent.Executors.newSingleThreadExecutor().apply{execute{try{
   val messages=Telephony.Sms.Intents.getMessagesFromIntent(intent);if(messages.isNotEmpty()){
    val sender=messages[0].originatingAddress?:"";val body=messages.joinToString(""){it.messageBody?:""};val p=BankInbox.prefs(context)
    if(sender==p.getString("sender",null)&&body.startsWith("Fineco")){
     val digest=MessageDigest.getInstance("SHA-256");messages.forEach{digest.update(it.pdu)};digest.update(intent.getIntExtra("subscription",-1).toString().toByteArray())
     val id=digest.digest().joinToString(""){"%02x".format(it)}
     BankInbox.enqueue(context,JSONObject().put("id",id).put("source","sms").put("sender",sender).put("receivedAt",messages[0].timestampMillis).put("body",body))
    }
   }
  }catch(_:Exception){BankInbox.error(context,"Ricezione SMS non completata: verifica la coda.")}finally{result.finish();shutdown()}}}
 }
}
