/**
 * Generates a Chess 960 (Fischer Random) starting FEN string from a given SP-ID (0-959).
 */
export function generate960Fen(id: number): string {
  if (id < 0 || id > 959) {
    throw new Error('SP-ID must be between 0 and 959');
  }

  const squares: string[] = new Array(8).fill('');
  
  // 1. Light Bishop
  const bLightPos = (id % 4) * 2 + 1;
  squares[bLightPos] = 'B';
  let rem = Math.floor(id / 4);

  // 2. Dark Bishop
  const bDarkPos = (rem % 4) * 2;
  squares[bDarkPos] = 'B';
  rem = Math.floor(rem / 4);

  // 3. Queen
  const qPos = rem % 6;
  rem = Math.floor(rem / 6);

  let qCount = 0;
  for (let i = 0; i < 8; i++) {
    if (squares[i] === '') {
      if (qCount === qPos) {
        squares[i] = 'Q';
      }
      qCount++;
    }
  }

  // 4. Knights
  const knightCombinations = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 2], [1, 3], [1, 4],
    [2, 3], [2, 4],
    [3, 4]
  ];
  const [n1, n2] = knightCombinations[rem];

  let nIdx = 0;
  for (let i = 0; i < 8; i++) {
    if (squares[i] === '') {
      if (nIdx === n1 || nIdx === n2) {
        squares[i] = 'N';
      }
      nIdx++;
    }
  }

  // 5. Rooks and King (R-K-R)
  const rkr = ['R', 'K', 'R'];
  let rkrIdx = 0;
  for (let i = 0; i < 8; i++) {
    if (squares[i] === '') {
      squares[i] = rkr[rkrIdx++];
    }
  }

  const row = squares.join('').toLowerCase();
  const upperRow = row.toUpperCase();

  return `${row}/pppppppp/8/8/8/8/PPPPPPPP/${upperRow} w KQkq - 0 1`;
}