import React, { useRef } from 'react';

const ProgressBar = ({ progress, duration, maxDuration, markers, onSeek }) => {
  const barRef = useRef(null);

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Special formatter for the label above the limit marker (e.g., "2s")
  const formatLabelTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (Number.isInteger(seconds)) return `${seconds}s`;
    return `${seconds.toFixed(1)}s`;
  };

  const effectiveDuration = maxDuration || duration;
  
  const handleSeek = (e) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));
    const seekTime = Math.floor(percentage * effectiveDuration);
    const allowedTime = maxDuration ? Math.min(seekTime, duration) : seekTime;
    onSeek(allowedTime);
  };

  const limitPercent = maxDuration ? (duration / effectiveDuration) * 100 : 100;
  
  // Clamp progress to the limit if maxDuration is set
  const safeProgress = maxDuration ? Math.min(progress, duration) : progress;
  const percent = Math.min((safeProgress / effectiveDuration) * 100, 100);

  return (
    <div style={{ marginBottom: 35, position: 'relative' }}>
      {/* Top Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 5, fontWeight: 600, height: 20 }}>
        {/* Left side empty if using maxDuration, otherwise show progress */}
        <span>{maxDuration ? '' : formatTime(progress)}</span>
        <span>{formatTime(effectiveDuration)}</span>
      </div>

      {/* Floating Label for Progressive Mode */}
      {maxDuration && (
        <div 
          style={{
            position: 'absolute',
            left: `${limitPercent}%`,
            top: -5, // Adjust to sit above the bar
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
            pointerEvents: 'none', // Click through to bar
            transition: 'left 0.3s ease'
          }}
        >
           <div style={{ 
             backgroundColor: 'var(--color-background)', // Or card background
             padding: '2px 6px',
             borderRadius: 4,
             fontSize: '0.85rem',
             fontWeight: 'bold',
             color: 'var(--color-text-primary)',
             whiteSpace: 'nowrap',
             boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
           }}>
             {formatLabelTime(duration)}
           </div>
           <div style={{
             width: 0,
             height: 0,
             borderLeft: '5px solid transparent',
             borderRight: '5px solid transparent',
             borderTop: '6px solid var(--color-text-primary)', // Or match text color
             marginTop: 2
           }} />
        </div>
      )}
      
      <div 
        className="progress-container" 
        onClick={handleSeek}
        ref={barRef}
        style={{ position: 'relative', overflow: 'visible' }} // Visible to allow markers to extend if needed? No, labels are outside.
      >
        {/* Active Playable Area Background */}
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
                    backgroundColor: 'rgba(255,255,255,0.3)',
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
                    top: -2, // Extend slightly
                    bottom: -2,
                    width: 2,
                    backgroundColor: '#e74c3c',
                    zIndex: 2,
                    boxShadow: '0 0 8px rgba(231, 76, 60, 0.8)'
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