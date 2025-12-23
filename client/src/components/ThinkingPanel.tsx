import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface ThinkingPanelProps {
  side: 'white' | 'black'
  modelName: string
  opening?: string
  candidates?: string[]
  reasoning?: string
  isMobile?: boolean
  moveNumber?: number
  moveSAN?: string
  isThinking?: boolean
}

export function ThinkingPanel({ 
  side, modelName, opening, candidates, reasoning, isMobile, moveNumber, moveSAN, isThinking 
}: ThinkingPanelProps) {
  const isWhite = side === 'white'
  const [isExpanded, setIsExpanded] = useState(false)

  const truncatedReasoning = reasoning && reasoning.length > 150 
    ? reasoning.slice(0, 150) + '...' 
    : reasoning

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-lg transition-all duration-300",
        isWhite ? "border-l-4 border-l-primary" : "border-r-4 border-r-muted-foreground",
        isThinking && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
      )}
    >
      <div className={cn("p-3 border-b border-border flex justify-between items-center", isWhite ? "bg-primary/5" : "bg-muted/50")}>
        <div className="flex items-center gap-2">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">
            {side} Player
          </h3>
          <AnimatePresence mode="wait">
            {isThinking ? (
               <motion.span 
                 key="thinking"
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.8 }}
                 className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-black uppercase tracking-tighter"
               >
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  Thinking
               </motion.span>
            ) : moveNumber && (
              <motion.span 
                key="move"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black tracking-tighter"
              >
                MOVE {moveNumber}{moveSAN ? ` (${moveSAN})` : ''}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <span className="text-[10px] font-bold text-foreground/70 truncate max-w-[100px]" title={modelName}>
          {modelName}
        </span>
      </div>
      
      <div className={cn(
        "flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar transition-all duration-300",
        !isMobile ? "min-h-[350px] max-h-[350px]" : "min-h-[120px]"
      )}>
        <AnimatePresence mode="wait">
          {!opening && !candidates && !reasoning ? (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full min-h-[120px] flex items-center justify-center text-muted-foreground italic text-xs py-8 text-center flex-col gap-3"
            >
              {isThinking ? (
                <>
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium">Model is analyzing the position...</span>
                </>
              ) : (
                <span className="font-medium">Waiting for move...</span>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {opening && (
                <motion.div initial={{ x: -10 }} animate={{ x: 0 }}>
                  <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Opening</h4>
                  <p className="text-sm font-bold text-foreground">{opening}</p>
                </motion.div>
              )}
              
              {candidates && candidates.length > 0 && (
                <motion.div initial={{ x: -10 }} animate={{ x: 0 }} transition={{ delay: 0.1 }}>
                  <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Top 3 Candidates</h4>
                  <div className="flex flex-wrap gap-2">
                    {candidates.map((move, i) => (
                      <div key={i} className="bg-muted px-2 py-1 rounded text-xs font-mono font-black border border-border/50">
                        <span className="text-primary mr-1 opacity-50">{i + 1}.</span> {move}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {reasoning && (
                <motion.div initial={{ x: -10 }} animate={{ x: 0 }} transition={{ delay: 0.2 }}>
                  <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Reasoning</h4>
                  <div className="text-sm leading-relaxed text-foreground/90 italic bg-muted/30 p-3 rounded-lg border border-border/50">
                    "{isExpanded || !isMobile ? reasoning : truncatedReasoning}"
                    {isMobile && reasoning.length > 150 && (
                      <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="ml-2 text-primary font-black text-[9px] uppercase hover:underline"
                      >
                        {isExpanded ? 'Show Less' : 'Read More'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
