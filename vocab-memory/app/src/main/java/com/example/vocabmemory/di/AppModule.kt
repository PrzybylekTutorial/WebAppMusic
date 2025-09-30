package com.example.vocabmemory.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import androidx.room.Room
import com.example.vocabmemory.data.db.AppDatabase
import com.example.vocabmemory.data.db.WordDao
import com.example.vocabmemory.data.repo.WordsRepository
import com.example.vocabmemory.settings.SettingsRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

private val Context.appDataStore by preferencesDataStore(name = "settings")

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "vocab.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideWordDao(db: AppDatabase): WordDao = db.wordDao()

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        context.appDataStore

    @Provides
    @Singleton
    fun provideRepository(dao: WordDao): WordsRepository = WordsRepository(dao)

    @Provides
    @Singleton
    fun provideSettingsRepository(ds: DataStore<Preferences>): SettingsRepository = SettingsRepository(ds)
}