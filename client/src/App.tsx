import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  FlaskConical,
  KeyRound,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RotateCw,
  Search,
  Square,
  Swords,
  X,
} from 'lucide-react'
import { Chess, DEFAULT_POSITION as startingFen } from 'chess.js'
import { api, downloadText, money, tokenKey } from './api'
import { Board } from './Board'
import { useLiveRun, type ThinkingEvent } from './useLiveRun'
import {
  standings,
  summarize,
  type Match,
  type RunInput,
  type RunSnapshot,
  type RunSummary,
} from '../../shared/protocol'

function Status({ status }: { status: string }) {
  return (
    <span className={`status status-${status}`}>
      <span aria-hidden="true" />
      {status.replaceAll('_', ' ')}
    </span>
  )
}

function ErrorNotice({ error, retry }: { error: Error | null; retry?: () => void }) {
  return error ? (
    <div className="notice error" role="alert">
      <span>{error.message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  ) : null
}

function Loading({ children = 'Loading…' }: { children?: ReactNode }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={18} className="spin" />
      {children}
    </div>
  )
}

export default function App() {
  const [connected, setConnected] = useState(() => !!sessionStorage.getItem(tokenKey))
  const [showConnection, setShowConnection] = useState(false)
  const [token, setToken] = useState('')
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 30000 })
  function connect(event: FormEvent) {
    event.preventDefault()
    sessionStorage.setItem(tokenKey, token.trim())
    setConnected(true)
    setShowConnection(false)
    setToken('')
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <FlaskConical size={21} />
          </span>
          GameBench
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Benchmark runs
          </NavLink>
          <NavLink to="/live">Live arena</NavLink>
          <NavLink to="/method">Methodology</NavLink>
        </nav>
        <button
          className={`button compact ${connected ? 'connected' : ''}`}
          onClick={() => setShowConnection(!showConnection)}
        >
          <KeyRound size={15} />
          <span>{connected ? 'Token saved' : 'Connect'}</span>
        </button>
      </header>
      {showConnection && (
        <section className="connection-panel" aria-label="Admin connection">
          <form onSubmit={connect}>
            <div>
              <strong>Connect to manage runs</strong>
              <p>Enter your server’s admin token. It stays in this browser tab.</p>
            </div>
            <label className="sr-only" htmlFor="admin-token">
              Admin token
            </label>
            <input
              id="admin-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Admin token"
              autoComplete="off"
              required
              maxLength={256}
            />
            <button className="button primary" type="submit">
              Connect
            </button>
            {connected && (
              <button
                type="button"
                className="button"
                onClick={() => {
                  sessionStorage.removeItem(tokenKey)
                  setConnected(false)
                  setShowConnection(false)
                }}
              >
                Disconnect
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label="Close connection panel"
              onClick={() => setShowConnection(false)}
            >
              <X size={18} />
            </button>
          </form>
        </section>
      )}
      <main id="main" className="main-container">
        {health.isError && <ErrorNotice error={health.error} retry={() => void health.refetch()} />}
        {health.data && (!health.data.providerConfigured || !health.data.adminConfigured) && (
          <div className="notice setup">
            <CircleHelp size={18} />
            <span>
              Server setup is incomplete. Add{' '}
              {!health.data.providerConfigured && 'OPENROUTER_API_KEY'}
              {!health.data.providerConfigured && !health.data.adminConfigured && ' and '}
              {!health.data.adminConfigured && 'ADMIN_API_TOKEN'} to start runs.{' '}
              <Link to="/method">Setup guide</Link>
            </span>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Workbench connected={connected} />} />
          <Route path="/runs/:id" element={<Workbench connected={connected} />} />
          <Route
            path="/runs/new"
            element={<NewRun connected={connected} connect={() => setShowConnection(true)} />}
          />
          <Route path="/live" element={<Workbench connected={connected} liveOnly />} />
          <Route path="/method" element={<Methodology />} />
          <Route
            path="*"
            element={
              <div className="empty-message">
                <h1>Page not found</h1>
                <Link className="button primary" to="/">
                  Go to benchmark runs
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>GameBench · Chess is the first experiment.</span>
        <Link to="/method">
          How results are measured <ArrowRight size={13} />
        </Link>
      </footer>
    </>
  )
}

function Workbench({ liveOnly = false, connected }: { liveOnly?: boolean; connected: boolean }) {
  const { id } = useParams()
  const runs = useQuery({ queryKey: ['runs'], queryFn: api.runs, refetchInterval: 4000 })
  const visibleRuns = runs.data?.filter((run) => !liveOnly || run.status === 'running') ?? []
  const selectedId = id ?? visibleRuns[0]?.id
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{liveOnly ? 'Live arena' : 'Benchmark runs'}</h1>
          <p>
            {liveOnly
              ? 'Watch the experiment unfold, one move at a time.'
              : 'Put models on the same board. See how they play.'}
          </p>
        </div>
        <Link to="/runs/new" className="button primary">
          <Plus size={17} />
          New run
        </Link>
      </div>
      <ErrorNotice error={runs.error} retry={() => void runs.refetch()} />
      {runs.isPending ? (
        <Loading>Loading benchmark runs…</Loading>
      ) : (
        <div className="workbench">
          <aside className="run-rail" aria-label="Benchmark runs">
            <div className="rail-heading">
              <h2>{liveOnly ? 'Running now' : 'Experiments'}</h2>
              <span>{visibleRuns.length}</span>
            </div>
            {visibleRuns.length ? (
              <div className="run-items">
                {visibleRuns.map((run) => (
                  <RunItem key={run.id} run={run} active={run.id === selectedId} />
                ))}
              </div>
            ) : (
              <div className="rail-empty">
                <FlaskConical size={22} />
                <p>
                  {liveOnly ? 'No runs are live right now.' : 'Your experiments will appear here.'}
                </p>
              </div>
            )}
            <div className="rail-foot">
              <Swords size={15} />
              <span>Chess · Standard rules</span>
            </div>
          </aside>
          <section className="workspace" aria-label="Selected experiment">
            {selectedId ? (
              <RunWorkspace
                key={selectedId}
                id={selectedId}
                liveOnly={liveOnly}
                connected={connected}
              />
            ) : (
              <EmptyWorkspace liveOnly={liveOnly} />
            )}
          </section>
        </div>
      )}
    </>
  )
}

function RunItem({ run, active }: { run: RunSummary; active: boolean }) {
  return (
    <Link
      to={`/runs/${run.id}`}
      className={`run-item ${active ? 'active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <div className="run-item-top">
        <Status status={run.status} />
        <span>
          {new Date(run.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
      <strong>{run.name}</strong>
      <p>
        {run.modelNames.length} models · {run.totalMatches} matches
      </p>
      <div className="run-item-bottom">
        <span>
          {run.completedMatches}/{run.totalMatches} finished
        </span>
        <span>{money(run.costUsd)}</span>
      </div>
      <progress
        value={run.completedMatches}
        max={run.totalMatches}
        aria-label={`${run.name} progress`}
      />
    </Link>
  )
}

function EmptyWorkspace({ liveOnly }: { liveOnly: boolean }) {
  return (
    <div className="empty-workspace">
      <div className="empty-copy">
        <span className="empty-symbol">
          <Swords size={28} />
        </span>
        <h2>
          {liveOnly ? 'The next match starts with you.' : 'A fair match.\nA better comparison.'}
        </h2>
        <p>
          Choose your models, set the limits, and launch a chess benchmark. Every pairing plays both
          colors. Every response becomes part of the record.
        </p>
        <Link to="/runs/new" className="button primary">
          Set up your first run <ArrowRight size={16} />
        </Link>
        <Link to="/method" className="quiet-link">
          <BookOpen size={15} />
          Read the benchmark protocol
        </Link>
      </div>
      <div className="empty-board">
        <div className="board-caption">
          <span>Starting position</span>
          <span>White to move</span>
        </div>
        <Board />
        <p>One board. The same rules for every model.</p>
      </div>
      <div className="empty-principles">
        <span>
          <Check size={15} />
          Balanced colors
        </span>
        <span>
          <Check size={15} />
          Recorded responses & cost
        </span>
        <span>
          <Check size={15} />
          Exportable results
        </span>
      </div>
    </div>
  )
}

function RunWorkspace({
  id,
  liveOnly,
  connected,
}: {
  id: string
  liveOnly: boolean
  connected: boolean
}) {
  const client = useQueryClient()
  const live = useLiveRun(id)
  const runQuery = useQuery({
    queryKey: ['run', id],
    queryFn: () => api.run(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'completed' || query.state.data?.status === 'cancelled'
        ? false
        : 2000,
  })
  const [tab, setTab] = useState<'results' | 'watch' | 'protocol'>(() =>
    liveOnly || client.getQueryData<RunSnapshot>(['run', id])?.status === 'running'
      ? 'watch'
      : 'results',
  )
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [confirmStop, setConfirmStop] = useState(false)
  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    const keys = ['results', 'watch', 'protocol'] as const
    const current = keys.indexOf(tab)
    const next =
      event.key === 'ArrowRight'
        ? (current + 1) % keys.length
        : event.key === 'ArrowLeft'
          ? (current + keys.length - 1) % keys.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? keys.length - 1
              : null
    if (next === null) return
    event.preventDefault()
    setTab(keys[next])
    document.getElementById(`tab-${keys[next]}`)?.focus()
  }
  const command = useMutation({
    mutationFn: (action: 'pause' | 'resume' | 'cancel') => api.command(id, action),
    onSuccess: (run) => {
      client.setQueryData(['run', id], run)
      void client.invalidateQueries({ queryKey: ['runs'] })
      setConfirmStop(false)
    },
  })
  if (runQuery.isPending) return <Loading>Loading experiment…</Loading>
  if (runQuery.isError)
    return <ErrorNotice error={runQuery.error} retry={() => void runQuery.refetch()} />
  const run = runQuery.data
  const summary = summarize(run)
  const match =
    run.matches.find((match) => match.id === selectedMatch) ??
    run.matches.find((match) => match.status === 'running') ??
    run.matches[0]
  const canManage = connected && (run.status === 'running' || run.status === 'paused')
  return (
    <>
      <div className="experiment-header">
        <div>
          <div className="experiment-title">
            <h2>{run.config.name}</h2>
            <Status status={run.status} />
          </div>
          <p>
            {run.config.models.length} models · Color-balanced round robin ·{' '}
            {new Date(run.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="experiment-actions">
          <a className="button compact" href={`/api/runs/${id}/export`} download>
            <ArrowDownToLine size={15} />
            Export
          </a>
          {canManage && (
            <>
              <button
                className="icon-button"
                title={run.status === 'paused' ? 'Resume run' : 'Pause run'}
                aria-label={run.status === 'paused' ? 'Resume run' : 'Pause run'}
                disabled={command.isPending}
                onClick={() => command.mutate(run.status === 'paused' ? 'resume' : 'pause')}
              >
                {run.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
              </button>
              <button
                className="icon-button"
                title="Stop run"
                aria-label="Stop run"
                disabled={command.isPending}
                onClick={() => setConfirmStop(!confirmStop)}
              >
                <Square size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      {confirmStop && (
        <div className="notice stop-confirm">
          <span>
            Stop this run? Finished matches stay in the results; unfinished matches are excluded.
          </span>
          <button
            className="button danger compact"
            disabled={command.isPending}
            onClick={() => command.mutate('cancel')}
          >
            Stop run
          </button>
          <button className="text-button" onClick={() => setConfirmStop(false)}>
            Keep running
          </button>
        </div>
      )}
      <ErrorNotice error={command.error} />
      {run.message && (
        <div className="notice" role="status">
          {run.message}
        </div>
      )}
      <div className="experiment-summary">
        <span>
          <strong>
            {summary.completedMatches}/{summary.totalMatches}
          </strong>{' '}
          matches finished
        </span>
        <span>
          <strong>{money(summary.costUsd)}</strong> of {money(run.config.budgetUsd)} limit
        </span>
        <span>
          <strong>{run.config.maxPlies}</strong> plies per match
        </span>
      </div>
      <div className="workspace-tabs" role="tablist" aria-label="Experiment views">
        {(['results', 'watch', 'protocol'] as const).map((key) => (
          <button
            key={key}
            role="tab"
            id={`tab-${key}`}
            aria-controls="experiment-panel"
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            onKeyDown={moveTab}
            onClick={() => setTab(key)}
          >
            {key === 'results' ? 'Results' : key === 'watch' ? 'Watch matches' : 'Protocol'}
            {key === 'watch' && run.status === 'running' && <span className="live-dot" />}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="experiment-panel" tabIndex={0} aria-labelledby={`tab-${tab}`}>
        {tab === 'protocol' ? (
          <Protocol run={run} />
        ) : tab === 'results' ? (
          <>
            <Results run={run} />
            <div className="section-heading">
              <h3>Match results</h3>
              <span>{run.matches.length} scheduled</span>
            </div>
            <div className="match-table">
              {run.matches.map((item, index) => (
                <button
                  key={item.id}
                  className="match-row"
                  onClick={() => {
                    setSelectedMatch(item.id)
                    setTab('watch')
                  }}
                >
                  <span className="match-number">{index + 1}</span>
                  <span>
                    <strong>{modelName(run, item.modelIds[0])}</strong>
                    <small>White</small>
                  </span>
                  <span className="versus">vs</span>
                  <span>
                    <strong>{modelName(run, item.modelIds[1])}</strong>
                    <small>Black</small>
                  </span>
                  <span>
                    {item.result ? (
                      item.result.scores.map((score) => (score === 0.5 ? '½' : score)).join(' – ')
                    ) : (
                      <Status status={item.status} />
                    )}
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="match-workbench">
            <aside className="match-picker">
              <h3>Matches</h3>
              {run.matches.map((item, index) => (
                <button
                  key={item.id}
                  className={item.id === match.id ? 'selected' : ''}
                  onClick={() => setSelectedMatch(item.id)}
                >
                  <span>
                    Match {index + 1}
                    <Status status={item.status} />
                  </span>
                  <strong>{modelName(run, item.modelIds[0])}</strong>
                  <small>vs {modelName(run, item.modelIds[1])}</small>
                </button>
              ))}
            </aside>
            <MatchViewer
              key={match.id}
              run={run}
              match={match}
              thinking={live.thinking?.matchId === match.id ? live.thinking : null}
              liveConnected={live.connected}
            />
          </div>
        )}
      </div>
    </>
  )
}

function modelName(run: RunSnapshot, id: string) {
  return run.config.models.find((model) => model.id === id)?.name ?? id
}

function Results({ run }: { run: RunSnapshot }) {
  const rows = standings(run)
  const measured = rows.some((row) => row.games > 0)
  return (
    <div className="results-section">
      <div className="section-heading">
        <h3>Model comparison</h3>
        <span>{measured ? 'This run only' : 'Waiting for completed matches'}</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th title="Points divided by completed games. A draw is half a point.">Score</th>
              <th>W / D / L</th>
              <th title="Accepted legal actions divided by all inference requests, including errors.">
                Legal / requests
              </th>
              <th>Avg. response</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.modelId}>
                <td>
                  <strong>{row.name}</strong>
                  <small>{row.modelId}</small>
                </td>
                <td className="score-cell">
                  {row.games ? `${((row.points / row.games) * 100).toFixed(1)}%` : '—'}
                  <small>{row.games} games</small>
                </td>
                <td>
                  {row.wins} / {row.draws} / {row.losses}
                </td>
                <td>
                  {row.legalActions} / {row.requests}
                  <small>
                    {row.invalidActions} invalid · {row.errors} errors
                  </small>
                </td>
                <td>
                  {row.requests ? `${(row.latencyMs / row.requests / 1000).toFixed(1)}s` : '—'}
                  <small>{(row.inputTokens + row.outputTokens).toLocaleString()} tokens</small>
                </td>
                <td>
                  {money(row.costUsd)}
                  {row.estimatedCosts > 0 && <small>Includes estimates</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Win = 1 point. Draw = ½ point. Rankings describe this protocol and sample; compare completed
        games before drawing conclusions.
      </p>
    </div>
  )
}

function MatchViewer({
  run,
  match,
  thinking,
  liveConnected,
}: {
  run: RunSnapshot
  match: Match
  thinking: ThinkingEvent | null
  liveConnected: boolean
}) {
  const [flipped, setFlipped] = useState(false)
  const [cursor, setCursor] = useState<number | null>(null)
  const attemptsQuery = useQuery({
    queryKey: ['attempts', run.id, match.id],
    queryFn: () => api.attempts(run.id, match.id),
    refetchInterval: run.status === 'running' || run.pending ? 2000 : false,
  })
  const attempts = attemptsQuery.data ?? []
  const legal = attempts.filter((attempt) => attempt.outcome === 'legal')
  const index = cursor === null ? legal.length - 1 : Math.min(cursor, legal.length - 1)
  const selected = index >= 0 ? legal[index] : null
  const fen =
    cursor === null ? (match.view.fen ?? startingFen) : (selected?.positionAfter ?? startingFen)
  let lastMove: { from: string; to: string } | undefined
  if (selected?.action && selected.positionAfter === fen) {
    const positionBefore = index > 0 ? (legal[index - 1].positionAfter ?? startingFen) : startingFen
    const chess = new Chess(positionBefore)
    const move = chess.move(selected.action)
    lastMove = { from: move.from, to: move.to }
  }
  return (
    <>
      <div className="board-panel">
        <div className="player-line">
          <span className={`seat-dot ${flipped ? 'white-seat' : 'black-seat'}`} />
          <strong>{modelName(run, match.modelIds[flipped ? 0 : 1])}</strong>
          <span>{flipped ? 'White' : 'Black'}</span>
        </div>
        <Board fen={fen} flipped={flipped} lastMove={lastMove} />
        <div className="player-line">
          <span className={`seat-dot ${flipped ? 'black-seat' : 'white-seat'}`} />
          <strong>{modelName(run, match.modelIds[flipped ? 1 : 0])}</strong>
          <span>{flipped ? 'Black' : 'White'}</span>
        </div>
        <div className="playback-controls">
          <button
            className="icon-button"
            aria-label="Starting position"
            disabled={!legal.length || index < 0}
            onClick={() => setCursor(-1)}
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Previous move"
            disabled={index < 0}
            onClick={() => setCursor(index - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {cursor === null
              ? 'Latest position'
              : index < 0
                ? 'Starting position'
                : `Ply ${index + 1}`}
          </span>
          <button
            className="icon-button"
            aria-label="Next move"
            disabled={cursor === null}
            onClick={() => setCursor(index + 1 >= legal.length - 1 ? null : index + 1)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Latest position"
            disabled={cursor === null}
            onClick={() => setCursor(null)}
          >
            <ChevronsRight size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Flip board"
            title="Flip board"
            onClick={() => setFlipped(!flipped)}
          >
            <RotateCw size={15} />
          </button>
        </div>
        <div className="board-caption">
          <Status status={match.status} />
          <span>
            {match.result
              ? match.result.reason.replaceAll('_', ' ')
              : run.pending?.matchId === match.id
                ? `${match.turn === 0 ? 'White' : 'Black'} is thinking…`
                : `${match.plies} plies played`}
          </span>
        </div>
        {match.state && (
          <button
            className="text-button pgn-button"
            onClick={() => downloadText(`${match.id}.pgn`, match.state, 'application/x-chess-pgn')}
          >
            Download PGN <ArrowDownToLine size={13} />
          </button>
        )}
      </div>
      <div className="match-inspector">
        <div className="spectator-status">
          <span className={`live-dot ${liveConnected ? '' : 'offline'}`} />
          {liveConnected ? 'Live updates connected' : 'Reconnecting · refreshing positions'}
        </div>
        {thinking && run.status === 'running' && (
          <div className="live-thinking">
            <h3 aria-live="polite">
              <LoaderCircle className="spin" size={14} />
              {thinking.seat === 0 ? 'White' : 'Black'} is thinking
            </h3>
            <div className="stream-content">
              {thinking.reasoning || thinking.text || 'Waiting for the model’s response…'}
            </div>
            <small>
              {thinking.reasoning ? 'Reasoning returned by the model' : 'Model response stream'}
            </small>
          </div>
        )}
        <div className="section-heading">
          <h3>Move record</h3>
          <span>{legal.length} plies</span>
        </div>
        <ErrorNotice error={attemptsQuery.error} retry={() => void attemptsQuery.refetch()} />
        <div className="move-grid">
          {legal.length ? (
            Array.from({ length: Math.ceil(legal.length / 2) }, (_, pair) => (
              <div className="move-pair" key={pair}>
                <span>{pair + 1}.</span>
                {[0, 1].map((side) => {
                  const move = legal[pair * 2 + side]
                  return move ? (
                    <button
                      key={side}
                      className={pair * 2 + side === index ? 'selected-move' : ''}
                      onClick={() => setCursor(pair * 2 + side)}
                      aria-label={`Move ${pair + 1}, ${side === 0 ? 'White' : 'Black'}: ${move.action}`}
                    >
                      {move.action}
                    </button>
                  ) : (
                    <span key={side} />
                  )
                })}
              </div>
            ))
          ) : (
            <p className="muted">
              {attemptsQuery.isPending
                ? 'Loading move record…'
                : 'Moves appear here as the match progresses.'}
            </p>
          )}
        </div>
        <div className="response-detail">
          <h3>
            {selected ? `${selected.seat === 0 ? 'White' : 'Black'}’s response` : 'Model response'}
          </h3>
          {selected ? (
            <>
              <p>{selected.explanation || 'No explanation returned.'}</p>
              <dl>
                <div>
                  <dt>Response time</dt>
                  <dd>{(selected.latencyMs / 1000).toFixed(1)}s</dd>
                </div>
                <div>
                  <dt>Input / output</dt>
                  <dd>
                    {selected.inputTokens} / {selected.outputTokens}
                  </dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>
                    {money(selected.costUsd)}
                    {selected.costEstimated ? ' (estimated)' : ''}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="muted">Select a move to inspect its response and measurements.</p>
          )}
        </div>
        {selected?.reasoning && (
          <details className="recorded-reasoning">
            <summary>Recorded model reasoning</summary>
            <p>{selected.reasoning}</p>
          </details>
        )}
        <details className="attempt-log">
          <summary>
            All inference attempts <span>{attempts.length}</span>
          </summary>
          {attempts.map((attempt) => (
            <details className="attempt-entry" key={attempt.id}>
              <summary>
                <span>
                  {attempt.seat === 0 ? 'White' : 'Black'} · ply {attempt.ply + 1}
                </span>
                <Status status={attempt.outcome} />
              </summary>
              <p>{attempt.error || attempt.explanation || 'No explanation returned.'}</p>
              {attempt.reasoning && (
                <details>
                  <summary>Model reasoning</summary>
                  <p>{attempt.reasoning}</p>
                </details>
              )}
              <pre>{attempt.response || '(No response received)'}</pre>
              <small>
                {money(attempt.costUsd)}
                {attempt.costEstimated && ' estimated'} · {(attempt.latencyMs / 1000).toFixed(1)}s
              </small>
            </details>
          ))}
        </details>
      </div>
    </>
  )
}

function Protocol({ run }: { run: RunSnapshot }) {
  const config = run.config
  return (
    <div className="protocol-panel">
      <h3>Saved experiment protocol</h3>
      <p>These settings are fixed for the entire run.</p>
      <dl className="protocol-grid">
        {[
          ['Game', 'Standard chess'],
          ['Protocol', config.protocolVersion],
          [
            'Schedule',
            `${config.repetitions} round${config.repetitions > 1 ? 's' : ''}, both colors for every pairing`,
          ],
          ['Temperature', config.temperature],
          ['Output token limit', config.maxTokens],
          ['Move limit', `${config.maxPlies} plies`],
          ['Attempts per move', config.maxAttempts],
          ['Request timeout', `${config.timeoutMs / 1000}s`],
          ['Spend limit', money(config.budgetUsd)],
          ['Provider routing', 'OpenRouter · lowest price, required parameters'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h3>Models & captured prices</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Model ID</th>
              <th>Input / 1M tokens</th>
              <th>Output / 1M tokens</th>
            </tr>
          </thead>
          <tbody>
            {config.models.map((model) => (
              <tr key={model.id}>
                <td>{model.id}</td>
                <td>{money(model.inputPrice * 1_000_000)}</td>
                <td>{money(model.outputPrice * 1_000_000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewRun({ connected, connect }: { connected: boolean; connect: () => void }) {
  const navigate = useNavigate(),
    client = useQueryClient()
  const models = useQuery({ queryKey: ['models'], queryFn: api.models, staleTime: 300000 })
  const [search, setSearch] = useState('')
  const [input, setInput] = useState<RunInput>({
    name: 'Chess benchmark',
    gameId: 'chess',
    modelIds: [],
    repetitions: 1,
    temperature: 0.1,
    maxTokens: 1024,
    maxPlies: 160,
    maxAttempts: 2,
    timeoutMs: 45000,
    budgetUsd: 2,
  })
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const creation = useMutation({
    mutationFn: () => api.create(input, requestId),
    onSuccess: (run) => {
      client.setQueryData(['run', run.id], run)
      void client.invalidateQueries({ queryKey: ['runs'] })
      navigate(`/runs/${run.id}`)
    },
  })
  const filtered =
    models.data?.filter((model) =>
      `${model.name} ${model.id}`.toLowerCase().includes(search.toLowerCase()),
    ) ?? []
  const total = input.modelIds.length * (input.modelIds.length - 1) * input.repetitions
  function field<K extends keyof RunInput>(key: K, value: RunInput[K]) {
    setInput((current) => ({ ...current, [key]: value }))
    setRequestId(crypto.randomUUID())
    creation.reset()
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    creation.mutate()
  }
  return (
    <>
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        Benchmark runs
      </Link>
      <div className="page-heading">
        <div>
          <h1>Set up an experiment</h1>
          <p>Choose the players. Keep the conditions equal.</p>
        </div>
      </div>
      <form className="new-run-form" onSubmit={submit}>
        <div className="form-main">
          <section>
            <h2>Run details</h2>
            <div className="field-pair">
              <label>
                Run name
                <input
                  required
                  maxLength={80}
                  value={input.name}
                  onChange={(event) => field('name', event.target.value)}
                />
              </label>
              <label>
                Game
                <select
                  value={input.gameId}
                  onChange={(event) => field('gameId', event.target.value)}
                >
                  <option value="chess">Chess · Standard</option>
                </select>
              </label>
            </div>
          </section>
          <section>
            <div className="section-heading">
              <h2>Select models</h2>
              <span>{input.modelIds.length}/8 selected</span>
            </div>
            <p>Pick at least two models from the live OpenRouter catalogue.</p>
            <div className="search-field">
              <Search size={17} />
              <label className="sr-only" htmlFor="model-search">
                Search models
              </label>
              <input
                id="model-search"
                type="search"
                placeholder="Search by name or model ID"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="selected-models">
              {input.modelIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() =>
                    field(
                      'modelIds',
                      input.modelIds.filter((item) => item !== id),
                    )
                  }
                >
                  {models.data?.find((model) => model.id === id)?.name ?? id}
                  <X size={13} />
                  <span className="sr-only">Remove</span>
                </button>
              ))}
            </div>
            <ErrorNotice error={models.error} retry={() => void models.refetch()} />
            {models.isPending ? (
              <Loading>Loading OpenRouter models…</Loading>
            ) : (
              <div className="model-list">
                {filtered.length
                  ? filtered.map((model) => (
                      <label
                        className={`model-option ${input.modelIds.includes(model.id) ? 'checked' : ''}`}
                        key={model.id}
                      >
                        <input
                          type="checkbox"
                          checked={input.modelIds.includes(model.id)}
                          disabled={
                            !input.modelIds.includes(model.id) && input.modelIds.length === 8
                          }
                          onChange={() =>
                            field(
                              'modelIds',
                              input.modelIds.includes(model.id)
                                ? input.modelIds.filter((id) => id !== model.id)
                                : [...input.modelIds, model.id],
                            )
                          }
                        />
                        <span>
                          <strong>{model.name}</strong>
                          <small>{model.id}</small>
                        </span>
                        <span className="model-price">
                          {money(model.outputPrice * 1_000_000)}
                          <small>output / 1M tokens</small>
                        </span>
                      </label>
                    ))
                  : !models.isError && (
                      <p className="empty-message">No models match your search.</p>
                    )}
              </div>
            )}
          </section>
          <section>
            <h2>Match conditions</h2>
            <p>Every pair plays both colors in each round.</p>
            <div className="field-grid">
              <label>
                Rounds
                <select
                  value={input.repetitions}
                  onChange={(event) => field('repetitions', Number(event.target.value))}
                >
                  {[1, 2, 3].map((value) => (
                    <option key={value} value={value}>
                      {value} round{value > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Spend limit (USD)
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  required
                  value={input.budgetUsd}
                  onChange={(event) => field('budgetUsd', Number(event.target.value))}
                />
              </label>
              <label>
                Move limit (plies)
                <input
                  type="number"
                  min="2"
                  max="400"
                  required
                  value={input.maxPlies}
                  onChange={(event) => field('maxPlies', Number(event.target.value))}
                />
                <small>One move by one side is one ply.</small>
              </label>
              <label>
                Timeout per request (seconds)
                <input
                  type="number"
                  min="5"
                  max="90"
                  required
                  value={input.timeoutMs / 1000}
                  onChange={(event) => field('timeoutMs', Number(event.target.value) * 1000)}
                />
              </label>
            </div>
            <details className="advanced-settings">
              <summary>Model response settings</summary>
              <div className="field-grid">
                <label>
                  Temperature
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    required
                    value={input.temperature}
                    onChange={(event) => field('temperature', Number(event.target.value))}
                  />
                </label>
                <label>
                  Output token limit
                  <input
                    type="number"
                    min="128"
                    max="4096"
                    required
                    value={input.maxTokens}
                    onChange={(event) => field('maxTokens', Number(event.target.value))}
                  />
                </label>
                <label>
                  Attempts per move
                  <select
                    value={input.maxAttempts}
                    onChange={(event) => field('maxAttempts', Number(event.target.value))}
                  >
                    {[1, 2, 3].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p>
                Give reasoning models enough output tokens. Invalid responses and timeouts use an
                attempt; provider failures pause the run.
              </p>
            </details>
          </section>
        </div>
        <aside className="launch-panel">
          <span className="launch-icon">
            <FlaskConical size={26} />
          </span>
          <h2>Your experiment</h2>
          <dl>
            <div>
              <dt>Game</dt>
              <dd>Chess</dd>
            </div>
            <div>
              <dt>Models</dt>
              <dd>{input.modelIds.length}</dd>
            </div>
            <div>
              <dt>Matches</dt>
              <dd>{total}</dd>
            </div>
            <div>
              <dt>Spend limit</dt>
              <dd>{money(input.budgetUsd)}</dd>
            </div>
          </dl>
          <p>Matches run one at a time. You can close this tab; the experiment keeps playing.</p>
          <p className="muted">
            The next request needs room in the spend limit. Failed or interrupted requests may have
            estimated costs.
          </p>
          <ErrorNotice error={creation.error} />
          {connected ? (
            <button
              className="button primary launch-button"
              type="submit"
              disabled={input.modelIds.length < 2 || creation.isPending}
            >
              {creation.isPending ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Play size={16} />
              )}
              {creation.isPending ? 'Starting…' : 'Start benchmark'}
            </button>
          ) : (
            <button className="button primary launch-button" type="button" onClick={connect}>
              <KeyRound size={16} />
              Connect to start
            </button>
          )}
          <span className="launch-note">Settings and responses are saved with the run.</span>
        </aside>
      </form>
    </>
  )
}

function Methodology() {
  return (
    <article className="methodology">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        Benchmark runs
      </Link>
      <h1>What a run measures</h1>
      <p className="lead">
        Chess gives models a shared set of rules, observable decisions, and a result. The protocol
        makes those comparisons inspectable.
      </p>
      <h2>The same conditions</h2>
      <p>
        A round robin pairs every selected model with every other model. Each pair plays twice,
        swapping White and Black. Standard chess starts from the same position, with no opening
        book, engine assistance, or tools.
      </p>
      <p>
        Each turn includes the board, FEN, move history, and legal moves. Models return an action in
        SAN and a brief explanation as JSON. A run records its protocol version, model IDs, request
        settings, and captured prices.
      </p>
      <h2>Scores and failures</h2>
      <p>
        A win earns one point and a draw half a point. Score is points divided by finished games.
        Checkmate, stalemate, repetition, insufficient material, and the fifty-move rule follow
        standard chess rules. Reaching the configured ply limit is a draw.
      </p>
      <p>
        Illegal actions and timeouts count as failed attempts. Exhausting the per-move attempt limit
        forfeits the match. Authentication, credits, rate limits, and provider outages pause the
        experiment without awarding a loss. Cancelled and unfinished matches never contribute to
        scores.
      </p>
      <h2>Measurements you can inspect</h2>
      <p>
        The record includes every response, accepted move, failed attempt, wall-clock response time,
        input and output tokens, and reported cost. Legal / requests shows accepted actions over all
        requests, including infrastructure errors; the table also separates invalid actions from
        errors.
      </p>
      <p>
        Prices come from the live OpenRouter catalogue and are captured when a run starts. Each
        request uses the lowest-price provider that supports the parameters, capped at those
        captured prices. When billing data is missing, the cost is estimated and marked. The spend
        limit reserves room for a request before sending it. An interrupted request pauses the run
        and records its reserve, since actual usage may be unknown.
      </p>
      <p>
        Results apply to the models, protocol, and sample in this run. A handful of games does not
        establish general intelligence or a universal ranking. More repetitions and consistent
        settings make comparisons more useful. Exports contain the full run and all attempts for
        independent analysis.
      </p>
      <h2>Watch, replay, export</h2>
      <p>
        Live matches update automatically. Select a move to replay the board and inspect its
        response. Download a match as PGN, or export the complete experiment as JSON. Matches
        continue on the server while the browser is closed.
      </p>
      <h2>Server setup</h2>
      <p>
        Set <code>OPENROUTER_API_KEY</code> and <code>ADMIN_API_TOKEN</code> on the server, then
        connect using the admin token in the top bar. The model API key is never sent to the
        browser.
      </p>
      <p>
        For local development, copy <code>.dev.vars.example</code> to <code>.dev.vars</code>, fill
        in the values, and run <code>npm run dev</code>. For Cloudflare, set both secrets with
        Wrangler and run <code>npm run cf:deploy</code>. The repository README has the complete
        deployment instructions.
      </p>
      <Link to="/runs/new" className="button primary">
        Set up a run <ArrowRight size={16} />
      </Link>
    </article>
  )
}
