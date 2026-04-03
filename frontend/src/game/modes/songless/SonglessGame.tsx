import React, { useEffect } from 'react';
import { useSonglessGame } from './hooks/useSonglessGame';
import SnippetPlayer from './components/SnippetPlayer';
import SkipControls from './components/SkipControls';
import GameFeedback from './components/GameFeedback';
import { ScoreBoard, GuessInput } from '@game';
import { SONGLESS_CONFIG } from './model/constants';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SonglessGameProps {
  currentSong: any;
  onLoadNewSong: () => Promise<void>;
  onExit: () => void;
  trackUris: string[];
  allSongTitles: string[];
}

const SonglessGame: React.FC<SonglessGameProps> = ({
  currentSong,
  onLoadNewSong,
  onExit,
  trackUris,
  allSongTitles
}) => {
  const {
    phase,
    stats,
    roundState,
    actions
  } = useSonglessGame(currentSong, onLoadNewSong, trackUris.length, allSongTitles);

  // Initial load
  useEffect(() => {
    if (!currentSong) {
      actions.startGame();
    }
  }, [currentSong, actions]);

  const handleNextRound = async () => {
    await actions.startGame(); // Re-rolls song
  };

  return (
    <div className="max-w-[900px] mx-auto my-10 p-4 font-sans relative">
      <Button 
        variant="ghost" 
        className="absolute top-0 left-0 mb-4 text-gray-500 hover:text-gray-900"
        onClick={onExit}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Exit
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {/* Left Column: Stats */}
        <div className="md:col-span-1 space-y-4">
          <ScoreBoard 
            score={stats.score}
            streak={stats.streak}
            highScore={stats.highScore}
            totalGuesses={stats.roundsPlayed}
            playedCount={stats.roundsPlayed}
            totalCount={trackUris.length}
            bestStreak={stats.bestStreak}
          />
          
          <Card className="p-4 bg-purple-50 border-purple-100">
            <h3 className="font-bold text-purple-900 mb-2">Round Info</h3>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-purple-700">Potential Points:</span>
              <span className="font-bold text-purple-900">
                {Math.max(0, SONGLESS_CONFIG.initialScore - (roundState.currentStepIndex * SONGLESS_CONFIG.skipPenalty))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-purple-700">Skips Used:</span>
              <span className="font-bold text-purple-900">
                {roundState.currentStepIndex} / {SONGLESS_CONFIG.maxSkips}
              </span>
            </div>
          </Card>
        </div>

        {/* Center Column: Game Area */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-8 bg-white/80 backdrop-blur-md shadow-xl border-white/50 rounded-3xl">
             <div className="text-center mb-6">
               <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                 GUESS THE SONG
               </h2>
               <p className="text-gray-500">Listen to the snippet and guess!</p>
             </div>

             <SnippetPlayer 
               isPlaying={roundState.isSnippetPlaying}
               duration={roundState.currentDuration}
               maxDuration={SONGLESS_CONFIG.steps[SONGLESS_CONFIG.steps.length - 1]}
               onPlay={actions.playSnippet}
               onStop={actions.stopSnippet}
               disabled={phase === 'success' || phase === 'failed' || phase === 'revealed'}
             />

             <SkipControls 
               onSkip={actions.handleSkip}
               onGiveUp={actions.giveUp}
               skipsUsed={roundState.currentStepIndex}
               maxSkips={SONGLESS_CONFIG.maxSkips}
               skipPenalty={SONGLESS_CONFIG.skipPenalty}
               disabled={phase === 'success' || phase === 'failed' || phase === 'revealed' || roundState.isSnippetPlaying}
             />

             <div className="mt-8">
               <GuessInput 
                 userGuess={roundState.userGuess}
                 setUserGuess={(val) => actions.setRoundState(prev => ({ ...prev, userGuess: val }))}
                 onGuess={(e) => {
                   e.preventDefault();
                   if (roundState.userGuess.trim()) {
                      actions.submitGuess(roundState.userGuess);
                   }
                 }}
                 suggestions={roundState.suggestions}
                 showSuggestions={roundState.suggestions.length > 0}
                 setShowSuggestions={(show) => {
                    // Only hide if show is false, we don't want to force show if suggestions are empty
                    if (!show) {
                        actions.setRoundState(prev => ({ ...prev, suggestions: [] })); 
                    }
                 }}
                 selectSuggestion={(val) => {
                   actions.setRoundState(prev => ({ ...prev, userGuess: val, suggestions: [] }));
                   actions.submitGuess(val);
                 }}
                 onGuessChange={actions.handleInputChange}
               />
             </div>
          </Card>
        </div>
      </div>

      {/* Result Modal */}
      {(phase === 'success' || phase === 'failed' || phase === 'revealed') && (
        <GameFeedback 
          guessResult={roundState.guessResult}
          onNextRound={handleNextRound}
        />
      )}
    </div>
  );
};

export default SonglessGame;

