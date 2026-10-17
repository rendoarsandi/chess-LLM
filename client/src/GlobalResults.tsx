import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { api, money } from './api'
import { ErrorNotice, Loading, Status } from './App'
import type { ArenaOptions, ArenaQuery, HistoryQuery, IndexCoverage } from '../../shared/arena'

function Coverage({ coverage }: { coverage: IndexCoverage }) {
  return (
    <>
      {coverage.indexing && (
        <p className="notice" role="status">
          Loading older experiments: {coverage.indexedRuns} of {coverage.totalRuns} indexed. Results
          update automatically.
        </p>
      )}
      {coverage.unavailableRuns > 0 && (
        <p className="notice" role="status">
          {coverage.unavailableRuns} saved experiments could not be loaded and are excluded.
        </p>
      )}
    </>
  )
}

function ProtocolFilter({
  options,
  value,
  change,
}: {
  options?: ArenaOptions
  value?: string
  change: (value: string) => void
}) {
  return (
    <label>
      Protocol
      <select value={value ?? ''} onChange={(event) => change(event.target.value)}>
        <option value="">All protocols</option>
        {options?.protocols
          .filter((item) => item.gameId === 'chess')
          .map((item) => (
            <option key={item.protocol} value={item.protocol}>
              {item.protocol}
            </option>
          ))}
      </select>
    </label>
  )
}

function Pagination({
  page,
  pageSize,
  total,
  change,
}: {
  page: number
  pageSize: number
  total: number
  change: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <nav className="results-pagination" aria-label="Results pages">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
          : 'No results'}
      </span>
      <div>
        <button className="button compact" disabled={page <= 1} onClick={() => change(page - 1)}>
          <ChevronLeft size={14} />
          Previous
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button
          className="button compact"
          disabled={page >= pages}
          onClick={() => change(page + 1)}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  )
}

export function LeaderboardPage() {
  const filters = useSearch({ from: '/_workbench/leaderboard' })
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['leaderboard', filters],
    queryFn: () => api.leaderboard(filters),
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  })
  function change(patch: ArenaQuery) {
    void navigate({ to: '/leaderboard', search: { ...filters, ...patch } })
  }
  const data = query.data
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Global leaderboard</h1>
          <p>Every completed chess match, across saved benchmark runs.</p>
        </div>
        <Link to="/history" className="button">
          Match history
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="arena-filters">
        <label className="arena-search">
          Find a model
          <input
            type="search"
            value={filters.search ?? ''}
            placeholder="Model name or ID"
            onChange={(event) => change({ search: event.target.value || undefined, page: 1 })}
          />
        </label>
        <ProtocolFilter
          options={data}
          value={filters.protocol}
          change={(protocol) => change({ protocol: protocol || undefined, page: 1 })}
        />
      </div>
      <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      {query.isPending ? (
        <Loading>Loading global standings…</Loading>
      ) : (
        data && (
          <>
            <Coverage coverage={data.coverage} />
            {query.isPlaceholderData && (
              <p className="notice" role="status">
                Updating results…
              </p>
            )}
            <section
              className="arena-surface"
              aria-label="Global model rankings"
              aria-busy={query.isFetching}
            >
              <div className="section-heading">
                <h2>Model standings</h2>
                <span>{data.coverage.indexedRuns} saved runs indexed</span>
              </div>
              {data.rows.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Model</th>
                        <th>Score</th>
                        <th>W / D / L</th>
                        <th>Runs</th>
                        <th>Avg. response</th>
                        <th>Cost</th>
                        <th>
                          <span className="sr-only">History</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, index) => (
                        <tr key={row.modelId}>
                          <td>{(data.page - 1) * data.pageSize + index + 1}</td>
                          <td>
                            <strong>{row.name}</strong>
                            <small>{row.modelId}</small>
                          </td>
                          <td className="score-cell">
                            {((row.points / row.games) * 100).toFixed(1)}%
                            <small>{row.games} games</small>
                          </td>
                          <td>
                            {row.wins} / {row.draws} / {row.losses}
                          </td>
                          <td>{row.runs}</td>
                          <td>
                            {row.requests
                              ? `${(row.latencyMs / row.requests / 1000).toFixed(1)}s`
                              : '—'}
                          </td>
                          <td>
                            {money(row.costUsd)}
                            {row.estimatedCosts > 0 && <small>Includes estimates</small>}
                          </td>
                          <td>
                            <Link
                              to="/history"
                              search={{ modelA: row.modelId }}
                              aria-label={`Match history for ${row.name}`}
                            >
                              History
                              <ArrowRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="arena-empty">
                  <h3>
                    {filters.search || filters.protocol
                      ? 'No models match these filters'
                      : 'No completed matches yet'}
                  </h3>
                  <p>
                    Finished games appear here automatically. Running and cancelled matches do not
                    affect scores.
                  </p>
                  <Link to="/live">
                    Watch live matches
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                change={(page) => change({ page })}
              />
            </section>
            <p className="table-note">
              Score = points / completed games. Win = 1, draw = ½. Ties use games played, then model
              name. Runs may use different settings; inspect each saved protocol before comparing
              results.
            </p>
          </>
        )
      )}
    </>
  )
}

