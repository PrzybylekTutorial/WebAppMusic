package com.example.vocabmemory.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.vocabmemory.data.db.WordEntity
import com.example.vocabmemory.viewmodel.WordsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WordListScreen(
    viewModel: WordsViewModel,
    onAddClick: () -> Unit,
    onEditClick: (Long) -> Unit,
    onLearnClick: () -> Unit,
    onImportExportClick: () -> Unit,
    onToggleTheme: () -> Unit,
) {
    val words by viewModel.words.collectAsState()

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(title = { Text(text = "VocabMemory") }, actions = {
                IconButton(onClick = onToggleTheme) { Icon(Icons.Default.LightMode, contentDescription = null) }
                TextButton(onClick = onLearnClick) { Text(text = "Ucz się") }
                TextButton(onClick = onImportExportClick) { Text(text = "Import/Eksport") }
            })
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddClick) {
                Icon(imageVector = Icons.Default.Add, contentDescription = null)
            }
        }
    ) { padding ->
        if (words.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Brak słówek. Dodaj nowe.")
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding)
            ) {
                items(words, key = { it.id }) { item ->
                    WordRow(
                        word = item,
                        onClick = { onEditClick(item.id) },
                        onDelete = { viewModel.delete(item) }
                    )
                    Divider()
                }
            }
        }
    }
}

@Composable
private fun WordRow(word: WordEntity, onClick: () -> Unit, onDelete: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = word.term, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(text = word.translation, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (!word.example.isNullOrEmpty()) {
                Text(text = word.example ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
        IconButton(onClick = onDelete) {
            Icon(imageVector = Icons.Default.Delete, contentDescription = null)
        }
    }
}