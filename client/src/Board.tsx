import { Chess, DEFAULT_POSITION, type PieceSymbol } from 'chess.js'
import type { CSSProperties } from 'react'

const startingFen = DEFAULT_POSITION
const names: Record<PieceSymbol, string> = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
}

function Piece({
  type,
  color,
  motion,
}: {
  type: PieceSymbol
  color: 'w' | 'b'
  motion?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 45 45"
      className={`piece piece-${color} ${motion ? 'moving-piece' : ''}`}
      style={motion}
      aria-hidden="true"
      fill={color === 'w' ? '#fffdf7' : '#26313f'}
      stroke={color === 'w' ? '#3d4956' : '#e6ebee'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {type === 'p' && (
        <>
          <circle cx="22.5" cy="11" r="5" />
          <path d="M18 16c-5 6-3 9 1 11l-4 7h15l-4-7c4-2 6-5 1-11z" />
          <path d="M13 34h19v5H13z" />
        </>
      )}
      {type === 'r' && (
        <>
          <path d="M11 7h6v5h5V7h6v5h5V7h4v12l-5 4v11H13V23l-5-4V7z" />
          <path d="M13 23h19M10 34h25v5H10zM9 18h27" />
        </>
      )}
      {type === 'n' && (
        <>
          <path d="m14 7 10 3 5 5c6 5 7 12 5 19H15l3-10-6 2-5-5 10-11z" />
          <path d="m14 7 1 8M18 17l2-2M25 17c-6 5-7 9-5 17M11 34h26v5H11z" />
        </>
      )}
      {type === 'b' && (
        <>
          <circle cx="22.5" cy="6" r="2.5" />
          <path d="M22.5 9c-12 9-12 16 0 20 12-4 12-11 0-20zM21 13l6 8M19 28l-4 6h15l-4-6M11 34h23v5H11z" />
        </>
      )}
      {type === 'q' && (
        <>
          <path d="m9 13 8 9 5.5-11L28 22l8-9-5 19H14zM12 32h21v7H12z" />
          <circle cx="8" cy="11" r="2.5" />
          <circle cx="22.5" cy="8" r="2.5" />
          <circle cx="37" cy="11" r="2.5" />
          <path d="M15 28h15" />
        </>
      )}
      {type === 'k' && (
        <>
          <path d="M22.5 4v10M18 8h9M22.5 16c-10-9-18 2-10 11l3 6h15l3-6c8-9 0-20-10.5-11zM12 33h21v6H12z" />
          <path d="M16 29h13M22.5 16v12" />
        </>
      )}
    </svg>
  )
}

export function Board({
  fen = startingFen,
  flipped = false,
  lastMove,
}: {
  fen?: string
  flipped?: boolean
  lastMove?: { from: string; to: string }
}) {
  const chess = new Chess(fen)
  const board = chess.board().flat()
  const squares = flipped ? [...board].reverse() : board
  const files = flipped ? 'hgfedcba' : 'abcdefgh'
  return (
    <div
      className="chessboard"
      role="img"
      aria-label={`Chess position. ${chess.turn() === 'w' ? 'White' : 'Black'} to move. ${board
        .filter(Boolean)
        .map(
          (piece) =>
            `${piece!.color === 'w' ? 'White' : 'Black'} ${names[piece!.type]} on ${piece!.square}`,
        )
        .join(', ')}.`}
    >
      {squares.map((piece, index) => {
        const row = Math.floor(index / 8),
          column = index % 8
        const square = `${files[column]}${flipped ? row + 1 : 8 - row}`
        const motion =
          lastMove?.to === square
            ? ({
                '--move-x': `${((lastMove.from.charCodeAt(0) - lastMove.to.charCodeAt(0)) * (flipped ? -1 : 1) * 100) / 0.88}%`,
                '--move-y': `${((Number(lastMove.to[1]) - Number(lastMove.from[1])) * (flipped ? -1 : 1) * 100) / 0.88}%`,
              } as CSSProperties)
            : undefined
        return (
          <div
            key={square}
            className={`square ${(row + column) % 2 ? 'dark-square' : 'light-square'} ${lastMove?.from === square || lastMove?.to === square ? 'last-square' : ''}`}
          >
            {piece && (
              <Piece
                key={motion ? `${lastMove!.from}-${lastMove!.to}-${fen}` : square}
                type={piece.type}
                color={piece.color}
                motion={motion}
              />
            )}
            {column === 0 && <span className="rank-label">{square[1]}</span>}
            {row === 7 && <span className="file-label">{square[0]}</span>}
          </div>
        )
      })}
    </div>
  )
}
