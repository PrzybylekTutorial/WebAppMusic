import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GameModeSelectorProps {
  gameMode: string;
  setGameMode: (mode: string) => void;
  duration: number;
  setGameModeDuration: (duration: number) => void;
  disabled: boolean;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({ gameMode, setGameMode, duration, setGameModeDuration, disabled }) => {
  return (
    <div className={cn("mb-8 transition-opacity duration-300", disabled && "opacity-60")}>
      <h3 className="text-center mb-5 text-[var(--color-text-primary)] font-[var(--font-headers)] text-xl font-bold">
        🎮 Select Game Mode {disabled && <span className="text-sm font-normal">(Locked during game)</span>}
      </h3>
      <div className="flex justify-center gap-4 flex-wrap">
        {[
          { mode: 'normal', label: 'Normal Mode', time: '30s', colorClass: 'bg-green-500 hover:bg-green-600' },
          { mode: 'timeAttack', label: 'Time Attack', time: '15s', colorClass: 'bg-red-500 hover:bg-red-600' },
          { mode: 'endless', label: 'Endless Mode', time: 'Full Song', colorClass: 'bg-blue-500 hover:bg-blue-600' },
          { mode: 'progressive', label: 'Songless Mode', time: 'Progressive', colorClass: 'bg-purple-500 hover:bg-purple-600' },
          { mode: 'heardle', label: 'Heardle Mode', time: 'Segments', colorClass: 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400' }
        ].map(({ mode: m, label, time, colorClass }) => (
          <Button 
            key={m}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setGameMode(m);
              if (m === 'normal') setGameModeDuration(30000);
              else if (m === 'timeAttack') setGameModeDuration(15000);
              else if (m === 'progressive') setGameModeDuration(100);
              else if (m === 'heardle') setGameModeDuration(100);
              else setGameModeDuration(duration);
            }} 
            className={cn(
              "rounded-full font-bold shadow-md transition-all px-5 py-3 h-auto text-white",
              gameMode === m ? colorClass : "bg-gray-500 hover:bg-gray-600",
              disabled && "cursor-not-allowed"
            )}
          >
            {label} ({time})
          </Button>
        ))}
      </div>
    </div>
  );
};

export default GameModeSelector;
