import { afterEach, describe, expect, it } from 'vitest'
import { Chess, DEFAULT_POSITION } from 'chess.js'
import { parseLine, scoreLabel, StockfishClient } from './stockfish'

const clients: StockfishClient[] = []
afterEach(() => clients.splice(0).forEach((client) => client.disable()))

class UciWorker {
  commands: string[] = []
  terminated = false
  onmessage: Worker['onmessage'] = null
  onerror: Worker['onerror'] = null
  postMessage(command: string) {
    this.commands.push(command)
  }
  terminate() {
    this.terminated = true
  }
  send(line: string) {
    this.onmessage?.call(this as unknown as Worker, { data: line } as MessageEvent)
  }
}

describe('browser Stockfish analysis', () => {
  it('translates real UCI notation and scores into White-perspective continuations', () => {
    const position = new Chess()
    position.move('e4')
    const line = parseLine(
      'info depth 12 seldepth 17 multipv 2 score cp 32 nodes 4000 pv e7e5 g1f3 b8c6',
      position.fen(),
    )
    expect(line).toMatchObject({
      rank: 2,
      depth: 12,
      score: { kind: 'cp', value: -32 },
      san: '1… e5 2. Nf3 Nc6',
    })
    expect(scoreLabel(line!.score)).toBe('-0.32')
    const promotion = parseLine(
      'info depth 10 multipv 1 score mate 5 pv a7a8q',
      '7k/P7/8/8/8/8/8/7K w - - 0 1',
    )
    expect(promotion?.san).toBe('1. a8=Q+')
    expect(scoreLabel(promotion!.score)).toBe('M5')
    expect(
      parseLine('info depth 12 multipv 1 score cp 40 lowerbound pv e7e5', position.fen()),
    ).toBeNull()
    expect(parseLine('info depth 12 multipv 1 score cp 40 pv e2e4', position.fen())).toBeNull()
  })

  it('replaces in-flight searches without leaking old variations into the latest replay position', () => {
    const worker = new UciWorker()
    const client = new StockfishClient(() => worker)
    clients.push(client)
    client.analyse(DEFAULT_POSITION, 1000)
    worker.send('uciok')
    expect(worker.commands).toContain('setoption name MultiPV value 3')
    worker.send('readyok')
    worker.send('info depth 8 multipv 1 score cp 18 pv e2e4 e7e5')
    expect(client.getSnapshot().lines[0].san).toBe('1. e4 e5')

    const position = new Chess()
    position.move('e4')
    client.analyse(position.fen(), 1000)
    position.move('e5')
    const latest = position.fen()
    client.analyse(latest, 3000)
    worker.send('info depth 9 multipv 1 score cp 500 pv d2d4')
    expect(client.getSnapshot()).toMatchObject({ fen: latest, lines: [] })
    worker.send('bestmove e2e4')
    worker.send('readyok')
    expect(worker.commands.slice(-2)).toEqual([
      `position fen ${latest}`,
      'go depth 24 movetime 3000',
    ])
    worker.send('info depth 10 multipv 1 score cp 25 pv g1f3 b8c6')
    worker.send('info depth 10 multipv 2 score cp 20 pv f1c4 g8f6')
    worker.send('info depth 10 multipv 3 score cp 12 pv b1c3 g8f6')
    worker.send('bestmove g1f3')
    expect(client.getSnapshot()).toMatchObject({
      fen: latest,
      status: 'complete',
      lines: [
        { rank: 1, san: '2. Nf3 Nc6' },
        { rank: 2, san: '2. Bc4 Nf6' },
        { rank: 3, san: '2. Nc3 Nf6' },
      ],
    })
    client.disable()
    expect(worker.terminated).toBe(true)
    expect(client.getSnapshot()).toMatchObject({ status: 'disabled', lines: [] })
  })

  it('recovers from worker failure and handles terminal positions without running a search', () => {
    let worker = new UciWorker()
    const client = new StockfishClient(() => worker)
    clients.push(client)
    client.analyse(DEFAULT_POSITION, 1000)
    worker.onerror?.call(worker as unknown as Worker, new Event('error') as ErrorEvent)
    expect(client.getSnapshot()).toMatchObject({ status: 'error', lines: [] })
    expect(worker.terminated).toBe(true)
    worker = new UciWorker()
    client.analyse(DEFAULT_POSITION, 1000)
    worker.send('uciok')
    worker.send('readyok')
    expect(worker.commands.at(-1)).toBe('go depth 24 movetime 1000')

    const position = new Chess()
    for (const move of ['f3', 'e5', 'g4', 'Qh4#']) position.move(move)
    client.analyse(position.fen(), 1000)
    expect(worker.terminated).toBe(true)
    expect(client.getSnapshot().status).toBe('complete')
    expect(scoreLabel(client.getSnapshot().lines[0].score)).toBe('−M0')
    client.analyse('7k/8/8/8/8/8/8/K7 w - - 0 1', 1000)
    expect(client.getSnapshot().lines[0]).toMatchObject({
      score: { kind: 'cp', value: 0 },
      san: 'Drawn position',
    })
  })
})
