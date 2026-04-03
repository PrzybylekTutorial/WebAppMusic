import React, { useEffect } from 'react';
import { useHeardleGame } from './hooks/useHeardleGame';
import HeardleProgressBar from './components/HeardleProgressBar';
import HeardlePlayer from './components/HeardlePlayer';
import { ScoreBoard, GuessInput } from '@game';
import { HEARDLE_CONFIG, calculateScore } from './model/constants';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Music, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeardleGameProps {
  currentSong: any;
  onLoadNewSong: () => Promise<void>;
  onExit: () => void;
  trackUris: string[];
  allSongTitles: string[];
}

const HeardleGame: React.FC<HeardleGameProps> = ({
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
  } = useHeardleGame(currentSong, onLoadNewSong, trackUris.length, allSongTitles);

  // Initial load
  useEffect(() => {
    if (!currentSong) {
      actions.startGame();
    }
  }, [currentSong, actions]);

  const handleNextRound = async () => {
    await actions.startGame();
  };

  const isGameOver = phase === 'success' || phase === 'failed' || phase === 'revealed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-[900px] mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            onClick={onExit}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Exit
          </Button>
          
          <div className="flex items-center gap-2">
            <Music className="text-emerald-400" size={28} />
            <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              HEARDLE MODE
            </h1>
          </div>
          
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Stats */}
          <div className="lg:col-span-1 space-y-4">
            {/* Score Card */}
            <Card className="p-4 bg-slate-800/80 border-slate-700 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="text-amber-400" size={20} />
                <h3 className="font-bold text-white">Score</h3>
              </div>
              <div className="text-3xl font-black text-emerald-400 mb-2">
                {stats.score}
              </div>
              <div className="text-sm text-slate-400">
                High Score: <span className="text-amber-400 font-bold">{stats.highScore}</span>
              </div>
            </Card>

            {/* Streak Card */}
            <Card className="p-4 bg-slate-800/80 border-slate-700 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="text-yellow-400" size={20} />
                <h3 className="font-bold text-white">Streak</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-yellow-400">{stats.streak}</span>
                <span className="text-sm text-slate-500">current</span>
              </div>
              <div className="text-sm text-slate-400">
                Best: <span className="text-yellow-400 font-bold">{stats.bestStreak}</span>
              </div>
            </Card>

            {/* Round Info */}
            <Card className="p-4 bg-slate-800/80 border-slate-700 backdrop-blur-sm">
              <h3 className="font-bold text-white mb-3">Round Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Potential Points:</span>
                  <span className="font-bold text-emerald-400">
                    {calculateScore(roundState.currentSegmentIndex)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Segment:</span>
                  <span className="font-bold text-cyan-400">
                    {roundState.currentSegmentIndex + 1} / {HEARDLE_CONFIG.steps.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rounds Played:</span>
                  <span className="font-bold text-white">
                    {stats.roundsPlayed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Perfect Guesses:</span>
                  <span className="font-bold text-purple-400">
                    {stats.perfectGuesses}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Center/Right Column: Game Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Main Game Card */}
            <Card className="p-8 bg-slate-800/50 border-slate-700 backdrop-blur-md rounded-2xl">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-300">
                  Guess the song from the intro!
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Each skip reveals more of the song but costs points
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-8">
                <HeardleProgressBar
                  segments={roundState.segments}
                  currentSegmentIndex={roundState.currentSegmentIndex}
                  playbackPosition={roundState.playbackPosition}
                  isPlaying={roundState.isPlaying}
                  isPaused={roundState.isPaused}
                />
              </div>

              {/* Player Controls */}
              <HeardlePlayer
                segments={roundState.segments}
                currentSegmentIndex={roundState.currentSegmentIndex}
                isPlaying={roundState.isPlaying}
                isPaused={roundState.isPaused}
                isGameOver={isGameOver}
                onPlay={actions.playSnippet}
                onPause={actions.pauseSnippet}
                onResume={actions.resumeSnippet}
                onReplay={actions.replaySnippet}
                onSkip={actions.handleSkip}
                onGiveUp={actions.giveUp}
              />

              {/* Guess Input */}
              <div className="mt-8">
                <GuessInput
                  userGuess={roundState.userGuess}
                  setUserGuess={(val) => actions.setRoundState(prev => ({ ...prev, userGuess: val }))}
                  onGuess={(e) => {
                    e.preventDefault();
                    if (roundState.userGuess.trim() && !isGameOver) {
                      actions.submitGuess(roundState.userGuess);
                    }
                  }}
                  suggestions={roundState.suggestions}
                  showSuggestions={roundState.suggestions.length > 0}
                  setShowSuggestions={(show) => {
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

              {/* Guess History */}
              {roundState.guessHistory.length > 0 && !isGameOver && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {roundState.guessHistory.map((attempt, index) => (
                    <span
                      key={index}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        attempt.correct
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30 line-through"
                      )}
                    >
                      {attempt.guess}
                    </span>
                  ))}
                </div>
              )}

              {/* Wrong Guess Feedback (inline) */}
              {roundState.guessResult && !roundState.guessResult.correct && !isGameOver && (
                <div className="mt-4 text-center">
                  <span className="text-red-400 font-medium animate-pulse">
                    Wrong! Try again or skip for more time...
                  </span>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Result Modal Overlay */}
        {isGameOver && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className={cn(
              "max-w-md w-full p-8 text-center border-2",
              phase === 'success' 
                ? "bg-gradient-to-br from-emerald-900/90 to-slate-900/90 border-emerald-500/50" 
                : "bg-gradient-to-br from-red-900/90 to-slate-900/90 border-red-500/50"
            )}>
              {/* Result Icon */}
              <div className={cn(
                "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl",
                phase === 'success' ? "bg-emerald-500/20" : "bg-red-500/20"
              )}>
                {phase === 'success' ? '🎉' : '😢'}
              </div>

              {/* Result Title */}
              <h2 className={cn(
                "text-2xl font-black mb-2",
                phase === 'success' ? "text-emerald-400" : "text-red-400"
              )}>
                {phase === 'success' ? 'Correct!' : phase === 'revealed' ? 'Gave Up' : 'Out of Tries!'}
              </h2>

              {/* Song Info */}
              {roundState.guessResult && (
                <div className="mb-6">
                  <p className="text-white text-lg font-bold">
                    {roundState.guessResult.actualTitle}
                  </p>
                  <p className="text-slate-400">
                    by {roundState.guessResult.actualArtist}
                  </p>
                  {phase === 'success' && roundState.guessResult.segmentGuessedAt !== undefined && (
                    <p className="mt-2 text-emerald-400 text-sm">
                      Guessed on segment {roundState.guessResult.segmentGuessedAt + 1} — 
                      <span className="font-bold"> +{calculateScore(roundState.guessResult.segmentGuessedAt)} points!</span>
                    </p>
                  )}
                </div>
              )}

              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-slate-400">Total Score</div>
                  <div className="text-xl font-bold text-white">{stats.score}</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-slate-400">Streak</div>
                  <div className="text-xl font-bold text-yellow-400">{stats.streak}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleNextRound}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold px-6"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Next Song
                </Button>
                <Button
                  variant="outline"
                  onClick={onExit}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Exit
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeardleGame;