export function HistoryPage() {
  const filters = useSearch({ from: '/_workbench/history' })
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['history', filters],
    queryFn: () => api.history(filters),
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  })
  function change(patch: HistoryQuery) {
    void navigate({ to: '/history', search: { ...filters, ...patch } })
  }
  const data = query.data
  const name = (id?: string) => data?.models.find((model) => model.id === id)?.name ?? id
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Match history</h1>
          <p>Compare two models in either color, then replay their games.</p>
        </div>
        <Link to="/leaderboard" className="button">
          Leaderboard
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="arena-filters history-filters">
        <label>
          First model
          <select
            value={filters.modelA ?? ''}
            onChange={(event) =>
              change({
                modelA: event.target.value || undefined,
                modelB: event.target.value === filters.modelB ? undefined : filters.modelB,
                page: 1,
              })
            }
          >
            <option value="">Any model</option>
            {data?.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} · {model.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Opponent
          <select
            value={filters.modelB ?? ''}
            onChange={(event) => change({ modelB: event.target.value || undefined, page: 1 })}
          >
            <option value="">Any opponent</option>
            {data?.models
              .filter((model) => model.id !== filters.modelA)
              .map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} · {model.id}
                </option>
              ))}
          </select>
        </label>
        <label>
          Match status
          <select
            value={filters.status ?? 'all'}
            onChange={(event) =>
              change({ status: event.target.value as HistoryQuery['status'], page: 1 })
            }
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="queued">Queued</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <ProtocolFilter
          options={data}
          value={filters.protocol}
          change={(protocol) => change({ protocol: protocol || undefined, page: 1 })}
        />
      </div>
      <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      {query.isPending ? (
        <Loading>Loading match history…</Loading>
      ) : (
        data && (
          <>
            <Coverage coverage={data.coverage} />
            {query.isPlaceholderData && (
              <p className="notice" role="status">
                Updating results…
              </p>
            )}
            {data.headToHead && (
              <section className="head-to-head" aria-label="Head-to-head record">
                <h2>
                  {name(filters.modelA)} vs {name(filters.modelB)}
                </h2>
                <p>
                  <strong>{data.headToHead.aWins}</strong> wins for {name(filters.modelA)},{' '}
                  <strong>{data.headToHead.draws}</strong> draws,{' '}
                  <strong>{data.headToHead.bWins}</strong> wins for {name(filters.modelB)}.
                </p>
                <small>
                  {data.headToHead.games} completed games across the selected protocols and
                  statuses. Colors are combined.
                </small>
              </section>
            )}
            <section
              className="arena-surface"
              aria-label="Saved matches"
              aria-busy={query.isFetching}
            >
              <div className="section-heading">
                <h2>Games across runs</h2>
                <span>{data.total} matches</span>
              </div>
              {data.matches.length ? (
                <div className="table-scroll">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>White</th>
                        <th>Black</th>
                        <th>Result</th>
                        <th>Benchmark run</th>
                        <th>
                          <span className="sr-only">Replay</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.matches.map((match) => (
                        <tr key={`${match.runId}:${match.id}`}>
                          <td>
                            <time dateTime={new Date(match.createdAt).toISOString()}>
                              {new Date(match.createdAt).toLocaleDateString()}
                            </time>
                            <small>{match.plies} plies</small>
                          </td>
                          <td>
                            <strong>{match.modelNames[0]}</strong>
                            <small>{match.modelIds[0]}</small>
                          </td>
                          <td>
                            <strong>{match.modelNames[1]}</strong>
                            <small>{match.modelIds[1]}</small>
                          </td>
                          <td>
                            {match.result && match.status === 'completed' ? (
                              <>
                                <strong>
                                  {match.result.scores
                                    .map((score) => (score === 0.5 ? '½' : score))
                                    .join(' – ')}
                                </strong>
                                <small>{match.result.reason.replaceAll('_', ' ')}</small>
                              </>
                            ) : (
                              <Status
                                status={
                                  match.status === 'running' && match.runStatus === 'paused'
                                    ? 'paused'
                                    : match.status
                                }
                              />
                            )}
                          </td>
                          <td>
                            {match.runName}
                            <small>{match.protocol}</small>
                          </td>
                          <td>
                            <Link
                              to="/runs/$id"
                              params={{ id: match.runId }}
                              search={{ match: match.id }}
                              aria-label={`${match.plies ? 'Replay' : 'Open'} ${match.modelNames[0]} vs ${match.modelNames[1]} in ${match.runName}`}
                            >
                              {match.plies ? 'Replay' : 'Open match'}
                              <ArrowRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="arena-empty">
                  <h3>No matches found</h3>
                  <p>Choose another model, status, or protocol to broaden the history.</p>
                  <Link to="/">
                    Browse benchmark runs
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                change={(page) => change({ page })}
              />
            </section>
          </>
        )
      )}
    </>
  )
}
