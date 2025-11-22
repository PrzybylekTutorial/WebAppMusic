import React from 'react';

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
      return `⏭️ Reveal (+${diffDisplay})`;
    }
    return '⏭️ Skip';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 15 }}>
      {gameMode === 'progressive' && (
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 5 }}>
          Time Tier: {currentStepIndex + 1} / {totalSteps} ({formatTime(gameModeDuration)}s)
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      <button 
        onClick={togglePlayPause} 
        style={{ 
          padding: '10px 20px',
          backgroundColor: isPaused ? '#B5EAD7' : '#FF9AA2', 
          color: '#555555', 
          border: 'none', 
          borderRadius: 25,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontWeight: 'bold',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
        }}
      >
        {progress >= gameModeDuration && gameMode !== 'endless' ? '▶️ Play' : (isPaused ? '▶️ Play' : '⏸️ Pause')}
      </button>
      <button 
        onClick={restartMusic} 
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#C7CEEA', 
          color: '#555555', 
          border: 'none', 
          borderRadius: 25,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontWeight: 'bold',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
        }}
      >
        🔄 Replay
      </button>
      <button 
        onClick={skipSong} 
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#FFDAC1', 
          color: '#555555', 
          border: 'none', 
          borderRadius: 25,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontWeight: 'bold',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
        }}
      >
        {getSkipLabel()}
      </button>
    </div>
    </div>
  );
};

export default GameControls;

