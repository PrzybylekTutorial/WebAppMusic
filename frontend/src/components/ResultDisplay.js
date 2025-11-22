import React from 'react';
import { PlayCircle, CheckCircle, XCircle } from 'lucide-react';

const ResultDisplay = ({ result, onPlayAgain }) => {
  if (!result) return null;

  const isCorrect = result.correct;

  return (
    <div className={`result-card ${isCorrect ? 'result-correct' : 'result-incorrect'}`}>
      {isCorrect ? (
        <div>
          <div style={{ marginBottom: 15 }}>
            <CheckCircle size={50} color="var(--color-state-success)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 10px 0' }}>🎉 Correct!</h2>
          <p style={{ fontSize: '1.1rem', margin: 0 }}>
            The song is <strong>"{result.actualTitle}"</strong>
          </p>
        </div>
      ) : (
        <div>
           <div style={{ marginBottom: 15 }}>
            <XCircle size={50} color="var(--color-state-error)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 10px 0' }}>❌ Incorrect</h2>
           <p style={{ fontSize: '1.1rem', margin: 0 }}>
            The song was <strong>"{result.actualTitle}"</strong>
          </p>
        </div>
      )}
      
      <button 
        onClick={onPlayAgain} 
        className="btn-primary"
        style={{ marginTop: 20, backgroundColor: 'var(--color-accent-lavender)' }}
      >
         <PlayCircle size={20} /> Play Another Song
      </button>
    </div>
  );
};

export default ResultDisplay;
