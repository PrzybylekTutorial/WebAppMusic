package com.example.vocabmemory.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.example.vocabmemory.viewmodel.WordsViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditWordScreen(
    viewModel: WordsViewModel,
    wordId: Long?,
    onBack: () -> Unit
) {
    var term by remember { mutableStateOf(TextFieldValue("")) }
    var translation by remember { mutableStateOf(TextFieldValue("")) }
    var example by remember { mutableStateOf(TextFieldValue("")) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(wordId) {
        if (wordId != null) {
            val w = viewModel.getWord(wordId)
            if (w != null) {
                term = TextFieldValue(w.term)
                translation = TextFieldValue(w.translation)
                example = TextFieldValue(w.example.orEmpty())
            }
        }
    }

    Scaffold(
        topBar = {
            SmallTopAppBar(
                title = { Text(if (wordId == null) "Dodaj" else "Edytuj") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null) }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(value = term, onValueChange = { term = it }, label = { Text("Słowo") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = translation, onValueChange = { translation = it }, label = { Text("Tłumaczenie") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = example, onValueChange = { example = it }, label = { Text("Przykład (opcjonalnie)") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
            Spacer(Modifier.height(16.dp))
            Button(onClick = {
                viewModel.saveWord(id = wordId, term = term.text, translation = translation.text, example = example.text)
                onBack()
            }, enabled = term.text.isNotBlank() && translation.text.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                Text("Zapisz")
            }
        }
    }
}