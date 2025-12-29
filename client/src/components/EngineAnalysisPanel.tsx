import React from 'react'
import type { EngineEvaluation } from '../lib/stockfish/StockfishWorker'
import { pvToSan } from '../lib/chess-utils'
import { cn } from '../lib/utils'

interface EngineAnalysisPanelProps {
  fen: string
  variations: EngineEvaluation[]
  isThinking: boolean
}

export const EngineAnalysisPanel: React.FC<EngineAnalysisPanelProps> = ({
  fen,
  variations,
  isThinking,
}) => {
  if (variations.length === 0 && !isThinking) return null

  return (
    <div className="bg-muted/30 border border-border rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border flex justify-between items-center bg-muted/50">
        <h3 className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
          Engine Analysis
          {isThinking && (
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
            </span>
          )}
        </h3>
        {variations[0] && (
          <span className="text-[9px] font-mono text-muted-foreground uppercase">
            Depth {variations[0].depth}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-1 space-y-1">
        {variations.length === 0 && isThinking ? (
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
          </div>
        ) : (
          variations.map((v) => {
            const score = v.isMate
              ? `M${v.mateIn}`
              : v.score / 100 > 0
                ? `+${(v.score / 100).toFixed(2)}`
                : (v.score / 100).toFixed(2)

            const isWhiteAdvantage = v.isMate ? (v.mateIn ?? 0) > 0 : v.score > 0
            const isMate = v.isMate

            return (
              <div
                key={v.multipv}
                className="group flex flex-col gap-1 p-2 hover:bg-muted/50 rounded-md transition-colors border border-transparent hover:border-border/50"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground w-4">
                      #{v.multipv}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-black px-1.5 py-0.5 rounded leading-none min-w-[3.5rem] text-center',
                        isMate
                          ? 'bg-primary text-primary-foreground'
                          : isWhiteAdvantage
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-red-500/10 text-red-500',
                      )}
                    >
                      {score}
                    </span>
                  </div>
                </div>
                {v.pv && (
                  <div className="pl-6 text-[11px] font-mono leading-relaxed text-foreground/80 break-words line-clamp-3">
                    {pvToSan(fen, v.pv, 10)}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
