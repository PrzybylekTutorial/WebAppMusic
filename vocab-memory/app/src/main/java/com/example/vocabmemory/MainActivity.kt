package com.example.vocabmemory

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.vocabmemory.ui.screens.EditWordScreen
import com.example.vocabmemory.ui.screens.ImportExportScreen
import com.example.vocabmemory.ui.screens.LearnScreen
import com.example.vocabmemory.ui.screens.WordListScreen
import com.example.vocabmemory.ui.theme.VocabTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val settingsVm = hiltViewModel<com.example.vocabmemory.viewmodel.SettingsViewModel>()
            val theme by settingsVm.themeMode.collectAsState()
            VocabTheme(themeMode = theme) {
                Surface(color = MaterialTheme.colorScheme.background) {
                    VocabNavHost(settingsVm = settingsVm)
                }
            }
        }
    }
}

@Composable
fun VocabNavHost(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
    settingsVm: com.example.vocabmemory.viewmodel.SettingsViewModel
) {
    NavHost(navController = navController, startDestination = "list") {
        composable("list") {
            val vm = hiltViewModel<com.example.vocabmemory.viewmodel.WordsViewModel>()
            WordListScreen(
                viewModel = vm,
                onAddClick = { navController.navigate("edit/0") },
                onEditClick = { id -> navController.navigate("edit/$id") },
                onLearnClick = { navController.navigate("learn") },
                onImportExportClick = { navController.navigate("io") },
                onToggleTheme = { settingsVm.cycleTheme() }
            )
        }
        composable(
            route = "edit/{id}",
            arguments = listOf(navArgument("id") { type = NavType.LongType })
        ) { backStackEntry ->
            val vm = hiltViewModel<com.example.vocabmemory.viewmodel.WordsViewModel>()
            val id = backStackEntry.arguments?.getLong("id") ?: 0L
            EditWordScreen(
                viewModel = vm,
                wordId = id.takeIf { it != 0L },
                onBack = { navController.popBackStack() }
            )
        }
        composable("learn") {
            val vm = hiltViewModel<com.example.vocabmemory.viewmodel.LearnViewModel>()
            LearnScreen(
                viewModel = vm,
                onBack = { navController.popBackStack() }
            )
        }
        composable("io") {
            val vm = hiltViewModel<com.example.vocabmemory.viewmodel.ImportExportViewModel>()
            ImportExportScreen(
                viewModel = vm,
                onBack = { navController.popBackStack() }
            )
        }
    }
}