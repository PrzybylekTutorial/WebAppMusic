package com.example.vocabmemory.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.vocabmemory.viewmodel.ImportExportViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImportExportScreen(
    viewModel: ImportExportViewModel,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var lastMessage by remember { mutableStateOf("") }

    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                val count = viewModel.importFromCsv(uri)
                lastMessage = "Zaimportowano: $count"
            }
        }
    }

    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                val count = viewModel.exportToCsv(uri)
                lastMessage = "Wyeksportowano: $count"
            }
        }
    }

    Scaffold(
        topBar = {
            SmallTopAppBar(
                title = { Text("Import/Eksport") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null) } }
            )
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = {
                importLauncher.launch(arrayOf("text/*", "text/csv", "application/csv"))
            }, modifier = Modifier.fillMaxWidth()) { Text("Importuj CSV") }

            Button(onClick = {
                exportLauncher.launch("vocab.csv")
            }, modifier = Modifier.fillMaxWidth()) { Text("Eksportuj CSV") }

            if (lastMessage.isNotEmpty()) {
                Text(lastMessage)
            }
        }
    }
}