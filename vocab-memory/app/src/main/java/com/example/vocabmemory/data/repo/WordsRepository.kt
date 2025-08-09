package com.example.vocabmemory.data.repo

import com.example.vocabmemory.data.db.WordDao
import com.example.vocabmemory.data.db.WordEntity
import kotlinx.coroutines.flow.Flow
import java.time.Instant
import java.time.temporal.ChronoUnit
import javax.inject.Inject

class WordsRepository @Inject constructor(
    private val wordDao: WordDao
) {
    fun observeAll(): Flow<List<WordEntity>> = wordDao.observeAll()

    suspend fun getAll(): List<WordEntity> = wordDao.getAll()

    suspend fun getById(id: Long): WordEntity? = wordDao.getById(id)

    suspend fun upsert(word: WordEntity): Long = wordDao.upsert(
        word.copy(updatedAtEpochSec = Instant.now().epochSecond)
    )

    suspend fun delete(word: WordEntity) = wordDao.delete(word)

    suspend fun markAnswer(word: WordEntity, correct: Boolean): Long {
        val now = Instant.now()
        val next = computeNextReview(word, correct)
        val updated = word.copy(
            correctCount = if (correct) word.correctCount + 1 else word.correctCount,
            incorrectCount = if (!correct) word.incorrectCount + 1 else word.incorrectCount,
            nextReviewAtEpochSec = next.epochSecond,
            updatedAtEpochSec = now.epochSecond
        )
        return wordDao.upsert(updated)
    }

    suspend fun getDue(limit: Int = 20): List<WordEntity> =
        wordDao.dueWords(Instant.now().epochSecond, limit)

    suspend fun random(): WordEntity? = wordDao.random()

    private fun computeNextReview(word: WordEntity, correct: Boolean): Instant {
        // Very simple SRS: intervals 1, 3, 7 days after consecutive correct answers; reset on wrong
        val base = Instant.now()
        val streak = if (correct) word.correctCount + 1 else 0
        val days = when (streak) {
            0 -> 1
            1 -> 1
            2 -> 3
            else -> 7
        }
        return base.plus(days.toLong(), ChronoUnit.DAYS)
    }
}