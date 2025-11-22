import React from 'react';
import { Trophy, Flame, Target, Hash, Star } from 'lucide-react';

const ScoreBoard = ({ score, totalGuesses, streak, bestStreak, highScore, playedCount, totalCount }) => {
  return (
    <div className="scoreboard-container">
      <div className="score-item">
        <div className="score-label"><Trophy size={14} style={{ display: 'inline', marginRight: 4 }} /> Score</div>
        <div className="score-value" style={{ color: 'var(--color-state-success)' }}>{score}</div>
      </div>
      
      <div className="score-item">
        <div className="score-label"><Flame size={14} style={{ display: 'inline', marginRight: 4 }} /> Streak</div>
        <div className="score-value" style={{ color: 'var(--color-state-active)' }}>{streak}</div>
      </div>

      <div className="score-item">
        <div className="score-label"><Star size={14} style={{ display: 'inline', marginRight: 4 }} /> Best Streak</div>
        <div className="score-value">{bestStreak}</div>
      </div>

      <div className="score-item">
        <div className="score-label"><Target size={14} style={{ display: 'inline', marginRight: 4 }} /> Accuracy</div>
        <div className="score-value">
          {totalGuesses > 0 ? Math.round((score / totalGuesses) * 100) : 0}%
        </div>
      </div>

      <div className="score-item">
        <div className="score-label"><Hash size={14} style={{ display: 'inline', marginRight: 4 }} /> Progress</div>
        <div className="score-value" style={{ fontSize: '1.2rem' }}>
          {playedCount} <span style={{ color: 'var(--color-text-disabled)', fontSize: '0.9rem' }}>/ {totalCount}</span>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;
