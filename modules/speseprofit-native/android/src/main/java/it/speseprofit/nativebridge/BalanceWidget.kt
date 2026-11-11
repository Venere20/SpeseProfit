package it.speseprofit.nativebridge

import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import org.json.JSONArray
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.graphics.Color
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class BalanceWidget : AppWidgetProvider() {
  override fun onReceive(context: Context, intent: Intent) {
    if(intent.action!="it.speseprofit.WIDGET_QUICK") { super.onReceive(context,intent); return }
    val done=goAsync()
    java.util.concurrent.Executors.newSingleThreadExecutor().apply {
      execute {
        val message=try {
          val id=intent.getIntExtra("widget",-1)
          val info=AppWidgetManager.getInstance(context).getAppWidgetInfo(id)
          require(info?.provider==ComponentName(context,BalanceWidget::class.java)) { "Widget non disponibile." }
          WidgetQueue.enqueue(context,intent.getIntExtra("slot",-1),intent.getStringExtra("token") ?: "")
          "Aggiunta alla coda"
        } catch(e: Exception) { e.message?.takeIf { it.startsWith("Coda piena") || it.startsWith("Attendi") || it.startsWith("Widget aggiornato") } ?: "Salvataggio non confermato. Apri l’app per controllare." }
        try { refresh(context); Handler(Looper.getMainLooper()).post { Toast.makeText(context,message,Toast.LENGTH_SHORT).show() } }
        finally { done.finish(); shutdown() }
      }
    }
  }
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    ids.forEach { render(context, manager, it) }
  }
  companion object {
    const val PREFS = "speseprofit_widget_status_only"
    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      manager.getAppWidgetIds(ComponentName(context, BalanceWidget::class.java)).forEach { render(context, manager, it) }
    }
    private fun currentWeek(at: Long = System.currentTimeMillis()): String {
      val zone = TimeZone.getTimeZone("Europe/Rome")
      val calendar = Calendar.getInstance(zone).apply { timeInMillis = at }
      val offset = (calendar.get(Calendar.DAY_OF_WEEK) + 5) % 7
      calendar.add(Calendar.DAY_OF_MONTH, -offset)
      return SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { timeZone = zone }.format(calendar.time)
    }
    private fun currentDate(at: Long): String = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply {
      timeZone = TimeZone.getTimeZone("Europe/Rome")
    }.format(Date(at))
    private fun parseTime(value: String?): Long? = try {
      if (value == null) null else SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.ROOT)
        .apply { timeZone = TimeZone.getTimeZone("UTC"); isLenient = false }.parse(value)?.time
    } catch (_: Exception) { null }
    private fun render(context: Context, manager: AppWidgetManager, id: Int) {
      manager.updateAppWidget(id,createViews(context,id))
    }
    fun createViews(context: Context, id: Int): RemoteViews {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val last = parseTime(prefs.getString("calculatedAt", null))
      val fresh = prefs.getString("source", null) == "manual" && prefs.getString("weekStart", null) == currentWeek() && last != null &&
        last <= System.currentTimeMillis() && currentWeek(last) == currentWeek() && currentDate(last) == currentDate(System.currentTimeMillis())
      val state = if (fresh) prefs.getString("balanceState", "incomplete") else "stale"
      val text = when (state) { "positive" -> "Positivo"; "negative" -> "Negativo"; "even" -> "In pareggio"; "incomplete" -> "Da completare"; else -> "Da aggiornare" }
      val color = when (state) { "positive" -> "#A7D5BF"; "negative" -> "#E8A7A7"; "even" -> "#CDBB98"; "incomplete" -> "#EACB8C"; else -> "#EACB8C" }
      val views = RemoteViews(context.packageName, R.layout.speseprofit_widget_layout)
      views.setTextViewText(R.id.widget_status, text)
      val pending=WidgetQueue.status(context)
      val count=pending["count"] as Int
      val counts=(pending["counts"] as? List<*>) ?: listOf(0,0,0)
      val uncertain=count!=0 || pending["error"]==true
      views.setTextColor(R.id.widget_status, if(uncertain) Color.parseColor("#CDBB98") else Color.parseColor(color))
      views.setTextViewText(R.id.widget_status, text)
      val stateIcon=when(state) { "positive" -> "↗"; "negative" -> "↘"; "even" -> "="; "incomplete" -> "!"; else -> "◷" }
      views.setTextViewText(R.id.widget_state_icon,stateIcon)
      views.setTextColor(R.id.widget_state_icon,Color.parseColor(color))
      val week=prefs.getString("weekStart",null)
      val period=try { val zone=TimeZone.getTimeZone("Europe/Rome"); val parser=SimpleDateFormat("yyyy-MM-dd",Locale.ROOT).apply { timeZone=zone;isLenient=false }; val cal=Calendar.getInstance(zone).apply { time=requireNotNull(parser.parse(week ?: "")) }; val f=SimpleDateFormat("d MMM",Locale.ITALIAN).apply { timeZone=zone }; val first=f.format(cal.time);cal.add(Calendar.DAY_OF_MONTH,6);first+" – "+f.format(cal.time) } catch(_:Exception) { "Settimana da aggiornare" }
      views.setTextViewText(R.id.widget_period,period)
      views.setTextViewText(R.id.widget_total_pending,if(count>0) "$count "+(if(count==1) "spesa" else "spese")+" in attesa" else if(pending["error"]==true) "Coda da verificare" else "")
      val updated = if (last == null) "Apri l’app per aggiornare" else "Agg. " + SimpleDateFormat("dd/MM HH:mm", Locale.ITALY).apply { timeZone = TimeZone.getTimeZone("Europe/Rome") }.format(Date(last))
      views.setTextViewText(R.id.widget_updated, if(count<0 || pending["error"]==true) "$updated\nCoda da verificare" else if(count>0) "$updated\nUltimo saldo" else updated)
      val slots=try { JSONArray(context.getSharedPreferences(WidgetQueue.PREFS,Context.MODE_PRIVATE).getString("slots","[]")) } catch(_: Exception) { JSONArray() }
      val tiles=listOf(R.id.widget_tile_0,R.id.widget_tile_1,R.id.widget_tile_2)
      val types=listOf(R.id.widget_type_0,R.id.widget_type_1,R.id.widget_type_2)
      val badges=listOf(R.id.widget_count_0,R.id.widget_count_1,R.id.widget_count_2)
      val hints=listOf(R.id.widget_hint_0,R.id.widget_hint_1,R.id.widget_hint_2)
      val icons=listOf(R.id.widget_icon_0,R.id.widget_icon_1,R.id.widget_icon_2)
      listOf(R.id.widget_slot_0,R.id.widget_slot_1,R.id.widget_slot_2).forEachIndexed { slot, view ->
        val model=slots.optJSONObject(slot)
        val token=model?.optString("token","") ?: ""
        views.setTextViewText(view,model?.optString("label","Scegli modello") ?: "Scegli modello")
        val amount=counts.getOrNull(slot) as? Int ?: 0
        views.setTextViewText(types[slot],if(model?.optString("type")=="category") "Categoria" else if(token.isNotEmpty()) "Spesa frequente" else "Configura")
        views.setTextViewText(badges[slot],amount.toString())
        views.setViewVisibility(badges[slot],if(amount>0) android.view.View.VISIBLE else android.view.View.GONE)
        views.setTextViewText(hints[slot],if(amount>0) "$amount in attesa" else "+ Spesa rapida")
        val icon=if(Regex("carburante|benzina|rifornimento",RegexOption.IGNORE_CASE).containsMatchIn(model?.optString("label","") ?: "")) R.drawable.speseprofit_fuel else when(model?.optString("category")) { "food" -> R.drawable.speseprofit_basket; "dining" -> R.drawable.speseprofit_coffee; "transport" -> R.drawable.speseprofit_car; "shopping" -> R.drawable.speseprofit_bag; else -> R.drawable.speseprofit_shortcut }
        views.setImageViewResource(icons[slot],icon)
        views.setContentDescription(tiles[slot],"Aggiungi spesa rapida "+(model?.optString("label","") ?: "")+if(amount>0) ". $amount in attesa" else "")
        if(token.isNotEmpty() && model?.has("sealed")==true && !model.optBoolean("requiresAmount",false)) {
          val click=Intent(context,BalanceWidget::class.java).setAction("it.speseprofit.WIDGET_QUICK")
            .setData(android.net.Uri.parse("speseprofit-widget://$id/$slot/$token"))
            .putExtra("slot",slot).putExtra("widget",id).putExtra("token",token)
          views.setOnClickPendingIntent(tiles[slot],PendingIntent.getBroadcast(context,id*4+slot+1,click,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        } else if(token.isNotEmpty() && model?.has("sealed")==true && model.optBoolean("requiresAmount",false)) {
          val launch=Intent(context,QuickExpenseActivity::class.java).setData(android.net.Uri.parse("speseprofit-amount://$id/$slot/$token"))
            .putExtra("slot",slot).putExtra("token",token).putExtra("widget",id)
          views.setOnClickPendingIntent(tiles[slot],PendingIntent.getActivity(context,id*4+slot+1,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        } else context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
          launch.action=Intent.ACTION_VIEW;launch.data=android.net.Uri.parse(if(token.isNotEmpty()) "speseprofit://spesa?slot=$slot" else "speseprofit://widget")
          views.setOnClickPendingIntent(tiles[slot],PendingIntent.getActivity(context,91+slot,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        }
      }
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { intent ->
        views.setOnClickPendingIntent(R.id.widget_summary, PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      }
      return views
    }
  }
}
