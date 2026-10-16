import { Chess } from 'chess.js'

export const engineUrl = '/engine/stockfish-19-lite-single.js'
export type EngineScore = { kind: 'cp' | 'mate'; value: number }
export interface EngineLine {
  rank: number
  depth: number
  score: EngineScore
  moves: string[]
  san: string
}
export interface Analysis {
  fen: string
  status: 'disabled' | 'loading' | 'analysing' | 'complete' | 'error'
  lines: EngineLine[]
  error?: string
}

export function scoreLabel(score: EngineScore) {
  if (score.kind === 'mate')
    return `${score.value < 0 || Object.is(score.value, -0) ? '−' : ''}M${Math.abs(score.value)}`
  const pawns = score.value / 100
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(2)}`
}

// UCI scores belong to the side to move; the interface always shows White's score.
export function parseLine(text: string, fen: string): EngineLine | null {
  const depth = text.match(/\bdepth (\d+)/)
  const rank = text.match(/\bmultipv (\d+)/)
  const score = text.match(/\bscore (cp|mate) (-?\d+)/)
  const pv = text.match(/\bpv (.+)$/)
  if (!depth || !rank || !score || !pv || /\b(lowerbound|upperbound)\b/.test(text)) return null
  const position = new Chess(fen)
  const sign = position.turn() === 'w' ? 1 : -1
  const moves = pv[1].trim().split(/\s+/)
  const notation: string[] = []
  try {
    for (const uci of moves.slice(0, 12)) {
      const number = position.moveNumber()
      const white = position.turn() === 'w'
      const move = position.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      notation.push(
        `${white ? `${number}. ` : notation.length === 0 ? `${number}… ` : ''}${move.san}`,
      )
    }
  } catch {
    return null
  }
  return {
    rank: Number(rank[1]),
    depth: Number(depth[1]),
    score: { kind: score[1] as EngineScore['kind'], value: Number(score[2]) * sign },
    moves,
    san: notation.join(' '),
  }
}

type EngineWorker = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror'>
type Search = { fen: string; milliseconds: number }

export class StockfishClient {
  private worker: EngineWorker | null = null
  private phase: 'booting' | 'readying' | 'idle' | 'searching' | 'stopping' = 'idle'
  private pending: Search | null = null
  private active: Search | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private listeners = new Set<() => void>()
  private snapshot: Analysis = { fen: '', status: 'disabled', lines: [] }

  constructor(private createWorker: () => EngineWorker = () => new Worker(engineUrl)) {}

  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private publish(snapshot: Analysis) {
    this.snapshot = snapshot
    this.listeners.forEach((listener) => listener())
  }

  analyse(fen: string, milliseconds: number) {
    const position = new Chess(fen)
    this.pending = { fen, milliseconds }
    if (position.isGameOver()) {
      this.disable()
      this.publish({
        fen,
        status: 'complete',
        lines: position.isCheckmate()
          ? [
              {
                rank: 1,
                depth: 0,
                score: { kind: 'mate', value: position.turn() === 'w' ? -0 : 0 },
                moves: [],
                san: 'Checkmate',
              },
            ]
          : [
              {
                rank: 1,
                depth: 0,
                score: { kind: 'cp', value: 0 },
                moves: [],
                san: 'Drawn position',
              },
            ],
      })
      return
    }
    this.publish({ fen, status: this.worker ? 'analysing' : 'loading', lines: [] })
    if (!this.worker) {
      try {
        this.worker = this.createWorker()
        this.phase = 'booting'
        this.worker.onmessage = (event: MessageEvent<unknown>) => {
          if (typeof event.data === 'string')
            event.data.split('\n').forEach((line) => this.receive(line))
        }
        this.worker.onerror = () =>
          this.fail('Stockfish could not load. Retry analysis or check your connection.')
        this.watchdog(20000)
        this.worker.postMessage('uci')
      } catch {
        this.fail('This browser could not start Stockfish. Use a browser with WebAssembly support.')
      }
    } else if (this.phase === 'searching') {
      this.phase = 'stopping'
      this.worker.postMessage('stop')
      this.watchdog(10000)
    } else if (this.phase === 'idle') {
      this.ready()
    }
  }

  private ready() {
    this.phase = 'readying'
    this.worker?.postMessage('isready')
    this.watchdog(10000)
  }

  private receive(text: string) {
    if (text === 'uciok' && this.phase === 'booting') {
      this.worker?.postMessage('setoption name MultiPV value 3')
      this.worker?.postMessage('setoption name Hash value 16')
      this.ready()
    } else if (text === 'readyok' && this.phase === 'readying') {
      clearTimeout(this.timer)
      const next = this.pending
      if (!next) {
        this.phase = 'idle'
        return
      }
      this.pending = null
      this.active = next
      this.phase = 'searching'
      this.publish({ fen: next.fen, status: 'analysing', lines: [] })
      this.worker?.postMessage(`position fen ${next.fen}`)
      this.worker?.postMessage(`go depth 24 movetime ${next.milliseconds}`)
      this.watchdog(next.milliseconds + 15000)
    } else if (text.startsWith('info ') && this.phase === 'searching' && this.active) {
      const line = parseLine(text, this.active.fen)
      if (!line || line.rank < 1 || line.rank > 3) return
      const lines = this.snapshot.lines.filter((item) => item.rank !== line.rank)
      lines.push(line)
      this.publish({ ...this.snapshot, lines: lines.sort((a, b) => a.rank - b.rank) })
    } else if (
      text.startsWith('bestmove ') &&
      (this.phase === 'searching' || this.phase === 'stopping')
    ) {
      clearTimeout(this.timer)
      this.active = null
      this.phase = 'idle'
      if (this.pending) this.ready()
      else this.publish({ ...this.snapshot, status: 'complete' })
    }
  }

  private watchdog(milliseconds: number) {
    clearTimeout(this.timer)
    this.timer = setTimeout(
      () => this.fail('Stockfish stopped responding. Retry analysis.'),
      milliseconds,
    )
  }

  private fail(error: string) {
    const fen = this.snapshot.fen
    this.disable()
    this.publish({ fen, status: 'error', lines: [], error })
  }

  disable() {
    clearTimeout(this.timer)
    if (this.worker) {
      this.worker.onmessage = null
      this.worker.onerror = null
      this.worker.terminate()
    }
    this.worker = null
    this.active = null
    this.pending = null
    this.phase = 'idle'
    this.publish({ fen: '', status: 'disabled', lines: [] })
  }
}
