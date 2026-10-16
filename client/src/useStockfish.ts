import { useEffect, useState, useSyncExternalStore } from 'react'
import { StockfishClient, type Analysis } from './engine/stockfish'

export function useStockfish(fen: string) {
  const [engine] = useState(() => new StockfishClient())
  const [enabled, setEnabled] = useState(true)
  const [milliseconds, setMilliseconds] = useState(3000)
  const [retry, setRetry] = useState(0)
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  useEffect(() => {
    if (enabled) engine.analyse(fen, milliseconds)
    else engine.disable()
  }, [engine, fen, enabled, milliseconds, retry])
  useEffect(() => () => engine.disable(), [engine])
  const analysis: Analysis = enabled
    ? snapshot.fen === fen
      ? snapshot
      : { fen, status: 'loading', lines: [] }
    : { fen, status: 'disabled', lines: [] }
  return {
    analysis,
    enabled,
    setEnabled,
    milliseconds,
    setMilliseconds,
    retry: () => setRetry((value) => value + 1),
  }
}
