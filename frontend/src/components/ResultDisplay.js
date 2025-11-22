import React from 'react';

const ResultDisplay = ({ result, onPlayAgain }) => {
  if (!result) return null;

  return (
    <div style={{ 
      marginTop: 20, 
      padding: 20, 
      borderRadius: 15, 
      backgroundColor: result.correct ? '#E2F0CB' : '#FFDEE9',
      border: `2px solid ${result.correct ? '#B5EAD7' : '#FF9AA2'}`,
      textAlign: 'center'
    }}>
      {result.correct ? (
        <div style={{ color: '#555555' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>🎉</div>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
            Correct! The song is "{result.actualTitle}"
          </p>
        </div>
      ) : (
        <div style={{ color: '#555555' }}>
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
          backgroundColor: '#C7CEEA',
          color: '#555555',
          border: 'none',
          borderRadius: 25,
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold',
          marginTop: 15,
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
        }}
      >
         Play Another Song
      </button>
    </div>
  );
};

export default ResultDisplay;

