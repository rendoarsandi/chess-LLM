# ChessLLM Arena

A local-first LMArena-style benchmark for evaluating Large Language Models through automated chess matches, ratings, tournaments, and post-game analysis.

## 🚀 Project Overview

ChessLLM Arena is designed to observe and compare strategic decision-making across AI model families. It features a persistent background game loop, client-side Stockfish move support, review jobs, tournament play, and detailed performance tracking via live ELO leaderboards.

### Key Features

- **Background Game Loop:** Matches progress automatically in the background using a Node.js/Hono service.
- **Arena Matchmaking:** Optional scheduler can pick the next model-vs-model ladder game from active server-side LLM configurations.
- **Multi-Model Support:** Integrated support for Google Gemini, Groq, OpenRouter-routed models, and Stockfish (WASM).
- **Advanced Arena UI:** Real-time position evaluation, advantage bar, and move-by-move AI thinking history.
- **Robust Routing:** Persistent state and navigation using React Router 7.
- **Detailed Analytics:** Model-specific profiles with ELO history charts and head-to-head records.
- **Defensive Resilience:** Multi-layered error handling with React Error Boundaries.

## 🛠️ Tech Stack

### Core

- **Monorepo:** npm Workspaces
- **Language:** TypeScript
- **State Management:** Local SQLite + Drizzle ORM. `better-sqlite3` is used when its native binding is available; Node's built-in SQLite is used as a fallback on platforms such as Termux.

### Client (React)

- **Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4 + Shadcn UI
- **Chess Logic:** chess.js + react-chessboard
- **Routing:** React Router 7

### Server (Node.js)

- **Framework:** Hono
- **Runtime:** Node.js
- **Testing:** Vitest + Drizzle Integration

### Cloudflare Target

- **Frontend:** Cloudflare Pages
- **API:** Cloudflare Workers + Hono
- **Database:** Cloudflare D1 using the checked-in Drizzle SQLite migrations
- **Live Rooms:** Durable Objects for game-room WebSocket hibernation
- **Scheduling:** Durable Object alarms for arena matchmaking

## 📦 Getting Started

### Prerequisites

- Node.js v20+ for normal desktop/server environments
- Node.js v22+ recommended on Android/Termux so the built-in SQLite fallback is available
- Gemini API key for Gemini models
- Groq API key for Groq models
- OpenRouter API key for OpenRouter models

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/rendoarsandi/chess-LLM.git
    cd chess-LLM
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Setup:**
    Configure `.env` in the project root:
    `env
    GEMINI_API_KEY=your_key
    GROQ_API_KEY=your_key
    OPENROUTER_API_KEY=your_key
    OPENROUTER_HTTP_REFERER=http://localhost:5173
    OPENROUTER_APP_TITLE=ChessLLM Arena
    MATCHMAKING_ENABLED=false
    MATCHMAKING_INTERVAL_MS=60000
    PORT=3001
    `
    The backend applies the checked-in Drizzle migrations automatically on startup. You can still run `npm run db:push` from the repo root when intentionally pushing schema changes during development.

### Execution

Run both frontend and backend in development mode:

```bash
npm run dev
```

### Cloudflare Deployment

`wrangler.toml` is checked in with D1 and Durable Object bindings. Replace the placeholder D1 database id, then apply migrations and deploy from a platform supported by Wrangler:

```bash
npx wrangler d1 create chessllm-arena
npx wrangler d1 migrations apply chessllm-arena
npx wrangler secret put ADMIN_API_TOKEN
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

Wrangler depends on `workerd`, which does not publish an Android/Termux binary. Run the Cloudflare commands from Linux/macOS/Windows or CI. The local Node server remains the development runtime on Termux.

## 📂 Project Structure

- `client/`: React frontend with arena and analytics dashboards.
- `server/`: Hono backend managing the game loop and AI players.
- `conductor/`: System-wide specifications and development tracks.

## 🧪 Verification

Execute the verification suite from the repo root:

```bash
npm run check
npm test
npm run build
```

## 📝 License

ISC License
