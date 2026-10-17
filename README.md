# GameBench

Chess benchmarks with API-driven models or external AI harnesses connected over MCP.

## Play through MCP without a model API key

In MCP mode the models run in your own AI hosts. GameBench never calls an inference
provider. The administrator schedules exact model IDs, then gives each host a
different participant credential. No OpenRouter key or model catalogue is needed.
The existing web interface displays boards, move records, results, and exports.
Schedule MCP runs using the administrator API below.

Set `ADMIN_API_TOKEN` in `.dev.vars` for local development, or as a Worker secret
in production. Start locally with `npm ci` and `npm run dev`.

1. Create a schedule (IDs below are illustrative labels, not claims of model availability):

   ```sh
   export GAMEBENCH_URL=http://127.0.0.1:5173
   # Set ADMIN_API_TOKEN in this shell to the server's administrator token.
   curl "$GAMEBENCH_URL/api/runs" \
     -H 'Content-Type: application/json' \
     -H "x-admin-token: $ADMIN_API_TOKEN" \
     -d '{"name":"Harness chess","gameId":"chess","execution":"mcp","modelIds":["gemini-4-argon","claude-5.5-opus"],"maxPlies":400}'
   ```

   Save the returned run `id`. Each pair plays both colors, with one repetition by
   default. Up to eight different exact model IDs and three repetitions are supported.
   Each match starts as soon as both of its seats join; White always moves first.
   There is no additional date/time gate. Use `Idempotency-Key: <UUID>` when retrying
   schedule creation.

2. Issue participant credentials, using the returned run ID:

   ```sh
   curl -X POST "$GAMEBENCH_URL/api/runs/$RUN_ID/mcp-credentials" \
     -H "x-admin-token: $ADMIN_API_TOKEN"
   ```

   The response is an array of `{ "modelId": "...", "token": "gbmcp...." }`.
   Give each host only its own token. This endpoint **rotates all credentials for
   the run**, revoking previous ones without losing joins or moves. Raw credentials
   appear only in this administrator response; the database stores SHA-256 hashes.
   Public snapshots, live events, move records, and exports do not contain credentials.
   Never give a participant the administrator token.

3. Connect each host to `$GAMEBENCH_URL/api/mcp` using Streamable HTTP and the
   header `Authorization: Bearer <its participant token>`. Use HTTPS when remote.
   The endpoint supports MCP protocol versions `2025-03-26`, `2025-06-18`, and
   `2025-11-25`, with stateless connections. Requests require
   `Accept: application/json, text/event-stream`.

   For a host that supports stdio MCP, use the included dependency-free bridge.
   Adapt the path and environment values in its MCP server configuration:

   ```json
   {
     "mcpServers": {
       "gamebench": {
         "command": "node",
         "args": ["/absolute/path/to/chess-LLM/scripts/mcp-stdio.mjs"],
         "env": {
           "GAMEBENCH_MCP_URL": "http://127.0.0.1:5173/api/mcp",
           "GAMEBENCH_MCP_TOKEN": "<this host's participant token>"
         }
       }
     }
   }
   ```

4. Give each model this instruction:

   > Use GameBench MCP to list your matches and join your assigned seats. For each
   > unfinished match, call wait_for_turn. When yourTurn is true, choose exactly one
   > move from legalActions and call submit_move with the exact expectedFen and
   > expectedPly from that state and a new moveId. An explanation is optional.
   > Repeat until finished. After a wait timeout, wait again. After compaction or
   > reconnection, call list_matches and get_match_state to recover; trust the
   > server's FEN and full PGN over your chat memory. Retry a lost submission only
   > with its original moveId and identical arguments.

| Tool              | Purpose                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `list_matches`    | All matches assigned to the credential's model in this run, including joined and finished matches                       |
| `join_match`      | Idempotently claim your scheduled seat; the second join starts play                                                     |
| `get_match_state` | Exact current FEN, full PGN, ply, legal SAN moves, joins, result, and next tool                                         |
| `wait_for_turn`   | Streamable HTTP SSE response, waits up to 25 seconds; returns when your turn arrives, the run pauses, or the match ends |
| `submit_move`     | Apply one SAN action with `matchId`, `moveId`, `expectedPly`, `expectedFen`, and optional public `explanation`          |

For `wait_for_turn`, an optional MCP `params._meta.progressToken` enables progress
notifications containing the exact state as JSON, including FEN and PGN, whenever
the observed position changes. The final tool result always contains that state.
An active wait observes the opponent's move within about half a second, plus
network latency. Spectators receive normal live board snapshots after joins and moves.

The server saves each accepted move and its receipt atomically. A duplicate moveId
with identical arguments returns the original receipt and latest state, including
after checkmate or restart. A different payload using the same ID is rejected.
Stale FEN/ply, wrong turns, and unjoined seats cannot change the board. Illegal SAN
submissions consume an attempt; `maxAttempts` consecutive invalid submissions on
one turn forfeit the match. `maxPlies` ends a game as a draw.

## Limits of a harness match

Credentials enforce scheduled identity and seat access. MCP cannot attest that a
host actually runs the named model: the administrator must select the model and
distribute its credential correctly. Credentials are scoped to one run; connect a
different credential to discover another run's schedule.

The second join and each accepted move immediately update whose turn it is. MCP
cannot force an idle or stopped host to generate a response. Keep each host's agent
loop running and allow it to call `wait_for_turn` repeatedly. Disconnects do not
erase a game or cause an automatic forfeit. API inference timeouts and spend limits
do not apply to MCP matches; pause, resume, and cancel remain administrator controls.

PGN is stored on the server, preserving the complete history needed for repetition
rules and context recovery. Compaction does not require the model to remember moves.
Hidden reasoning and host token usage/cost/latency cannot be collected through MCP.
Only a model's optional public explanation is recorded; `reasoning` and
`responseModel` remain null. Zero usage/cost/latency metrics mean **unmeasured** for
MCP, not free host inference. MCP runs use `chess-san-mcp-v1` so results can be
filtered separately from API runs (`chess-san-v1`).

## Verification

`npm run check` checks types and lint. `npm test` builds the app and runs server
and client tests. `npm run test:cloudflare` verifies Durable Objects on a supported
desktop/CI host. `npm run cf:dry-run` checks Worker bundling.

Transport and tool shapes follow the [MCP Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
and [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).
