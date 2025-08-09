package com.example.vocabmemory.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.example.vocabmemory.R
import com.example.vocabmemory.data.db.AppDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class WordWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        appWidgetIds.forEach { appWidgetId ->
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_NEXT) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, WordWidgetProvider::class.java))
            ids.forEach { id -> updateWidget(context, manager, id) }
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_placeholder)
        views.setTextViewText(R.id.widget_text_title, context.getString(R.string.app_name))
        // Set button intent
        val intent = Intent(context, WordWidgetProvider::class.java).apply { action = ACTION_NEXT }
        val pi = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        // There is no button in placeholder layout; we will just set click on root
        views.setOnClickPendingIntent(R.id.widget_root, pi)

        appWidgetManager.updateAppWidget(appWidgetId, views)

        // Load random word asynchronously and update
        CoroutineScope(Dispatchers.IO).launch {
            val db = AppDatabaseBuilder.get(context)
            val word = db.wordDao().random()
            if (word != null) {
                val updateViews = RemoteViews(context.packageName, R.layout.widget_placeholder)
                updateViews.setTextViewText(R.id.widget_text_title, "${word.term} — ${word.translation}")
                updateViews.setOnClickPendingIntent(R.id.widget_root, pi)
                appWidgetManager.updateAppWidget(appWidgetId, updateViews)
            }
        }
    }

    companion object {
        const val ACTION_NEXT = "com.example.vocabmemory.widget.NEXT"
    }
}

object AppDatabaseBuilder {
    @Volatile private var instance: com.example.vocabmemory.data.db.AppDatabase? = null
    fun get(context: Context): com.example.vocabmemory.data.db.AppDatabase =
        instance ?: synchronized(this) {
            instance ?: androidx.room.Room.databaseBuilder(
                context.applicationContext,
                com.example.vocabmemory.data.db.AppDatabase::class.java,
                "vocab.db"
            ).build().also { instance = it }
        }
}