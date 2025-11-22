import React from 'react';

const GameControls = ({ isPaused, togglePlayPause, restartMusic, skipSong, progress, gameModeDuration, gameMode }) => {
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 15 }}>
      <button 
        onClick={togglePlayPause} 
        style={{ 
          padding: '10px 20px',
          backgroundColor: isPaused ? '#28a745' : '#dc3545', 
          color: 'white', 
          border: 'none', 
          borderRadius: 25,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontWeight: 'bold'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
        }}
      >
        {progress >= gameModeDuration && gameMode !== 'endless' ? '▶️ Play' : (isPaused ? '▶️ Play' : '⏸️ Pause')}
      </button>
      <button 
        onClick={restartMusic} 
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: 25,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontWeight: 'bold'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
        }}
      >
        🔄 Replay
      </button>
      <button 
        onClick={skipSong} 
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#ffc107', 
          color: 'black', 
          border: 'none', 
          borderRadius: 25,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontWeight: 'bold'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
        }}
      >
        ⏭️ Skip
      </button>
    </div>
  );
};

export default GameControls;

