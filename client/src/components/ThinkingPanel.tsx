import { Button } from "@/components/ui/button"

interface ThinkingPanelProps {
  side: 'white' | 'black'
  modelName: string
  opening?: string
  candidates?: string[]
  reasoning?: string
}

export function ThinkingPanel({ side, modelName, opening, candidates, reasoning }: ThinkingPanelProps) {
  const isWhite = side === 'white'
  
  return (
    <div className={`flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-lg ${isWhite ? 'border-l-4 border-l-primary' : 'border-r-4 border-r-muted-foreground'}`}>
      <div className={`p-3 border-b border-border flex justify-between items-center ${isWhite ? 'bg-primary/5' : 'bg-muted/50'}`}>
        <h3 className="font-bold uppercase tracking-wider text-sm">
          {side} Player
        </h3>
        <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]" title={modelName}>
          {modelName}
        </span>
      </div>
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px]">
        {!opening && !candidates && !reasoning ? (
          <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm py-8 text-center">
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
                <p className="text-sm leading-relaxed text-foreground/90 italic">
                  "{reasoning}"
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
