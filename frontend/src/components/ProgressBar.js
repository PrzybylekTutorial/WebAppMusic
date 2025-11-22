import React, { useRef } from 'react';

const ProgressBar = ({ progress, duration, onSeek }) => {
  const barRef = useRef(null);

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));
    const seekTime = Math.floor(percentage * duration);
    onSeek(seekTime);
  };

  const percent = Math.min((progress / duration) * 100, 100);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 5, fontWeight: 600 }}>
        <span>{formatTime(Math.min(progress, duration))}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      <div 
        className="progress-container" 
        onClick={handleSeek}
        ref={barRef}
      >
        <div 
          className="progress-fill" 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
