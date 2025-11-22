import React, { useRef } from 'react';

const ProgressBar = ({ progress, duration, maxDuration, markers, onSeek }) => {
  const barRef = useRef(null);

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    // Show decimal for small seconds if needed, but standard format is fine
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = maxDuration || duration;
  
  const handleSeek = (e) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));
    const seekTime = Math.floor(percentage * effectiveDuration);
    
    // In progressive mode, you might want to limit seeking to the current unlocked duration
    // But for now let's allow seeking anywhere or limit it? 
    // Usually in these games you can replay what you have unlocked.
    // So if duration is the limit, we should clamp seekTime.
    
    const allowedTime = maxDuration ? Math.min(seekTime, duration) : seekTime;
    onSeek(allowedTime);
  };

  const percent = Math.min((progress / effectiveDuration) * 100, 100);
  const limitPercent = maxDuration ? (duration / effectiveDuration) * 100 : 100;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 5, fontWeight: 600 }}>
        {/* Show progress relative to current limit or just absolute time? */}
        <span>{formatTime(progress)}</span>
        <span>{formatTime(effectiveDuration)}</span>
      </div>
      
      <div 
        className="progress-container" 
        onClick={handleSeek}
        ref={barRef}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Active Playable Area Background (optional, but helps see what is unlocked) */}
        {maxDuration && (
           <div 
             style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${limitPercent}%`,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                zIndex: 0
             }}
           />
        )}

        {/* Markers */}
        {markers && markers.map((marker, index) => (
            <div 
                key={index}
                style={{
                    position: 'absolute',
                    left: `${(marker / effectiveDuration) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    zIndex: 1
                }}
            />
        ))}

        {/* Current Limit Marker */}
        {maxDuration && (
            <div 
                style={{
                    position: 'absolute',
                    left: `${limitPercent}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: '#e74c3c',
                    zIndex: 2,
                    boxShadow: '0 0 5px rgba(231, 76, 60, 0.8)'
                }}
            />
        )}

        <div 
          className="progress-fill" 
          style={{ width: `${percent}%`, zIndex: 3 }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;