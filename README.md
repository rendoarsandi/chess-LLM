# GameBench

Run inspectable LLM-versus-LLM game benchmarks. Chess is the first game: choose models, save a protocol, play every pairing in both colors, watch the matches live, and export the record.

One Cloudflare Worker serves the React frontend and Hono API. Each benchmark has a SQLite-backed Durable Object. Alarms advance matches independently of spectators; hibernating WebSockets broadcast positions and model response streams. A second Durable Object indexes runs.

## What you can do

- Configure 2–8 OpenRouter models, repetitions, temperature, output tokens, request timeout, retry limit, ply limit, and spend limit.
- Watch pieces move, follow reasoning when a model returns it, and inspect its response as it streams. Returned reasoning depends on the model/provider.
- Pause, resume, or stop a run. Public spectators can watch without an admin token.
- Replay moves and inspect explanations, raw responses, failed attempts, timing, tokens, and reported or estimated cost.
- Compare score, W/D/L, legal actions, errors, response time, and cost within a run. Download match PGNs or the complete JSON experiment.

## Stack

React 19, Vite, React Router, and TanStack Query handle the workbench. Hono handles HTTP; the official `@openrouter/sdk` handles inference and the live model catalogue. Cloudflare Durable Objects own storage, execution, and live connections. Local development uses the same runner with Node's built-in SQLite and WebSockets.

TanStack Start and TanStack AI are not required for this workflow. The backend's important lifecycle is the autonomous benchmark, which belongs in a Durable Object rather than a page request. See [architecture](docs/architecture.md) for the game adapter and execution model.

## Run locally

Use Node 24 or later and npm.

```bash
npm ci
cp .dev.vars.example .dev.vars
```

Set `OPENROUTER_API_KEY` and a random `ADMIN_API_TOKEN` in `.dev.vars`. Optional OpenRouter attribution settings are documented in that file. Keep secrets out of Git.

```bash
npm run dev
```

Open `http://localhost:5173`. The local API listens on `127.0.0.1:3001`. Click **Connect**, enter the admin token, and create a run. The token stays in that browser tab; the OpenRouter key stays on the server. Without secrets, you can still open the workbench and browse the public model catalogue.

Local state is stored in `.local/gamebench.sqlite`. Runs resume when the local server starts again. If the process stopped during inference, the run pauses and conservatively records the outstanding request's estimated reserve before an operator resumes it.

## Deploy to Cloudflare

Run Wrangler on Linux, macOS, Windows, or a supported CI runner. The normal Node development server also works on Termux; Wrangler's native `workerd` binary does not run directly on Android.

```bash
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put ADMIN_API_TOKEN
npm run cf:dry-run
npm run cf:deploy
```

`wrangler.toml` includes the static assets binding, both Durable Object bindings, and the SQLite class migration. No D1 database or separate Pages deployment is needed. The Worker name defaults to `gamebench`; change it before deploying if you want another name. The migration is for a fresh deployment of this rebuild.

The deployed URL serves both the app and `/api`. Set `OPENROUTER_HTTP_REFERER` in Wrangler's variables if you want to identify your deployment to OpenRouter. To develop against the actual Cloudflare runtime with local secrets:

```bash
npm run dev:cloudflare
```

Open the URL Wrangler prints. This builds and serves the frontend through the same Worker and uses local Durable Object storage.

## Benchmark protocol

The saved `chess-san-v1` protocol starts standard chess from the initial position. Each turn supplies the board, FEN, full PGN history, and legal SAN actions. Models must return JSON with an `action` and optional `explanation`. No engine assistance, opening book, or tools are provided.

Every model pair plays both colors per repetition. Wins score 1, draws ½, and losses 0. The score table uses completed games only. Illegal responses and request timeouts consume an attempt; exhausting the move's attempt limit forfeits the match. Provider outages, authentication, credits, and rate limits pause the experiment rather than award a loss. Stopped or budget-limited unfinished matches do not count toward scores.

Requests reserve budget before inference using captured model prices and the output cap. Provider routing requires the requested parameters and caps prices at the saved values. Missing billing data and interrupted transports are marked as estimated cost. This is a conservative application limit, not a substitute for the spending limits on your OpenRouter account.

Results describe the selected models, protocol, and sample. They are not a universal Elo rating. JSON exports include the complete saved configuration, standings, match states, and every attempt, with provider metadata when returned. Exporting during a run captures a consistent snapshot and streams the corresponding records.

## Verification

On Termux, use the sequential core/API/provider suite:

```bash
npm run test:light
```

Run browser and Cloudflare runtime checks on desktop Linux/macOS/Windows or CI. They start native processes and can exhaust resources on a phone. The default core suite also runs one test file at a time.

The full desktop/CI sequence is:

```bash
npm run check
npm test
npm run build
npm run test:cloudflare
npx playwright install chromium
npm run test:e2e
```

Tests use explicitly synthetic responses and spend no model credits. Core/API tests exercise actual chess rules and SQLite. Cloudflare tests exercise real Durable Object alarms, eviction, SQLite persistence, and hibernating WebSockets. Browser tests cover setup, streamed reasoning, public spectators, pause/resume, replay, completion without viewers, exports, and mobile layout. GitHub Actions runs these checks on Linux.

See the [verification record](docs/verification.md) for checks actually completed and this host's runtime limitations.

## Source map

| Path                    | Responsibility                                                        |
| ----------------------- | --------------------------------------------------------------------- |
| `client/src`            | Benchmark setup, results, live board, replay, and response inspection |
| `shared`                | Public protocol types, metrics, and configuration validation          |
| `server/src/core`       | Game-neutral execution, accounting, and export                        |
| `server/src/games`      | Game adapters; standard chess is currently implemented                |
| `server/src/providers`  | Official OpenRouter SDK integration                                   |
| `server/src/storage`    | Shared SQL storage contracts and local SQLite                         |
| `server/src/cloudflare` | Worker, Durable Objects, bindings, and alarms                         |
| `server/src/local*`     | Local HTTP, WebSockets, and background execution                      |

The previous tournament, Stockfish, authentication, and database implementation has been replaced. Legacy database files are not imported or needed.
