import React from 'react';

const ResultDisplay = ({ result, onPlayAgain }) => {
  if (!result) return null;

  return (
    <div style={{ 
      marginTop: 20, 
      padding: 20, 
      borderRadius: 15, 
      backgroundColor: result.correct ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
      border: `2px solid ${result.correct ? '#28a745' : '#dc3545'}`,
      textAlign: 'center'
    }}>
      {result.correct ? (
        <div style={{ color: '#28a745' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>🎉</div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
            Correct! The song is "{result.actualTitle}"
          </p>
        </div>
      ) : (
        <div style={{ color: '#dc3545' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>❌</div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
            Incorrect. The song is "{result.actualTitle}"
          </p>
        </div>
      )}
      
      <button 
        onClick={onPlayAgain} 
        style={{ 
          padding: '12px 25px',
          backgroundColor: '#1DB954',
          color: 'white',
          border: 'none',
          borderRadius: 25,
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold',
          marginTop: 15,
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-1px)';
          e.target.style.boxShadow = '0 4px 8px rgba(29, 185, 84, 0.3)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }}
      >
         Play Another Song
      </button>
    </div>
  );
};

export default ResultDisplay;

