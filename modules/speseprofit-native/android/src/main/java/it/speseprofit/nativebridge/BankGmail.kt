package it.speseprofit.nativebridge
import android.accounts.Account
import android.app.Activity
import android.os.Bundle
import android.content.Context
import android.content.Intent
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.common.api.Scope
import com.google.android.gms.tasks.Tasks
import org.json.JSONObject
import android.util.Base64
import androidx.work.*
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

object BankGmail {
 fun request(email:String?=null):AuthorizationRequest {val b=AuthorizationRequest.builder().setRequestedScopes(listOf(Scope("https://www.googleapis.com/auth/gmail.readonly")));if(!email.isNullOrBlank())b.setAccount(Account(email,"com.google"));return b.build()}
 fun get(token:String,path:String):JSONObject {
  val connection=URL("https://gmail.googleapis.com/gmail/v1/users/me/"+path).openConnection() as javax.net.ssl.HttpsURLConnection
  connection.connectTimeout=20000;connection.readTimeout=20000;connection.setRequestProperty("Authorization","Bearer $token")
  return try{check(connection.responseCode==200){"Gmail non disponibile: ricollega l'account."};connection.inputStream.bufferedReader().use{JSONObject(it.readText())}}finally{connection.disconnect()}
 }
 fun schedule(c:Context){val work=PeriodicWorkRequestBuilder<FinecoGmailWorker>(15,TimeUnit.MINUTES).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build();WorkManager.getInstance(c).enqueueUniquePeriodicWork("fineco-gmail",ExistingPeriodicWorkPolicy.UPDATE,work)}
 fun sync(c:Context){val p=BankInbox.prefs(c);val since=p.getLong("since",0);val email=p.getString("gmail",null);if(since<=0||email.isNullOrBlank())return
  val result=Tasks.await(Identity.getAuthorizationClient(c).authorize(request(email)),30,TimeUnit.SECONDS)
  check(!result.hasResolution()){ "Ricollega Gmail nelle impostazioni." };val token=requireNotNull(result.accessToken)
  val start=maxOf(since,p.getLong("lastSync",since)-86400000);val now=System.currentTimeMillis()
  val query="from:service@finecobank.com subject:bonifico -in:spam -in:trash after:"+(start/1000)
  var page=""
  do{
   val list=get(token,"messages?maxResults=100&q="+URLEncoder.encode(query,"UTF-8")+if(page.isEmpty())"" else "&pageToken="+URLEncoder.encode(page,"UTF-8"))
   val ids=list.optJSONArray("messages")
   for(i in 0 until (ids?.length()?:0)){
    val m=get(token,"messages/"+ids!!.getJSONObject(i).getString("id")+"?format=full");val at=m.getLong("internalDate");if(at<since)continue
    val payload=m.getJSONObject("payload");val headers=payload.getJSONArray("headers")
    fun header(name:String)=(0 until headers.length()).map{headers.getJSONObject(it)}.firstOrNull{it.getString("name").equals(name,true)}?.getString("value")?:""
    val from=header("From");if(!Regex("^(?:FinecoBank\\s*)?<service@finecobank\\.com>$|^service@finecobank\\.com$",RegexOption.IGNORE_CASE).matches(from.trim()))continue
    // Authentication metadata is not treated as a bank transaction reference.
    val auth=header("Authentication-Results")
    check(auth.startsWith("mx.google.com;")&&auth.contains("dkim=pass")&&auth.contains("header.i=@finecobank.com")&&auth.contains("dmarc=pass")){"Avviso Fineco con autenticazione da verificare."}
    fun text(part:JSONObject):String {
     val parts=part.optJSONArray("parts");if(parts!=null)return (0 until parts.length()).joinToString("\n"){text(parts.getJSONObject(it))}
     if(part.optString("mimeType")!="text/plain")return ""
     return String(Base64.decode(part.optJSONObject("body")?.optString("data","")?:"",Base64.URL_SAFE),Charsets.UTF_8)
    }
    val body=text(payload);require(body.length<=32768)
    BankInbox.enqueue(c,JSONObject().put("activation",since).put("id",email+":"+m.getString("id")).put("source","gmail").put("sender","service@finecobank.com").put("subject",header("Subject")).put("receivedAt",at).put("body",body))
   };page=list.optString("nextPageToken","")
  }while(page.isNotEmpty())
  check(p.edit().putLong("lastSync",now).remove("error").commit())
 }
}
class FinecoGmailWorker(c:Context,p:WorkerParameters):Worker(c,p){override fun doWork():Result=try{BankGmail.sync(applicationContext);Result.success()}catch(_:Exception){BankInbox.error(applicationContext,"Sincronizzazione Gmail non completata. Verifica connessione e autorizzazione.");Result.retry()}}
class FinecoGmailConnectActivity:Activity(){
 override fun onCreate(b:Bundle?){super.onCreate(b);Identity.getAuthorizationClient(this).authorize(BankGmail.request()).addOnSuccessListener{result->if(result.hasResolution()){try{startIntentSenderForResult(result.pendingIntent!!.intentSender,42,null,0,0,0)}catch(_:Exception){fail()}}else complete(result)}.addOnFailureListener{fail()}}
 @Deprecated("Android callback") override fun onActivityResult(requestCode:Int,resultCode:Int,data:Intent?){super.onActivityResult(requestCode,resultCode,data);if(requestCode==42&&resultCode==RESULT_OK&&data!=null){try{complete(Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(data))}catch(_:Exception){fail()}}else fail()}
 private fun fail(){BankInbox.error(this,"Collegamento Gmail non completato. Verifica la configurazione Google.");finish()}
 private fun complete(result:AuthorizationResult){java.util.concurrent.Executors.newSingleThreadExecutor().apply{execute{try{val email=BankGmail.get(requireNotNull(result.accessToken),"profile").getString("emailAddress");check(BankInbox.prefs(this@FinecoGmailConnectActivity).edit().putString("gmail",email).remove("error").commit());BankGmail.schedule(this@FinecoGmailConnectActivity)}catch(_:Exception){BankInbox.error(this@FinecoGmailConnectActivity,"Configurazione Gmail non completata.")}finally{runOnUiThread{finish()};shutdown()}}}}
}
