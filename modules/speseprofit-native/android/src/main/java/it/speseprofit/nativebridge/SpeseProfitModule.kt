package it.speseprofit.nativebridge

import android.Manifest
import android.os.Build
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SpeseProfitModule : Module() {
  private val lifecycleGuard = Any()
  private var protectedVault: ProtectedVault? = null
  private fun vault(): ProtectedVault = synchronized(lifecycleGuard) {
    protectedVault ?: ProtectedVault(requireNotNull(appContext.reactContext),
      (appContext.currentActivity as? androidx.lifecycle.LifecycleOwner)?.lifecycle?.currentState
        ?.isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED) == true).also { protectedVault = it }
  }
  override fun definition() = ModuleDefinition {
    Name("SpeseProfitNative")
    Events("onBankInboxChanged")
    OnCreate { BankInbox.changed={sendEvent("onBankInboxChanged", emptyMap<String,Any>())} }
    AsyncFunction("bankInboxStatus") { BankInbox.status(requireNotNull(appContext.reactContext)) }
    AsyncFunction("configureBankInbox") { ticket:Double, config:String -> synchronized(lifecycleGuard) {
      vault().touch(ticket.toLong());val c=requireNotNull(appContext.reactContext)
      val json=if(config=="null")null else org.json.JSONObject(config)
      val key=if(json==null)null else vault().widgetQueueKeys(ticket.toLong()).getString("public")
      BankInbox.configure(c,json,key)
    } }
    AsyncFunction("readBankPending") { ticket:Double -> synchronized(lifecycleGuard) { val keys=vault().widgetQueueKeys(ticket.toLong());BankInbox.pending(requireNotNull(appContext.reactContext),keys.getString("private")).also{vault().touch(ticket.toLong())} } }
    AsyncFunction("ackBankPending") { ticket:Double,ids:List<String> -> synchronized(lifecycleGuard) {vault().touch(ticket.toLong());BankInbox.ack(requireNotNull(appContext.reactContext),ids)} }
    AsyncFunction("requestBankSmsPermission") { promise:Promise -> Permissions.askForPermissionsWithPermissionsManager(appContext.permissions,promise,Manifest.permission.RECEIVE_SMS) }
    AsyncFunction("connectBankGmail") { val activity=requireNotNull(appContext.currentActivity);activity.startActivity(android.content.Intent(activity,FinecoGmailConnectActivity::class.java)) }
    AsyncFunction("syncBankGmail") { BankGmail.sync(requireNotNull(appContext.reactContext)) }

    OnActivityEntersForeground { synchronized(lifecycleGuard) { protectedVault?.foreground() } }
    OnActivityEntersBackground { synchronized(lifecycleGuard) { protectedVault?.background() } }
    OnActivityDestroys { synchronized(lifecycleGuard) { protectedVault?.background() } }
    OnDestroy { BankInbox.changed=null;synchronized(lifecycleGuard) { protectedVault?.dispose() } }
    AsyncFunction("widgetQueueStatus") { WidgetQueue.status(requireNotNull(appContext.reactContext)) }
    AsyncFunction("reportWidgetQueueError") { ticket: Double ->
      vault().touch(ticket.toLong()); WidgetQueue.markError(requireNotNull(appContext.reactContext))
    }
    AsyncFunction("readWidgetPending") { ticket: Double ->
      val context=requireNotNull(appContext.reactContext)
      vault().touch(ticket.toLong())
      val ledger=org.json.JSONObject(vault().read(ticket.toLong()))
      val configured=ledger.has("widgetSlots") || ledger.has("widgetShortcuts")
      val count=WidgetQueue.status(context)["count"] as Int
      check(configured || count==0) { "Coda precedente al reset da verificare: nessuna importazione eseguita." }
      if (count==0) "[]"
      else {
        val keys=vault().widgetQueueKeys(ticket.toLong())
        val result=WidgetQueue.pending(context,keys)
        vault().touch(ticket.toLong())
        result
      }
    }
    AsyncFunction("ackWidgetPending") { ticket: Double, ids: List<String> -> synchronized(lifecycleGuard) {
      vault().touch(ticket.toLong());WidgetQueue.acknowledge(requireNotNull(appContext.reactContext),ids)
      BalanceWidget.refresh(requireNotNull(appContext.reactContext))
    } }
    AsyncFunction("discardWidgetPending") { ticket: Double -> synchronized(lifecycleGuard) {
      vault().touch(ticket.toLong());WidgetQueue.discard(requireNotNull(appContext.reactContext))
      BalanceWidget.refresh(requireNotNull(appContext.reactContext))
    } }
    AsyncFunction("publishWidgetSlots") { ticket: Double -> synchronized(lifecycleGuard) {
      val json=org.json.JSONObject(vault().read(ticket.toLong()))
      val slots=json.optJSONArray("widgetSlots")
      val keys=if(json.has("widgetShortcuts") || (slots!=null && (0 until slots.length()).any { slots.optString(it).isNotEmpty() })) vault().widgetQueueKeys(ticket.toLong()) else null
      try { WidgetQueue.publish(requireNotNull(appContext.reactContext),json,keys) } catch(e: Exception) { WidgetQueue.markError(requireNotNull(appContext.reactContext)); throw e }
      BalanceWidget.refresh(requireNotNull(appContext.reactContext))
    } }
    AsyncFunction("reminderStatus") { DailyReminder.status(requireNotNull(appContext.reactContext)) }
    AsyncFunction("requestReminderPermission") { promise: Promise ->
      DailyReminder.channel(requireNotNull(appContext.reactContext))
      if (Build.VERSION.SDK_INT >= 33) Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.POST_NOTIFICATIONS)
      else promise.resolve(mapOf("granted" to true))
    }
    AsyncFunction("getSessionTimeout") { vault().sessionTimeout().toDouble() }
    AsyncFunction("setSessionTimeout") { ticket: Double, milliseconds: Double ->
      require(milliseconds.isFinite() && milliseconds % 1.0 == 0.0)
      vault().configureSessionTimeout(ticket.toLong(), milliseconds.toLong())
    }
    AsyncFunction("resumeVault") { vault().resume()?.toDouble() }
    AsyncFunction("vaultStatus") { vault().status() }
    AsyncFunction("createVault") { password: String, initial: String -> vault().create(password, initial).toDouble() }
    AsyncFunction("unlockVault") { password: String -> vault().unlock(password).toDouble() }
    AsyncFunction("lockVault") { vault().lock() }
    AsyncFunction("touchVault") { ticket: Double -> vault().touch(ticket.toLong()) }
    AsyncFunction("readVault") { ticket: Double -> synchronized(lifecycleGuard) {
      val json = vault().read(ticket.toLong())
      DailyReminder.safelySync(requireNotNull(appContext.reactContext), json)
      json
    } }
    AsyncFunction("writeVault") { ticket: Double, json: String -> synchronized(lifecycleGuard) {
      val previous=org.json.JSONObject(vault().read(ticket.toLong()))
      vault().write(ticket.toLong(), json)
      val next=org.json.JSONObject(json)
      if((previous.has("widgetSlots") || previous.has("widgetShortcuts")) && !next.has("widgetSlots") && !next.has("widgetShortcuts")) WidgetQueue.resetAfterLedgerSave(requireNotNull(appContext.reactContext))
      DailyReminder.safelySync(requireNotNull(appContext.reactContext), json)
    } }
    AsyncFunction("changeVaultPassword") { ticket: Double, current: String, next: String -> vault().changePassword(ticket.toLong(), current, next) }
    AsyncFunction("publishWidget") { week: String, state: String, calculatedAt: String ->
      require(Regex("\\d{4}-\\d{2}-\\d{2}").matches(week))
      require(state in setOf("positive", "negative", "even", "incomplete"))
      val context = requireNotNull(appContext.reactContext)
      val prefs = context.getSharedPreferences(BalanceWidget.PREFS, Context.MODE_PRIVATE)
      check(prefs.edit().clear().putString("weekStart", week).putString("balanceState", state)
        .putString("source", "manual").putString("calculatedAt", calculatedAt).commit())
      BalanceWidget.refresh(context)
    }
    AsyncFunction("clearWidget") {
      val context = requireNotNull(appContext.reactContext)
      check(context.getSharedPreferences(BalanceWidget.PREFS, Context.MODE_PRIVATE).edit().clear().commit())
      BalanceWidget.refresh(context)
    }
  }
}

