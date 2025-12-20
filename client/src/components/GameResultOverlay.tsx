import React from 'react';
import { Button } from './ui/button';
import { Trophy, Scale, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameResultOverlayProps {
  status: 'ongoing' | 'completed' | 'draw' | 'paused';
  winnerId: string | null;
  whitePlayerId?: string;
  blackPlayerId?: string;
  whitePlayerName?: string;
  blackPlayerName?: string;
  reason?: string | null;
  onNewMatch: () => void;
}

export const GameResultOverlay: React.FC<GameResultOverlayProps> = ({
  status,
  winnerId,
  whitePlayerId,
  whitePlayerName,
  blackPlayerName,
  reason,
  onNewMatch
}) => {
  const isGameOver = status === 'completed' || status === 'draw';
  if (!isGameOver) return null;

  const isWhiteWinner = winnerId === whitePlayerId;
  const resultText = status === 'completed' 
    ? (isWhiteWinner ? '1-0' : '0-1') 
    : '½-½';
  
  const winnerName = status === 'completed' 
    ? (isWhiteWinner ? whitePlayerName : blackPlayerName)
    : null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-sm"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-card border-2 border-primary/20 p-8 rounded-xl shadow-2xl max-w-sm w-full text-center space-y-6"
        >
          <div className="flex justify-center">
            {status === 'completed' ? (
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Trophy className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                <Scale className="w-8 h-8" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic">
              {status === 'completed' ? 'Game Over' : 'Draw'}
            </h2>
            <div className="text-4xl font-mono font-black text-primary tracking-widest">
              {resultText}
            </div>
            {reason && (
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                By {reason}
              </p>
            )}
          </div>

          {winnerName && (
            <div className="p-3 bg-muted rounded-lg border border-border">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Winner</span>
              <span className="text-lg font-bold">{winnerName}</span>
            </div>
          )}

          <Button 
            onClick={onNewMatch}
            className="w-full h-12 font-black tracking-widest gap-2 text-md"
          >
            <RotateCcw className="w-4 h-4" />
            NEW MATCH
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
