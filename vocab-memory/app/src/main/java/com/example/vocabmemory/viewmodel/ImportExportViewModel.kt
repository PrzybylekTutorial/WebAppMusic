package com.example.vocabmemory.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import com.example.vocabmemory.data.repo.WordsRepository
import com.github.doyaaaaaken.kotlincsv.client.CsvReader
import com.github.doyaaaaaken.kotlincsv.client.CsvWriter
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject

@HiltViewModel
class ImportExportViewModel @Inject constructor(
    private val repository: WordsRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    suspend fun importFromCsv(uri: Uri): Int = withContext(Dispatchers.IO) {
        val reader = CsvReader()
        var count = 0
        context.contentResolver.openInputStream(uri)?.use { input ->
            reader.open(input) {
                readAllAsSequence().forEach { row ->
                    val term = row.getOrNull(0)?.trim().orEmpty()
                    val translation = row.getOrNull(1)?.trim().orEmpty()
                    val example = row.getOrNull(2)?.trim()
                    if (term.isNotEmpty() && translation.isNotEmpty()) {
                        repository.upsert(com.example.vocabmemory.data.db.WordEntity(term = term, translation = translation, example = example))
                        count++
                    }
                }
            }
        }
        count
    }

    suspend fun exportToCsv(uri: Uri): Int = withContext(Dispatchers.IO) {
        val writer = CsvWriter()
        val all = repository.getAll()
        var count = 0
        context.contentResolver.openOutputStream(uri)?.use { output ->
            writer.open(output) {
                writeRow(listOf("term", "translation", "example"))
                all.forEach { w ->
                    writeRow(listOf(w.term, w.translation, w.example.orEmpty()))
                    count++
                }
            }
        }
        count
    }
}