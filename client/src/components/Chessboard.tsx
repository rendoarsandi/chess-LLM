import { Chessboard } from 'react-chessboard'
import { cn } from '@/lib/utils'

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function ChessboardContainer({
  fen,
  boardOrientation = 'white',
  highlightSquares,
}: {
  fen?: string
  boardOrientation?: 'white' | 'black'
  highlightSquares?: { from: string; to: string }
}) {
  const currentFen = fen || DEFAULT_FEN

  const customSquareStyles = highlightSquares
    ? {
        [highlightSquares.from]: { backgroundColor: 'var(--color-last-move)' },
        [highlightSquares.to]: { backgroundColor: 'var(--color-last-move)' },
      }
    : {}

  return (
    <div className="flex flex-col w-full max-w-[min(90vw,500px)] lg:max-w-[min(40vw,600px)] mx-auto gap-3">
      <div
        data-testid="chess-board-container"
        className={cn(
          'w-full aspect-square shadow-2xl rounded-sm border-4 border-sidebar-border bg-sidebar relative overflow-hidden',
          'ring-1 ring-primary/10',
        )}
      >
        <Chessboard
          key={`${currentFen}-${boardOrientation}`}
          options={{
            position: currentFen,
            boardOrientation: boardOrientation,
            squareStyles: customSquareStyles,
            animationDurationInMs: 200,
            darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
            lightSquareStyle: { backgroundColor: 'var(--board-light)' },
          }}
        />
      </div>
    </div>
  )
}
