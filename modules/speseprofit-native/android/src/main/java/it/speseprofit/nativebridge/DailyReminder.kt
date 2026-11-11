package it.speseprofit.nativebridge

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/** Contains only scheduling metadata. Never reads a vault or stores financial data. */
object DailyReminder {
  const val PREFS = "speseprofit_daily_reminder"
  const val CHANNEL = "daily_check"
  const val ACTION = "it.speseprofit.DAILY_CHECK"
  const val ID = 9142
  private val zone get() = TimeZone.getTimeZone("Europe/Rome")
  fun day(now: Long): String = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { timeZone = zone }.format(now)
  fun nextTime(now: Long, hour: Int, minute: Int, completed: String?): Long {
    require(hour in 0..23 && minute in 0..59)
    val cal = Calendar.getInstance(zone).apply {
      timeInMillis = now; set(Calendar.HOUR_OF_DAY, hour); set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    if (cal.timeInMillis <= now || completed == day(now)) cal.add(Calendar.DAY_OF_MONTH, 1)
    return cal.timeInMillis
  }
  private fun manager(context: Context) = context.getSystemService(NotificationManager::class.java)
  fun channel(context: Context) {
    if (Build.VERSION.SDK_INT >= 26) manager(context).createNotificationChannel(
      NotificationChannel(CHANNEL, "Controllo giornaliero", NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "Promemoria locale senza importi o dettagli finanziari"
        lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        setShowBadge(false)
      })
  }
  fun allowed(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false
    if (!manager(context).areNotificationsEnabled()) return false
    return Build.VERSION.SDK_INT < 26 || manager(context).getNotificationChannel(CHANNEL)?.importance != NotificationManager.IMPORTANCE_NONE
  }
  private fun operation(context: Context, date: String = "", at: Long = 0) = PendingIntent.getBroadcast(context, ID,
    Intent(context, DailyReminderReceiver::class.java).setAction(ACTION).putExtra("day", date).putExtra("at", at),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

  @Synchronized fun schedule(context: Context, now: Long = System.currentTimeMillis()) {
    channel(context)
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val alarm = context.getSystemService(AlarmManager::class.java)
    alarm.cancel(operation(context))
    check(prefs.edit().remove("next").commit())
    if (!prefs.getBoolean("enabled", false) || !allowed(context)) return
    val completed = prefs.getString("completed", null)
    var next = nextTime(now, prefs.getInt("hour", 21), prefs.getInt("minute", 30), completed)
    if (prefs.getString("notified", null) == day(next)) next = nextTime(next + 1, prefs.getInt("hour", 21), prefs.getInt("minute", 30), null)
    alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, operation(context, day(next), next))
    check(prefs.edit().putLong("next", next).putBoolean("error", false).commit())
  }
  @Synchronized fun sync(context: Context, json: String) {
    val state = JSONObject(json)
    val value = state.optJSONObject("dailyReminder")
    val enabled = value?.optBoolean("enabled", false) ?: false
    val hour = value?.optInt("hour", 21) ?: 21
    val minute = value?.optInt("minute", 30) ?: 30
    require(hour in 0..23 && minute in 0..59)
    val today = day(System.currentTimeMillis())
    val days = state.optJSONArray("completedDays")
    val completed = (0 until (days?.length() ?: 0)).any { days?.optString(it) == today }
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    check(prefs.edit().putBoolean("enabled", enabled).putInt("hour", hour).putInt("minute", minute)
      .putString("completed", if (completed) today else "").commit())
    if (!enabled || completed) manager(context).cancel(ID)
    schedule(context)
  }
  fun safelySync(context: Context, json: String) {
    try { sync(context, json) } catch (_: Exception) { markError(context) }
  }
  fun markError(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("error", true).remove("next").apply()
  }
  fun status(context: Context): Map<String, Boolean> {
    channel(context)
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return mapOf("allowed" to allowed(context), "scheduled" to (prefs.getLong("next", 0) > 0 && allowed(context)), "error" to prefs.getBoolean("error", false))
  }
  @Synchronized fun deliver(context: Context, scheduledDay: String?, expectedAt: Long, now: Long = System.currentTimeMillis()) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val today = day(now)
    if (prefs.getBoolean("enabled", false) && scheduledDay == today && expectedAt == prefs.getLong("next", 0) && expectedAt > 0 && expectedAt <= now && prefs.getString("completed", "") != today &&
        prefs.getString("notified", "") != today && allowed(context)) {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        launch.action = Intent.ACTION_VIEW; launch.data = Uri.parse("speseprofit://giornata")
        launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val content = PendingIntent.getActivity(context, ID, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else Notification.Builder(context)
        builder.setSmallIcon(R.drawable.speseprofit_notification).setContentTitle("SpeseProfit")
          .setContentText("Hai registrato tutte le spese di oggi?").setContentIntent(content)
          .setVisibility(Notification.VISIBILITY_PRIVATE).setAutoCancel(true).setOnlyAlertOnce(true)
        check(prefs.edit().putString("notified", today).commit())
        manager(context).notify(ID, builder.build())
      }
    }
    schedule(context, now)
  }
}
class DailyReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try {
      if (intent.action == DailyReminder.ACTION) DailyReminder.deliver(context, intent.getStringExtra("day"), intent.getLongExtra("at", 0))
      else if (intent.action in setOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED)) DailyReminder.schedule(context)
    } catch (_: Exception) { DailyReminder.markError(context) }
  }
}
