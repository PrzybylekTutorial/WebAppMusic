package com.example.vocabmemory.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocabmemory.data.db.WordEntity
import com.example.vocabmemory.data.repo.WordsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WordsViewModel @Inject constructor(
    private val repository: WordsRepository
) : ViewModel() {

    val words: StateFlow<List<WordEntity>> = repository.observeAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    suspend fun getWord(id: Long): WordEntity? = repository.getById(id)

    fun saveWord(id: Long?, term: String, translation: String, example: String?) {
        viewModelScope.launch {
            val entity = WordEntity(
                id = id ?: 0,
                term = term.trim(),
                translation = translation.trim(),
                example = example?.trim().takeUnless { it.isNullOrEmpty() }
            )
            repository.upsert(entity)
        }
    }

    fun delete(word: WordEntity) {
        viewModelScope.launch { repository.delete(word) }
    }
}