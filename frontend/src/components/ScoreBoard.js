import React from 'react';

const ScoreBoard = ({ score, totalGuesses, streak, bestStreak, highScore, playedCount, totalCount }) => {
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #C7CEEA 0%, #FFDAC1 100%)',
      padding: 20,
      borderRadius: 15,
      marginBottom: 30,
      boxShadow: '0 8px 16px rgba(0,0,0,0.05)'
    }}>
      <h3 style={{ textAlign: 'center', margin: '0 0 15px 0', color: '#555555' }}>
        🏆 Game Statistics
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15 }}>
        <div style={{ textAlign: 'center', color: '#555555' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{score}/{totalGuesses}</div>
          <div style={{ fontSize: '0.9rem' }}>Score</div>
        </div>
        <div style={{ textAlign: 'center', color: '#555555' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {totalGuesses > 0 ? Math.round((score/totalGuesses)*100) : 0}%
          </div>
          <div style={{ fontSize: '0.9rem' }}>Accuracy</div>
        </div>
        <div style={{ textAlign: 'center', color: '#555555' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{streak}</div>
          <div style={{ fontSize: '0.9rem' }}>Current Streak</div>
        </div>
        <div style={{ textAlign: 'center', color: '#555555' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{bestStreak}</div>
          <div style={{ fontSize: '0.9rem' }}>Best Streak</div>
        </div>
        <div style={{ textAlign: 'center', color: '#555555' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{highScore}</div>
          <div style={{ fontSize: '0.9rem' }}>High Score</div>
        </div>
        <div style={{ textAlign: 'center', color: '#555555' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{playedCount}/{totalCount}</div>
          <div style={{ fontSize: '0.9rem' }}>Songs Played</div>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;

