import React from 'react';

const GameModeSelector = ({ gameMode, setGameMode, duration, setGameModeDuration, disabled }) => {
  return (
    <div className="game-mode-selector" style={{ opacity: disabled ? 0.6 : 1 }}>
      <h3 className="section-title-center">
        🎮 Select Game Mode {disabled && <span className="status-text-small">(Locked during game)</span>}
      </h3>
      <div className="mode-buttons-container">
        {[
          { mode: 'normal', label: 'Normal Mode', time: '30s', color: '#28a745' },
          { mode: 'timeAttack', label: 'Time Attack', time: '15s', color: '#dc3545' },
          { mode: 'endless', label: 'Endless Mode', time: 'Full Song', color: '#007bff' },
          { mode: 'progressive', label: 'Songless Mode', time: 'Progressive', color: '#9b59b6' }
        ].map(({ mode: m, label, time, color }) => (
          <button 
            key={m}
            disabled={disabled}
            className="mode-button"
            onClick={() => {
              if (disabled) return;
              setGameMode(m);
              if (m === 'normal') setGameModeDuration(30000);
              else if (m === 'timeAttack') setGameModeDuration(15000);
              else if (m === 'progressive') setGameModeDuration(100);
              else setGameModeDuration(duration);
            }} 
            style={{ 
              backgroundColor: gameMode === m ? color : '#6c757d',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {label} ({time})
          </button>
        ))}
      </div>
    </div>
  );
};

export default GameModeSelector;

