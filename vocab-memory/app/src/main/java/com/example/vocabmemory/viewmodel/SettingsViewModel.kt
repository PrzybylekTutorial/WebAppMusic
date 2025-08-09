package com.example.vocabmemory.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.vocabmemory.settings.SettingsRepository
import com.example.vocabmemory.settings.ThemeMode
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    val themeMode: StateFlow<ThemeMode> = settingsRepository.themeMode
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ThemeMode.System)

    fun cycleTheme() {
        viewModelScope.launch {
            val current = settingsRepository.themeMode.first()
            val next = when (current) {
                ThemeMode.System -> ThemeMode.Light
                ThemeMode.Light -> ThemeMode.Dark
                ThemeMode.Dark -> ThemeMode.System
            }
            settingsRepository.setThemeMode(next)
        }
    }
}