import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Clock } from 'lucide-react';

const GameControls = ({ 
  isPaused, 
  togglePlayPause, 
  restartMusic, 
  skipSong, 
  progress, 
  gameModeDuration, 
  gameMode,
  currentStepIndex,
  totalSteps,
  progressiveSteps
}) => {
  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSkipLabel = () => {
    if (gameMode === 'progressive' && progressiveSteps && currentStepIndex < totalSteps - 1) {
      const currentDuration = progressiveSteps[currentStepIndex];
      const nextDuration = progressiveSteps[currentStepIndex + 1];
      const diff = nextDuration - currentDuration;
      const diffDisplay = diff >= 1000 ? `${(diff / 1000).toFixed(1)}s` : `${diff}ms`;
      return (
        <>
          Reveal <span style={{ fontSize: '0.8em', opacity: 0.8 }}>(+{diffDisplay})</span>
        </>
      );
    }
    return 'Skip';
  };

  return (
    <div className="controls-container">
      {gameMode === 'progressive' && (
        <div className="time-tier-badge">
          <Clock size={14} style={{ marginRight: 5, display: 'inline', verticalAlign: 'middle' }} />
          Time Tier: {currentStepIndex + 1} / {totalSteps} ({formatTime(gameModeDuration)})
        </div>
      )}
      
      <div className="controls-row">
        <button 
          onClick={togglePlayPause} 
          className={`btn-control ${isPaused ? 'btn-control-play' : 'btn-control-pause'}`}
        >
          {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
          {progress >= gameModeDuration && gameMode !== 'endless' ? 'Play' : (isPaused ? 'Play' : 'Pause')}
        </button>

        <button 
          onClick={restartMusic} 
          className="btn-control btn-control-replay"
        >
          <RotateCcw size={20} />
          Replay
        </button>

        <button 
          onClick={skipSong} 
          className="btn-control btn-control-skip"
        >
          <SkipForward size={20} fill="currentColor" />
          {getSkipLabel()}
        </button>
      </div>
    </div>
  );
};

export default GameControls;
