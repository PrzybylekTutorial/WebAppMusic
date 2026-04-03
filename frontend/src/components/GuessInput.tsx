import React from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface GuessInputProps {
  onGuess: (e: React.FormEvent) => void;
  userGuess: string;
  setUserGuess: (guess: string) => void;
  suggestions: string[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  selectSuggestion: (suggestion: string) => void;
  onGuessChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const GuessInput: React.FC<GuessInputProps> = ({ 
  onGuess, 
  userGuess, 
  setUserGuess, 
  suggestions, 
  showSuggestions, 
  setShowSuggestions, 
  selectSuggestion, 
  onGuessChange 
}) => {
  return (
    <div className="relative max-w-[500px] mx-auto w-full">
      <form onSubmit={onGuess} className="flex gap-2.5 w-full items-stretch flex-col md:flex-row">
        <div className="relative flex-1 min-w-0">
          <Input
            type="text"
            value={userGuess}
            onChange={onGuessChange}
            placeholder="What song is this?"
            className="w-full text-lg h-[50px] bg-white border-2 border-transparent shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--color-accent-lavender)] focus-visible:border-transparent transition-all"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay hiding to allow click
              setTimeout(() => setShowSuggestions(false), 200);
            }}
          />
          
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute top-[110%] left-0 right-0 bg-white/95 backdrop-blur-[10px] rounded-[20px] shadow-lg list-none py-2.5 m-0 z-50 max-h-[300px] overflow-y-auto border border-white/50">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="px-6 py-3 cursor-pointer transition-colors text-base text-[var(--color-text-primary)] hover:bg-[var(--color-accent-lime)]"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <Button 
          type="submit" 
          variant="mint"
          className="h-[50px] px-6"
        >
          <Check size={20} />
        </Button>
      </form>
    </div>
  );
};

export default GuessInput;
