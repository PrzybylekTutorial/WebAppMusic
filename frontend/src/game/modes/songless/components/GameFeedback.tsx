import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameFeedbackProps {
  guessResult: {
    correct: boolean;
    actualTitle?: string;
    actualArtist?: string;
  } | null;
  onNextRound: () => void;
}

const GameFeedback: React.FC<GameFeedbackProps> = ({ guessResult, onNextRound }) => {
  if (!guessResult) return null;

  const { correct, actualTitle, actualArtist } = guessResult;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
    )}>
      <div className={cn(
        "max-w-md w-full p-8 rounded-3xl shadow-2xl transform transition-all scale-100",
        correct ? "bg-gradient-to-b from-green-50 to-white border-4 border-green-200" : "bg-gradient-to-b from-red-50 to-white border-4 border-red-200"
      )}>
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            {correct ? (
              <CheckCircle2 className="w-20 h-20 text-green-500 drop-shadow-lg" />
            ) : (
              <XCircle className="w-20 h-20 text-red-500 drop-shadow-lg" />
            )}
          </div>
          
          <h2 className={cn(
            "text-3xl font-black mb-2",
            correct ? "text-green-600" : "text-red-600"
          )}>
            {correct ? 'BRILLIANT!' : 'ROUND OVER'}
          </h2>
          
          <p className="text-gray-500 font-medium mb-6">
            {correct ? 'You nailed that snippet!' : 'Better luck next time!'}
          </p>
          
          <div className="bg-white/80 rounded-xl p-4 mb-8 border border-gray-100 shadow-inner">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">The song was</p>
            <div className="flex items-center justify-center gap-3 mb-1">
              <Music size={18} className="text-[var(--color-primary-purple)]" />
              <h3 className="text-xl font-bold text-gray-800 line-clamp-1">{actualTitle}</h3>
            </div>
            <p className="text-md text-gray-600 font-medium">{actualArtist}</p>
          </div>
          
          <Button 
            onClick={onNextRound} 
            size="lg" 
            className={cn(
              "w-full rounded-full font-bold text-lg h-14 shadow-lg transition-transform hover:scale-105",
              correct ? "bg-green-500 hover:bg-green-600" : "bg-[var(--color-primary-purple)] hover:bg-purple-700"
            )}
          >
            Next Song
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameFeedback;


