import type { McpCredential, McpOperation, McpReply, McpMatchState } from '../../../shared/mcp'
import type { Attempt, Match, RunSnapshot } from '../../../shared/protocol'
import { InputError } from '../../../shared/validation'
import { chessAdapter } from '../games/chess'
import { RunStore } from '../storage/run-store'
import { RunConflict } from './runner'
import { Chess } from 'chess.js'

export class McpUnauthorized extends Error {
  readonly code = 'MCP_UNAUTHORIZED'
}

async function digest(token: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Credentials live outside public snapshots, attempts, and exports. */
export class McpMatchService {
  constructor(private store: RunStore) {}

  private required() {
    const run = this.store.read()
    if (!run || run.config.execution !== 'mcp') throw new RunConflict('MCP run not found.')
    return run
  }

  async issueCredentials(): Promise<McpCredential[]> {
    const run = this.required()
    const credentials = run.config.modelIds.map((modelId) => ({
      modelId,
      token: `gbmcp.${run.id}.${crypto.randomUUID()}.${crypto.randomUUID()}`,
    }))
    const hashes = await Promise.all(
      credentials.map(async ({ modelId, token }) => ({
        modelId,
        hash: await digest(token),
      })),
    )
    this.store.replaceMcpCredentials(hashes)
    return credentials
  }

  async execute(token: string, operation: McpOperation): Promise<McpReply> {
    const modelId = this.store.mcpIdentity(await digest(token))
    if (!modelId)
      throw new McpUnauthorized('Participant credential is missing, invalid, or revoked.')
    // Everything from this read through commit is synchronous: concurrent joins/moves
    // cannot overwrite each other in either the local host or a Durable Object.
    const run = this.required()
    if (operation.type === 'identity') return { modelId }
    if (operation.type === 'list')
      return {
        modelId,
        matches: run.matches
          .filter((match) => match.modelIds.includes(modelId))
          .map((match) => this.state(run, match, modelId)),
      }
    const match = run.matches.find(
      (match) => match.id === operation.matchId && match.modelIds.includes(modelId),
    )
    if (!match) throw new RunConflict('This model has no seat in that match.')
    const seat = match.modelIds.indexOf(modelId)
    if (operation.type === 'state') return { modelId, state: this.state(run, match, modelId) }
    if (operation.type === 'move') {
      // Check the durable receipt before turn/status checks so retries after a lost
      // response (including the final move) acknowledge the original submission.
      const previous = this.store.attempt(`mcp:${match.id}:${operation.moveId}`)
      if (previous) {
        if (previous.modelId !== modelId || previous.response !== JSON.stringify(operation))
          throw new RunConflict('moveId already belongs to a different submission.')
        return this.reply(run, match, modelId, operation.moveId, previous, true)
      }
    }
    if (run.status !== 'running' || match.status === 'completed' || match.status === 'cancelled')
      throw new RunConflict('This match is paused or finished. Read its state before continuing.')
    if (operation.type === 'join') {
      match.mcp!.joined[seat] = true
      if (match.mcp!.joined.every(Boolean)) match.status = 'running'
      run.updatedAt = Date.now()
      this.store.commit(run)
      return { modelId, state: this.state(run, match, modelId) }
    }
    if (match.status !== 'running' || !match.mcp!.joined.every(Boolean))
      throw new RunConflict('Both scheduled models must join before playing.')
    if (match.turn !== seat) throw new RunConflict('It is the other model’s turn.')
    if (operation.expectedPly !== match.plies || operation.expectedFen !== match.view.fen)
      throw new RunConflict(
        'Stale position. Read get_match_state and choose from its legal actions.',
      )
    const observation = chessAdapter.observe(match.state)
    const legal = observation.legalActions.includes(operation.action)
    const attempt: Attempt = {
      id: `mcp:${match.id}:${operation.moveId}`,
      matchId: match.id,
      modelId,
      seat,
      ply: match.plies,
      attempt: match.attemptsThisTurn + 1,
      action: operation.action,
      explanation: operation.explanation ?? null,
      reasoning: null,
      response: JSON.stringify(operation),
      outcome: legal ? 'legal' : 'invalid',
      error: legal ? null : 'Action is not in the legal SAN list.',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      costEstimated: false,
      latencyMs: 0,
      createdAt: Date.now(),
      positionAfter: null,
      provider: 'mcp',
      responseModel: null,
      generationId: null,
    }
    const metrics = match.metrics[seat]
    metrics.requests++
    if (legal) {
      const next = chessAdapter.apply(match.state, operation.action)
      const view = chessAdapter.observe(next.state)
      match.state = next.state
      match.view = view.view
      match.turn = view.turn
      match.plies++
      match.attemptsThisTurn = 0
      match.result = next.result
      metrics.legalActions++
      attempt.positionAfter = view.view.fen!
      if (!match.result && match.plies >= run.config.maxPlies)
        match.result = { scores: [0.5, 0.5], reason: 'move_limit' }
    } else {
      metrics.invalidActions++
      match.attemptsThisTurn++
      if (match.attemptsThisTurn >= run.config.maxAttempts)
        match.result = { scores: seat === 0 ? [0, 1] : [1, 0], reason: 'invalid_action_forfeit' }
    }
    if (match.result) match.status = 'completed'
    if (run.matches.every((item) => item.status === 'completed')) run.status = 'completed'
    run.updatedAt = Date.now()
    this.store.commit(run, attempt)
    return this.reply(run, match, modelId, operation.moveId, attempt, false)
  }

  private reply(
    run: RunSnapshot,
    match: Match,
    modelId: string,
    moveId: string,
    attempt: Attempt,
    replayed: boolean,
  ): McpReply {
    return {
      modelId,
      state: this.state(run, match, modelId),
      receipt: {
        moveId,
        ply: attempt.ply,
        accepted: attempt.outcome === 'legal',
        replayed,
        error: attempt.error,
      },
    }
  }

  private state(run: RunSnapshot, match: Match, modelId: string): McpMatchState {
    const seat = match.modelIds.indexOf(modelId)
    const active = run.status === 'running' && match.status === 'running'
    const yourTurn = active && match.turn === seat
    const finished =
      ['completed', 'cancelled'].includes(match.status) ||
      ['completed', 'cancelled'].includes(run.status)
    return {
      runId: run.id,
      matchId: match.id,
      modelId,
      modelIds: match.modelIds,
      seat: seat === 0 ? 'white' : 'black',
      joined: match.mcp!.joined,
      runStatus: run.status,
      status: match.status,
      ply: match.plies,
      fen: match.view.fen!,
      pgn: match.state,
      turn: match.turn === 0 ? 'white' : 'black',
      yourTurn,
      // Legal SAN depends on the position, so waiting does not need to replay the
      // entire PGN on every poll. Applying moves still uses PGN for draw history.
      legalActions: new Chess(match.view.fen).moves(),
      result: match.result,
      attemptsRemaining: run.config.maxAttempts - match.attemptsThisTurn,
      nextTool: finished
        ? 'list_matches'
        : !match.mcp!.joined[seat]
          ? 'join_match'
          : yourTurn
            ? 'submit_move'
            : 'wait_for_turn',
    }
  }
}

export function validateMcpOperation(value: unknown): McpOperation {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InputError('Expected tool arguments.')
  const data = value as Record<string, unknown>
  if (data.type === 'list' || data.type === 'identity') return { type: data.type }
  if (typeof data.matchId !== 'string' || data.matchId.length > 100)
    throw new InputError('matchId is required.')
  if (data.type === 'state' || data.type === 'join')
    return { type: data.type, matchId: data.matchId }
  if (data.type !== 'move') throw new InputError('Unknown MCP operation.')
  if (typeof data.moveId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(data.moveId))
    throw new InputError(
      'moveId must be 8–80 letters, digits, underscores, or hyphens. Reuse it only for an exact retry.',
    )
  if (!Number.isSafeInteger(data.expectedPly) || Number(data.expectedPly) < 0)
    throw new InputError('expectedPly must be the current ply.')
  if (typeof data.expectedFen !== 'string' || data.expectedFen.length > 200)
    throw new InputError('expectedFen must be the exact current FEN.')
  if (typeof data.action !== 'string' || data.action.length > 20 || !data.action)
    throw new InputError('action must be one SAN move.')
  if (
    data.explanation !== undefined &&
    (typeof data.explanation !== 'string' || data.explanation.length > 4000)
  )
    throw new InputError('explanation must be a brief summary up to 4000 characters.')
  return {
    type: 'move',
    matchId: data.matchId,
    moveId: data.moveId,
    expectedPly: Number(data.expectedPly),
    expectedFen: data.expectedFen,
    action: data.action,
    ...(data.explanation === undefined ? {} : { explanation: data.explanation as string }),
  }
}
