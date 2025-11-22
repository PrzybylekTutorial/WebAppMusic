import React from 'react';

const ProgressBar = ({ progress, duration, onSeek }) => {
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: '12px', color: '#666', minWidth: '35px' }}>
        {formatTime(Math.min(progress, duration))}
      </span>
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          type="range"
          min="0"
          max={duration}
          value={Math.min(progress, duration)}
          onChange={(e) => {
             // Just for visual update during drag, parent handles state
          }}
          onMouseUp={(e) => {
            onSeek(parseInt(e.target.value));
          }}
          onTouchEnd={(e) => {
            onSeek(parseInt(e.target.value));
          }}
          style={{ 
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: `linear-gradient(to right, #1db954 0%, #1db954 ${(Math.min(progress, duration) / duration) * 100}%, #e9ecef ${(Math.min(progress, duration) / duration) * 100}%, #e9ecef 100%)`,
            outline: 'none',
            cursor: 'pointer'
          }}
        />
      </div>
      <span style={{ fontSize: '12px', color: '#666', minWidth: '35px' }}>
        {formatTime(duration)}
      </span>
    </div>
  );
};

export default ProgressBar;

