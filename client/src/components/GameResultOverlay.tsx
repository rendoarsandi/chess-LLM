import { Button } from './ui/button'
import { Trophy, RotateCcw, Scale, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface GameResultOverlayProps {
  winner: 'white' | 'black' | 'draw' | null
  reason: string | null
  onNewGame: () => void
  onClose: () => void
  whitePlayerName?: string
  blackPlayerName?: string
}

export function GameResultOverlay({
  winner,
  reason,
  onNewGame,
  onClose,
  whitePlayerName,
  blackPlayerName,
}: GameResultOverlayProps) {
  if (winner === null && !reason) return null

  const resultText = winner === 'white' ? '1-0' : winner === 'black' ? '0-1' : '½-½'
  const winnerName =
    winner === 'white' ? whitePlayerName : winner === 'black' ? blackPlayerName : null

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
          className="bg-card border-2 border-primary/20 p-8 rounded-xl shadow-2xl max-w-sm w-full text-center space-y-6 relative"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>

          <div className="flex justify-center">
            {winner !== 'draw' ? (
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
              {winner !== 'draw' ? 'Game Over' : 'Draw'}
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
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-1">
                Winner
              </span>
              <span className="text-lg font-bold">{winnerName}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={onNewGame}
              className="w-full h-12 font-black tracking-widest gap-2 text-md"
            >
              <RotateCcw className="w-4 h-4" />
              NEW MATCH
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
