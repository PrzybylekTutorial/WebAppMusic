import React from 'react';
import { Check } from 'lucide-react';

const GuessInput = ({ onGuess, userGuess, setUserGuess, suggestions, showSuggestions, setShowSuggestions, selectSuggestion, onGuessChange }) => {
  return (
    <div className="guess-input-wrapper">
      <form onSubmit={onGuess} className="guess-form">
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            value={userGuess}
            onChange={onGuessChange}
            placeholder="What song is this?"
            className="guess-input"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay hiding to allow click
              setTimeout(() => setShowSuggestions(false), 200);
            }}
          />
          
          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="suggestion-item"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <button type="submit" className="guess-submit-btn">
          <Check size={20} />
        </button>
      </form>
    </div>
  );
};

export default GuessInput;
