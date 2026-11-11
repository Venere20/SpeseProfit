package it.speseprofit.nativebridge

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

@RunWith(AndroidJUnit4::class)
class DailyReminderTest {
  private lateinit var context: Context
  private fun utc(value: String): Long = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(value)!!.time
  @Before fun setup() {
    context = InstrumentationRegistry.getInstrumentation().targetContext
    // Instrumentation uses an isolated test package, never the user's app.
    check(context.packageName != "it.speseprofit.personal")
    DailyReminder.channel(context)
    context.getSharedPreferences(DailyReminder.PREFS, Context.MODE_PRIVATE).edit().clear().commit()
  }
  @After fun cleanup() { DailyReminder.sync(context, "{}") }
  @Test fun actualNotificationIsGenericAndCompletionCancelsIt() {
    assertTrue("Notification permission must be granted to the isolated test package", DailyReminder.allowed(context))
    val now = System.currentTimeMillis(); val today = DailyReminder.day(now)
    val prefs = context.getSharedPreferences(DailyReminder.PREFS, Context.MODE_PRIVATE)
    prefs.edit().putBoolean("enabled",true).putInt("hour",21).putInt("minute",30).putLong("next",now-1000).commit()
    DailyReminder.deliver(context,today,now-1000,now)
    val manager = context.getSystemService(android.app.NotificationManager::class.java)
    val notification = manager.activeNotifications.single { it.id == DailyReminder.ID }.notification
    assertEquals("SpeseProfit",notification.extras.getCharSequence(android.app.Notification.EXTRA_TITLE).toString())
    assertEquals("Hai registrato tutte le spese di oggi?",notification.extras.getCharSequence(android.app.Notification.EXTRA_TEXT).toString())
    assertNotNull(notification.contentIntent)
    assertEquals(today,prefs.getString("notified",null))
    DailyReminder.sync(context, """{"dailyReminder":{"enabled":true,"hour":21,"minute":30},"completedDays":["$today"]}""")
    assertTrue(manager.activeNotifications.none { it.id == DailyReminder.ID })
    DailyReminder.deliver(context,today,now-1000,now)
    assertTrue(manager.activeNotifications.none { it.id == DailyReminder.ID })
  }
  @Test fun winterTimeAndCompletionSkipToday() {
    val now = utc("2026-01-12 18:00")
    assertEquals(utc("2026-01-12 20:30"), DailyReminder.nextTime(now,21,30,null))
    assertEquals(utc("2026-01-13 20:30"), DailyReminder.nextTime(now,21,30,"2026-01-12"))
    assertEquals(utc("2026-01-13 20:30"), DailyReminder.nextTime(utc("2026-01-12 20:30"),21,30,null))
  }
  @Test fun daylightSavingUsesRomeCalendarNot24HourIntervals() {
    assertEquals(utc("2026-03-29 19:30"), DailyReminder.nextTime(utc("2026-03-28 21:00"),21,30,null))
    assertEquals(utc("2026-10-25 20:30"), DailyReminder.nextTime(utc("2026-10-24 21:00"),21,30,null))
    assertEquals("2026-10-19", DailyReminder.day(utc("2026-10-18 22:30")))
  }
  @Test fun invalidHoursRejected() {
    for ((hour,minute) in listOf(24 to 0,-1 to 0,12 to 60)) {
      try { DailyReminder.nextTime(0,hour,minute,null); fail("Invalid time accepted") } catch (_: IllegalArgumentException) { }
    }
  }
  @Test fun mirrorStoresOnlySchedulingMetadataAndResetDisables() {
    val today = DailyReminder.day(System.currentTimeMillis())
    DailyReminder.sync(context, """{"dailyReminder":{"enabled":true,"hour":21,"minute":30},"completedDays":["$today"],"transactions":[{"description":"SECRET_FINANCIAL_VALUE","cents":123456}]}""")
    val prefs = context.getSharedPreferences(DailyReminder.PREFS, Context.MODE_PRIVATE)
    assertEquals(today,prefs.getString("completed", ""))
    assertFalse(prefs.all.toString().contains("SECRET_FINANCIAL_VALUE"))
    assertFalse(prefs.all.toString().contains("123456"))
    DailyReminder.sync(context, "{}")
    assertFalse(prefs.getBoolean("enabled", true)); assertEquals(0L,prefs.getLong("next", 0))
  }
  @Test fun repeatedSyncDoesNotEraseAlreadyNotifiedMarker() {
    val prefs = context.getSharedPreferences(DailyReminder.PREFS, Context.MODE_PRIVATE)
    val today = DailyReminder.day(System.currentTimeMillis())
    prefs.edit().putString("notified",today).commit()
    DailyReminder.sync(context, """{"dailyReminder":{"enabled":true,"hour":21,"minute":30}}""")
    assertEquals(today,prefs.getString("notified", ""))
    if (DailyReminder.allowed(context)) assertTrue(DailyReminder.day(prefs.getLong("next",0)) > today)
  }
  @Test fun completedOrStaleDeliveryDoesNotMarkNotificationAsSent() {
    val now = System.currentTimeMillis(); val today=DailyReminder.day(now)
    DailyReminder.sync(context, """{"dailyReminder":{"enabled":true,"hour":21,"minute":30},"completedDays":["$today"]}""")
    DailyReminder.deliver(context,today,now-1,now)
    val prefs = context.getSharedPreferences(DailyReminder.PREFS, Context.MODE_PRIVATE)
    assertNull(prefs.getString("notified",null))
    DailyReminder.deliver(context,"2020-01-01",now-1,now)
    assertNull(prefs.getString("notified",null))
  }
}
