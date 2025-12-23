# Tech Stack - ChessLLM

## Frontend
- **Framework:** React 19 (Vite)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS v4 + Shadcn UI
- **Routing:** `react-router` (v7)
- **Notifications:** `sonner` for robust toast alerts
- **Chess Logic:** `chess.js`
- **Chessboard UI:** `react-chessboard`
- **Engine:** `stockfish.js` (WASM + Web Workers). Multi-worker architecture: one for live UI analysis, one for automated move generation, and one for background game reviews.
- **Bot Controller:** `useGameBot` hook for responding to server-side `REQUEST_MOVE` commands via WebSockets.
- **Analysis Engine:** `ClassificationEngine` utility for heuristic-based move quality assessment (Brilliant to Blunder).
- **Data Visualization:** `recharts` for ELO history and performance tracking
- **Animations:** `framer-motion` for fluid page transitions and interactive elements
- **Testing:** Vitest + React Testing Library + JSDOM

## Backend
- **Framework:** Hono (Node.js runtime)
- **Language:** TypeScript
- **Database:** SQLite (Local-first via `better-sqlite3`)
- **ORM:** Drizzle ORM
- **Authentication:** BetterAuth (Email/Password) with restricted admin access
- **Testing:** Vitest

## Communication
- **WebSockets:** Real-time bidirectional communication via `@hono/node-ws`. Used for game state updates (`UPDATE`) and authoritative bot control (`REQUEST_MOVE` / `SUBMIT_MOVE`).

## Background Service
- **GameLoopService:** Periodic background process to advance games played by LLMs.
- **TournamentLoopService:** Manages tournament lifecycles, including scheduling, pairing generation, and round progression.
- **RandomPlayer:** Initial bot implementation for testing the automated loop.
- **Swiss Pairing Engine:** Custom algorithm for non-repeat pairings based on tournament standings.

## Deployment & Scalability
- **Local Development:** Optimized for Termux/Node.js.
- **Persistence:** SQLite managed by Drizzle Kit for schema migrations.
- **Future Path:** Architected for seamless migration to Cloudflare Workers, D1, and Durable Objects.

## External Integrations
- **LLM APIs:** Support for Google Gemini and Groq (Kimi, GPT-OSS, Qwen).
