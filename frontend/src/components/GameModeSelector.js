import React from 'react';

const GameModeSelector = ({ gameMode, setGameMode, duration, setGameModeDuration }) => {
  return (
    <div style={{ marginBottom: 30 }}>
      <h3 style={{ textAlign: 'center', marginBottom: 20, color: '#333' }}>
        🎮 Select Game Mode
      </h3>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap' }}>
        {[
          { mode: 'normal', label: 'Normal Mode', time: '30s', color: '#28a745' },
          { mode: 'timeAttack', label: 'Time Attack', time: '15s', color: '#dc3545' },
          { mode: 'endless', label: 'Endless Mode', time: 'Full Song', color: '#007bff' },
          { mode: 'progressive', label: 'Songless Mode', time: 'Progressive', color: '#9b59b6' }
        ].map(({ mode: m, label, time, color }) => (
          <button 
            key={m}
            onClick={() => {
              setGameMode(m);
              if (m === 'normal') setGameModeDuration(30000);
              else if (m === 'timeAttack') setGameModeDuration(15000);
              else if (m === 'progressive') setGameModeDuration(100);
              else setGameModeDuration(duration);
            }} 
            style={{ 
              padding: '12px 20px',
              backgroundColor: gameMode === m ? color : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 25,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
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

