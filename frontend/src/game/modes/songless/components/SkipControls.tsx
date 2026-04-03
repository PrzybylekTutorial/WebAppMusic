import React from 'react';
import { Button } from '@/components/ui/button';
import { FastForward, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkipControlsProps {
  onSkip: () => void;
  onGiveUp: () => void;
  skipsUsed: number;
  maxSkips: number;
  skipPenalty: number;
  disabled?: boolean;
}

const SkipControls: React.FC<SkipControlsProps> = ({
  onSkip,
  onGiveUp,
  skipsUsed,
  maxSkips,
  skipPenalty,
  disabled
}) => {
  const remainingSkips = maxSkips - skipsUsed;
  const isLastSkip = remainingSkips === 0;

  return (
    <div className="flex justify-center gap-4 mt-6">
      <Button
        variant="outline"
        onClick={onSkip}
        disabled={disabled || isLastSkip}
        className={cn(
          "flex-1 max-w-[200px] border-2 font-bold",
          isLastSkip ? "opacity-50" : "hover:border-yellow-400 hover:text-yellow-600"
        )}
      >
        <FastForward className="mr-2 h-4 w-4" />
        {isLastSkip ? 'Max Skips Reached' : `Add +Time (-${skipPenalty} pts)`}
      </Button>
      
      <Button
        variant="ghost"
        onClick={onGiveUp}
        disabled={disabled}
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Flag className="mr-2 h-4 w-4" />
        Give Up
      </Button>
    </div>
  );
};

export default SkipControls;


