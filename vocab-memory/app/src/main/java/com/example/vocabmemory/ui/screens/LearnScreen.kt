package com.example.vocabmemory.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.vocabmemory.viewmodel.LearnViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LearnScreen(
    viewModel: LearnViewModel,
    onBack: () -> Unit
) {
    val current by viewModel.current.collectAsState()
    var revealed by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            SmallTopAppBar(
                title = { Text("Nauka") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null) } }
            )
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            if (current == null) {
                Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Brak słówek do powtórki")
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = { viewModel.refreshQueue(); revealed = false }) { Text("Odśwież") }
                }
            } else {
                Column(
                    modifier = Modifier.fillMaxWidth().align(Alignment.Center).padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(text = current!!.term, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    if (revealed) {
                        Text(text = current!!.translation, style = MaterialTheme.typography.titleMedium)
                        if (!current!!.example.isNullOrEmpty()) {
                            Text(text = current!!.example ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(onClick = { revealed = true }) { Text("Pokaż") }
                        Button(onClick = { viewModel.answer(true); revealed = false }) { Text("Dobrze") }
                        Button(onClick = { viewModel.answer(false); revealed = false }, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) { Text("Źle") }
                    }
                }
            }
        }
    }
}