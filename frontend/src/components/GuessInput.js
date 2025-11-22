import React, { useState } from 'react';

const GuessInput = ({ onGuess, userGuess, setUserGuess, suggestions, showSuggestions, setShowSuggestions, selectSuggestion, onGuessChange }) => {
  return (
    <div style={{ position: 'relative', width: '60%', margin: '0 auto' }}>
      <form onSubmit={onGuess} style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            value={userGuess}
            onChange={onGuessChange}
            placeholder="Enter song title..."
            style={{ 
              padding: '12px 20px',
              width: '100%',
              boxSizing: 'border-box',
              border: '2px solid #ddd',
              borderRadius: 25,
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#1DB954';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#ddd';
              // Delay hiding suggestions to allow clicking
              setTimeout(() => setShowSuggestions(false), 200);
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #e1e5e9',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto',
              marginTop: '5px',
              textAlign: 'left'
            }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderBottom: index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                    fontSize: '14px',
                    color: '#333',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <button 
          type="submit" 
          style={{ 
            padding: '12px 25px',
            marginLeft: 10,
            backgroundColor: '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: 25,
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap'
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
          🎯 Submit Guess
        </button>
      </form>
    </div>
  );
};

export default GuessInput;

