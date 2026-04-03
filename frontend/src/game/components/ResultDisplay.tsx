import React from 'react';
import { PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResultDisplayProps {
  result: {
    correct: boolean;
    actualTitle: string;
  } | null;
  onPlayAgain: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, onPlayAgain }) => {
  if (!result) return null;

  const isCorrect = result.correct;

  return (
    <div className={cn(
      "backdrop-blur-[10px] rounded-[30px] p-8 text-center my-8 border animate-in slide-in-from-bottom-5 fade-in duration-300",
      isCorrect 
        ? "border-[var(--color-state-success)] bg-gradient-to-br from-[rgba(181,234,215,0.2)] to-[rgba(255,255,255,0.8)]" 
        : "border-[var(--color-state-error)] bg-gradient-to-br from-[rgba(255,154,162,0.1)] to-[rgba(255,255,255,0.8)]"
    )}>
      {isCorrect ? (
        <div>
          <div className="mb-4 flex justify-center">
            <CheckCircle size={50} className="text-[var(--color-state-success)]" />
          </div>
          <h2 className="text-2xl font-bold mb-2">🎉 Correct!</h2>
          <p className="text-lg m-0">
            The song is <strong>"{result.actualTitle}"</strong>
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex justify-center">
            <XCircle size={50} className="text-[var(--color-state-error)]" />
          </div>
          <h2 className="text-2xl font-bold mb-2">❌ Incorrect</h2>
           <p className="text-lg m-0">
            The song was <strong>"{result.actualTitle}"</strong>
          </p>
        </div>
      )}
      
      <Button 
        onClick={onPlayAgain} 
        variant="lavender"
        className="mt-6"
      >
         <PlayCircle size={20} className="mr-2" /> Play Another Song
      </Button>
    </div>
  );
};

export default ResultDisplay;
