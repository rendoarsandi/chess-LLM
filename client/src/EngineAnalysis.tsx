import { Cpu, LoaderCircle } from 'lucide-react'
import { scoreLabel, type Analysis, type EngineScore } from './engine/stockfish'
import type { useStockfish } from './useStockfish'

export function EvaluationBar({
  score,
  flipped,
  status,
}: {
  score?: EngineScore
  flipped: boolean
  status: Analysis['status']
}) {
  const mateForBlack = score?.kind === 'mate' && (score.value < 0 || Object.is(score.value, -0))
  const whitePercent = score
    ? score.kind === 'mate'
      ? mateForBlack
        ? 0
        : 100
      : 50 + 50 * Math.tanh(score.value / 600)
    : 50
  const label = score ? scoreLabel(score) : '—'
  return (
    <div
      className={`evaluation-bar ${flipped ? 'evaluation-flipped' : ''}`}
      role="img"
      aria-label={
        score
          ? `Stockfish evaluation ${label}, from White’s perspective`
          : `Stockfish evaluation ${status === 'disabled' ? 'off' : 'unavailable'}`
      }
    >
      <div className="evaluation-white" style={{ transform: `scaleY(${whitePercent / 100})` }} />
      <span
        className={`evaluation-label ${score && (score.value < 0 || mateForBlack) ? 'black-ahead' : ''}`}
      >
        {label}
      </span>
    </div>
  )
}

export function EngineAnalysis({ engine }: { engine: ReturnType<typeof useStockfish> }) {
  const { analysis, enabled, setEnabled, milliseconds, setMilliseconds, retry } = engine
  const busy = analysis.status === 'loading' || analysis.status === 'analysing'
  const depth = analysis.lines.length ? Math.min(...analysis.lines.map((line) => line.depth)) : null
  return (
    <section className="engine-analysis" aria-label="Stockfish analysis">
      <div className="engine-heading">
        <h3>
          <Cpu size={16} />
          Stockfish 19 <span>Lite</span>
        </h3>
        <label className="engine-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Analysis
        </label>
      </div>
      <div className="engine-controls">
        <span role="status">
          {busy && <LoaderCircle size={12} className="spin" />}
          {analysis.status === 'disabled'
            ? 'Analysis off'
            : analysis.status === 'loading'
              ? 'Loading engine…'
              : analysis.status === 'error'
                ? 'Engine unavailable'
                : `${busy ? 'Analysing' : 'Search complete'}${depth !== null ? ` · depth ${depth}` : ''}`}
        </span>
        <label>
          <span className="sr-only">Analysis time per position</span>
          <select
            value={milliseconds}
            disabled={!enabled}
            onChange={(event) => setMilliseconds(Number(event.target.value))}
          >
            <option value={1000}>1 second</option>
            <option value={3000}>3 seconds</option>
            <option value={10000}>10 seconds</option>
          </select>
        </label>
      </div>
      {analysis.error ? (
        <div className="engine-error" role="alert">
          <p>{analysis.error}</p>
          <button className="text-button" onClick={retry}>
            Retry analysis
          </button>
        </div>
      ) : (
        <ol className="engine-lines" aria-label="Best continuation lines">
          {[0, 1, 2].map((index) => {
            const line = analysis.lines.find((item) => item.rank === index + 1)
            return (
              <li key={index}>
                <span className="engine-line-rank">{index + 1}</span>
                <strong
                  className={`engine-score ${line && line.score.value < 0 ? 'engine-score-black' : ''}`}
                >
                  {line ? scoreLabel(line.score) : '—'}
                </strong>
                <span className="engine-variation" title={line?.san}>
                  {line?.san ??
                    (enabled
                      ? busy
                        ? 'Calculating…'
                        : 'No further legal line'
                      : 'Enable analysis to see this line')}
                </span>
              </li>
            )
          })}
        </ol>
      )}
      <p className="engine-note">
        Runs on your device. Scores favor White (+) or Black (−). Analysis is never sent to the
        models.
      </p>
      <a className="engine-source" href="/engine/README.txt" target="_blank" rel="noreferrer">
        Stockfish source & license
      </a>
    </section>
  )
}
