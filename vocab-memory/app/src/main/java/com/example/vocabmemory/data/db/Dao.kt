package com.example.vocabmemory.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface WordDao {
    @Query("SELECT * FROM words ORDER BY updatedAtEpochSec DESC")
    fun observeAll(): Flow<List<WordEntity>>

    @Query("SELECT * FROM words")
    suspend fun getAll(): List<WordEntity>

    @Query("SELECT * FROM words WHERE id = :id")
    suspend fun getById(id: Long): WordEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(word: WordEntity): Long

    @Delete
    suspend fun delete(word: WordEntity)

    @Query("SELECT * FROM words WHERE nextReviewAtEpochSec <= :now ORDER BY nextReviewAtEpochSec ASC LIMIT :limit")
    suspend fun dueWords(now: Long, limit: Int): List<WordEntity>

    @Query("SELECT * FROM words ORDER BY RANDOM() LIMIT 1")
    suspend fun random(): WordEntity?
}