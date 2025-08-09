package com.example.vocabmemory.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocabmemory.data.db.WordEntity
import com.example.vocabmemory.data.repo.WordsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LearnViewModel @Inject constructor(
    private val repository: WordsRepository
) : ViewModel() {

    private val _queue = MutableStateFlow<List<WordEntity>>(emptyList())
    val queue: StateFlow<List<WordEntity>> = _queue

    private val _current = MutableStateFlow<WordEntity?>(null)
    val current: StateFlow<WordEntity?> = _current

    init { refreshQueue() }

    fun refreshQueue() {
        viewModelScope.launch {
            val due = repository.getDue(limit = 20)
            _queue.value = due
            _current.value = due.firstOrNull()
        }
    }

    fun answer(correct: Boolean) {
        val word = _current.value ?: return
        viewModelScope.launch {
            repository.markAnswer(word, correct)
            val remaining = _queue.value.drop(1)
            _queue.value = remaining
            _current.value = remaining.firstOrNull()
        }
    }
}