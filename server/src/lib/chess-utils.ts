import { Chess } from 'chess.js'

/**
 * Creates a new Chess instance safely, handling Chess 960 FENs if necessary.
 */
export function safeNewChess(fen?: string): Chess {
  if (!fen) return new Chess()

  try {
    return new Chess(fen)
  } catch (e) {
    const parts = fen.split(' ')
    if (parts.length >= 3) {
      const castling = parts[2]
      if (/[A-HJ-NP-Z]/i.test(castling)) {
        const standardCastling = castling === '-' ? '-' : 'KQkq'
        const standardFen = [...parts]
        standardFen[2] = standardCastling

        try {
          return new Chess(standardFen.join(' '))
        } catch (innerError) {
          console.error(
            '[safeNewChess] Server failed even with normalized castling:',
            standardFen.join(' '),
            innerError,
          )
        }
      }
    }
    throw e
  }
}

/**
 * Generates a Chess 960 (Fischer Random) starting FEN string from a given SP-ID (0-959).
 */
export function generate960Fen(id: number): string {
  if (id < 0 || id > 959) {
    throw new Error('SP-ID must be between 0 and 959')
  }

  const squares: string[] = new Array(8).fill('')

  // 1. Light Bishop
  const bLightPos = (id % 4) * 2 + 1
  squares[bLightPos] = 'B'
  let rem = Math.floor(id / 4)

  // 2. Dark Bishop
  const bDarkPos = (rem % 4) * 2
  squares[bDarkPos] = 'B'
  rem = Math.floor(rem / 4)

  // 3. Queen
  const qPos = rem % 6
  rem = Math.floor(rem / 6)

  let qCount = 0
  for (let i = 0; i < 8; i++) {
    if (squares[i] === '') {
      if (qCount === qPos) {
        squares[i] = 'Q'
      }
      qCount++
    }
  }

  // 4. Knights
  const knightCombinations = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
    [3, 4],
  ]
  const [n1, n2] = knightCombinations[rem]

  let nIdx = 0
  for (let i = 0; i < 8; i++) {
    if (squares[i] === '') {
      if (nIdx === n1 || nIdx === n2) {
        squares[i] = 'N'
      }
      nIdx++
    }
  }

  // 5. Rooks and King (R-K-R)
  const rkr = ['R', 'K', 'R']
  let rkrIdx = 0
  const rookFiles: number[] = []
  for (let i = 0; i < 8; i++) {
    if (squares[i] === '') {
      if (rkr[rkrIdx] === 'R') rookFiles.push(i)
      squares[i] = rkr[rkrIdx++]
    }
  }

  const row = squares.join('').toLowerCase()
  const upperRow = row.toUpperCase()

  // X-FEN notation uses rook file letters to represent castling rights in 960.
  // Order: White King-side, White Queen-side, Black King-side, Black Queen-side.
  const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const whiteK = files[rookFiles[1]] // Right rook
  const whiteQ = files[rookFiles[0]] // Left rook
  const castling = `${whiteK}${whiteQ}${whiteK.toLowerCase()}${whiteQ.toLowerCase()}`

  return `${row}/pppppppp/8/8/8/8/PPPPPPPP/${upperRow} w ${castling} - 0 1`
}
