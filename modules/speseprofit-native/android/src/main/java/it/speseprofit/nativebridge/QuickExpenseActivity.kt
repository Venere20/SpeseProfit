package it.speseprofit.nativebridge

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import org.json.JSONArray

/** Amount-only entry. Uses public encryption and never opens or reads the vault. */
class QuickExpenseActivity : Activity() {
  companion object {
    fun parseAmount(raw: String): Long {
      val text=raw.trim()
      require(Regex("\\d{1,9}([,.]\\d{1,2})?").matches(text)) { "Inserisci un importo valido maggiore di zero." }
      val parts=text.replace(',','.').split('.')
      val cents=parts[0].toLong()*100+(parts.getOrNull(1) ?: "").padEnd(2,'0').toLong()
      require(cents in 1..100_000_000_000L) { "Inserisci un importo valido maggiore di zero." }
      return cents
    }
  }
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE)
    val background=Color.parseColor("#101C27");val foreground=Color.parseColor("#F4EFE5");val accent=Color.parseColor("#CDBB98")
    window.statusBarColor=background;window.navigationBarColor=background
    val slot=intent.getIntExtra("slot",-1);val token=intent.getStringExtra("token") ?: "";val widget=intent.getIntExtra("widget",-1)
    val occurredAt=System.currentTimeMillis()
    val model=try {
      require(slot in 0..2)
      require(AppWidgetManager.getInstance(this).getAppWidgetInfo(widget)?.provider==ComponentName(this,BalanceWidget::class.java))
      JSONArray(getSharedPreferences(WidgetQueue.PREFS,MODE_PRIVATE).getString("slots","[]")).getJSONObject(slot).also {
        require(token.isNotEmpty() && it.optString("token")==token && it.optBoolean("requiresAmount"))
      }
    } catch(_:Exception) { Toast.makeText(this,"Widget aggiornato: riprova.",Toast.LENGTH_SHORT).show();finish();return }
    fun dp(value:Int)=(value*resources.displayMetrics.density).toInt()
    val content=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL;setPadding(dp(20),dp(24),dp(20),dp(24));setBackgroundColor(background) }
    fun label(text:String,size:Float=16f,color:Int=foreground)=TextView(this).apply {this.text=text;textSize=size;setTextColor(color);setPadding(0,dp(8),0,dp(8))}
    content.addView(label("SPESEPROFIT",12f,accent));content.addView(label("Spesa rapida",26f));content.addView(label(model.getString("label"),18f));content.addView(label("Importo (€)",14f))
    val amount=EditText(this).apply { hint="0,00";setTextColor(foreground);setHintTextColor(Color.parseColor("#B9C4CD"));this.background=android.graphics.drawable.GradientDrawable().apply {setColor(Color.parseColor("#263947"));cornerRadius=dp(12).toFloat();setStroke(dp(1),Color.parseColor("#405563"))};filters=arrayOf(android.text.InputFilter.LengthFilter(12));fontFeatureSettings="tnum";setPadding(dp(14),dp(12),dp(14),dp(12));textSize=24f;inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL;isSaveEnabled=false;contentDescription="Importo della spesa rapida";if(android.os.Build.VERSION.SDK_INT>=26)importantForAutofill=View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS }
    amount.minHeight=dp(64);content.addView(amount,LinearLayout.LayoutParams(-1,-2))
    val error=label("",14f,Color.parseColor("#E8A7A7"));error.accessibilityLiveRegion=View.ACCESSIBILITY_LIVE_REGION_POLITE;content.addView(error)
    val save=Button(this).apply {text="Aggiungi alla coda";isAllCaps=false;setTextColor(background);this.background=android.graphics.drawable.GradientDrawable().apply {setColor(accent);cornerRadius=dp(12).toFloat()};elevation=0f;minHeight=dp(52)}
    val cancel=Button(this).apply {text="Annulla";isAllCaps=false;setTextColor(foreground);this.background=android.graphics.drawable.GradientDrawable().apply {setColor(Color.parseColor("#263947"));cornerRadius=dp(12).toFloat()};elevation=0f;minHeight=dp(52);setOnClickListener {finish()}}
    save.setOnClickListener {
      val cents=try {parseAmount(amount.text.toString())}catch(e:Exception){error.text=e.message;return@setOnClickListener}
      save.isEnabled=false;amount.isEnabled=false;cancel.isEnabled=false
      java.util.concurrent.Executors.newSingleThreadExecutor().apply {execute {
        val result=try {WidgetQueue.enqueue(applicationContext,slot,token,occurredAt,cents);null}catch(e:Exception){e.message?.takeIf { it.startsWith("Widget aggiornato") || it.startsWith("Coda piena") || it.startsWith("Inserisci") } ?: "Salvataggio non confermato. Apri l’app per controllare."}
        try { BalanceWidget.refresh(applicationContext) } catch(_:Exception) {WidgetQueue.markError(applicationContext)}
        runOnUiThread {
          if(result==null){amount.text.clear();Toast.makeText(applicationContext,"Aggiunta alla coda",Toast.LENGTH_SHORT).show();finish()}
          else {error.text=result;save.isEnabled=true;amount.isEnabled=true;cancel.isEnabled=true}
        }
        shutdown()
      }}
    }
    content.addView(save,LinearLayout.LayoutParams(-1,-2))
    content.addView(cancel,LinearLayout.LayoutParams(-1,-2))
    val scroll=ScrollView(this).apply {setBackgroundColor(background);isFillViewport=true;addView(content)}
    scroll.setOnApplyWindowInsetsListener { view,insets ->
      if(android.os.Build.VERSION.SDK_INT>=30) {
        val bars=insets.getInsets(android.view.WindowInsets.Type.systemBars());val ime=insets.getInsets(android.view.WindowInsets.Type.ime());view.setPadding(bars.left,bars.top,bars.right,maxOf(bars.bottom,ime.bottom))
      } else view.setPadding(insets.systemWindowInsetLeft,insets.systemWindowInsetTop,insets.systemWindowInsetRight,insets.systemWindowInsetBottom)
      insets
    }
    setContentView(scroll)
    amount.requestFocus()
  }
}
