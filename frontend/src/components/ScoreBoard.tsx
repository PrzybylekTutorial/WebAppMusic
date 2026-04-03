import React from 'react';
import { Trophy, Flame, Target, Hash, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ScoreBoardProps {
  score: number;
  totalGuesses: number;
  streak: number;
  bestStreak: number;
  highScore: number;
  playedCount: number;
  totalCount: number;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, totalGuesses, streak, bestStreak, highScore, playedCount, totalCount }) => {
  return (
    <div className="flex justify-center gap-5 flex-wrap mt-10">
      <Card className="bg-white/60 shadow-sm border-none min-w-[100px] hover:-translate-y-1 transition-transform">
        <CardContent className="p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
            <Trophy size={14} /> Score
          </div>
          <div className="text-2xl font-extrabold text-[var(--color-state-success)]">{score}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white/60 shadow-sm border-none min-w-[100px] hover:-translate-y-1 transition-transform">
        <CardContent className="p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
            <Flame size={14} /> Streak
          </div>
          <div className="text-2xl font-extrabold text-[var(--color-state-active)]">{streak}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 shadow-sm border-none min-w-[100px] hover:-translate-y-1 transition-transform">
        <CardContent className="p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
            <Star size={14} /> Best Streak
          </div>
          <div className="text-2xl font-extrabold text-gray-700">{bestStreak}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 shadow-sm border-none min-w-[100px] hover:-translate-y-1 transition-transform">
        <CardContent className="p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
            <Target size={14} /> Accuracy
          </div>
          <div className="text-2xl font-extrabold text-gray-700">
            {totalGuesses > 0 ? Math.round((score / totalGuesses) * 100) : 0}%
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 shadow-sm border-none min-w-[100px] hover:-translate-y-1 transition-transform">
        <CardContent className="p-4 flex flex-col items-center">
          <div className="text-sm text-gray-500 font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
            <Hash size={14} /> Progress
          </div>
          <div className="text-xl font-extrabold text-gray-700 mt-1">
            {playedCount} <span className="text-gray-400 text-sm font-normal">/ {totalCount}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoreBoard;
