import type { Move } from "@/api";

interface MoveListProps {
  moves: Move[]
  onMoveClick: (index: number) => void
  selectedMoveIndex?: number
  isLive?: boolean
}

export function MoveList({ moves, onMoveClick, selectedMoveIndex, isLive }: MoveListProps) {
  // Sort moves by moveNumber ascending, but handle pairs (white then black)
  // The moves array from API is desc moveNumber currently, let's reverse it locally
  const sortedMoves = [...moves].sort((a, b) => {
    if (a.moveNumber !== b.moveNumber) {
      return a.moveNumber - b.moveNumber
    }
    return a.playerColor === 'white' ? -1 : 1
  })

  // Group into rows
  const pairs: { number: number, white?: { m: Move, idx: number }, black?: { m: Move, idx: number } }[] = []
  
  sortedMoves.forEach((move, actualIdx) => {
    let pair = pairs.find(p => p.number === move.moveNumber)
    if (!pair) {
      pair = { number: move.moveNumber }
      pairs.push(pair)
    }
    if (move.playerColor === 'white') {
      pair.white = { m: move, idx: actualIdx }
    } else {
      pair.black = { m: move, idx: actualIdx }
    }
  })

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg flex flex-col h-[300px]">
      <div className="p-3 border-b border-border bg-muted/50 flex justify-between items-center">
        <h3 className="font-bold text-sm uppercase tracking-wider">Move History</h3>
        {isLive && moves.length > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 animate-pulse bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            LIVE
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <table className="w-full text-sm border-separate border-spacing-y-1">
          <tbody>
            {pairs.map((pair) => (
              <tr key={pair.number}>
                <td className="w-8 text-muted-foreground font-mono text-xs pr-2 text-right">
                  {pair.number}.
                </td>
                <td className="w-1/2">
                  {pair.white && (
                    <button
                      onClick={() => onMoveClick(pair.white!.idx)}
                      className={`w-full text-left px-2 py-1 rounded font-medium transition-colors ${selectedMoveIndex === pair.white.idx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      {pair.white.m.move}
                    </button>
                  )}
                </td>
                <td className="w-1/2">
                  {pair.black && (
                    <button
                      onClick={() => onMoveClick(pair.black!.idx)}
                      className={`w-full text-left px-2 py-1 rounded font-medium transition-colors ${selectedMoveIndex === pair.black.idx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      {pair.black.m.move}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {moves.length === 0 && (
          <div className="h-full flex items-center justify-center text-muted-foreground italic py-8">
            No moves yet.
          </div>
        )}
      </div>
    </div>
  )
}
