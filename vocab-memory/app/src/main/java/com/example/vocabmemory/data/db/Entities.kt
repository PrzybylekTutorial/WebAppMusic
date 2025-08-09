package com.example.vocabmemory.data.db

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.Instant

@Entity(tableName = "words")
data class WordEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val term: String,
    val translation: String,
    val example: String?,
    @ColumnInfo(defaultValue = "0") val correctCount: Int = 0,
    @ColumnInfo(defaultValue = "0") val incorrectCount: Int = 0,
    val nextReviewAtEpochSec: Long = 0,
    val createdAtEpochSec: Long = Instant.now().epochSecond,
    val updatedAtEpochSec: Long = Instant.now().epochSecond,
)