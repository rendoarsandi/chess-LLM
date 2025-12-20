import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ThinkingPanelProps {
  side: 'white' | 'black'
  modelName: string
  opening?: string
  candidates?: string[]
  reasoning?: string
  isMobile?: boolean
  moveNumber?: number
  moveSAN?: string
}

export function ThinkingPanel({ 
  side, modelName, opening, candidates, reasoning, isMobile, moveNumber, moveSAN 
}: ThinkingPanelProps) {
  const isWhite = side === 'white'
  const [isExpanded, setIsExpanded] = useState(false)

  const truncatedReasoning = reasoning && reasoning.length > 150 
    ? reasoning.slice(0, 150) + '...' 
    : reasoning

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-lg transition-all duration-300",
      isWhite ? "border-l-4 border-l-primary" : "border-r-4 border-r-muted-foreground"
    )}>
      <div className={cn("p-3 border-b border-border flex justify-between items-center", isWhite ? "bg-primary/5" : "bg-muted/50")}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold uppercase tracking-wider text-sm">
            {side} Player
          </h3>
          {moveNumber && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black tracking-tighter">
              MOVE {moveNumber}{moveSAN ? ` (${moveSAN})` : ''}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground truncate max-w-[100px]" title={modelName}>
          {modelName}
        </span>
      </div>
      
      <div className={cn(
        "flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar transition-all duration-300",
        !isMobile ? "min-h-[350px] max-h-[350px]" : "min-h-[120px]"
      )}>
        {!opening && !candidates && !reasoning ? (
          <div className="h-full min-h-[120px] flex items-center justify-center text-muted-foreground italic text-sm py-8 text-center">
            Waiting for move...
          </div>
        ) : (
          <>
            {opening && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Opening</h4>
                <p className="text-sm font-medium">{opening}</p>
              </div>
            )}
            
            {candidates && candidates.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Top 3 Candidates</h4>
                <div className="flex flex-wrap gap-2">
                  {candidates.map((move, i) => (
                    <div key={i} className="bg-muted px-2 py-1 rounded text-xs font-mono font-bold">
                      {i + 1}. {move}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {reasoning && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Reasoning</h4>
                <div className="text-sm leading-relaxed text-foreground/90 italic">
                  "{isExpanded || !isMobile ? reasoning : truncatedReasoning}"
                  {isMobile && reasoning.length > 150 && (
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="ml-2 text-primary font-bold text-[10px] uppercase hover:underline"
                    >
                      {isExpanded ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
