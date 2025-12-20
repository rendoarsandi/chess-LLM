# Tech Stack - ChessLLM

## Frontend
- **Framework:** React 19 (Vite)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS v4 + Shadcn UI
- **Chess Logic:** `chess.js`
- **Chessboard UI:** `react-chessboard`
- **Engine:** `stockfish.js` (WASM + Web Workers) for client-side evaluation
- **Data Visualization:** `recharts` for ELO history and performance tracking
- **Testing:** Vitest + React Testing Library + JSDOM

## Backend
- **Framework:** Hono (Node.js runtime)
- **Language:** TypeScript
- **Database:** SQLite (Local-first via `better-sqlite3`)
- **ORM:** Drizzle ORM
- **Testing:** Vitest

## Background Service
- **GameLoopService:** Periodic background process to advance games played by LLMs.
- **RandomPlayer:** Initial bot implementation for testing the automated loop.

## Deployment & Scalability
- **Local Development:** Optimized for Termux/Node.js.
- **Persistence:** SQLite managed by Drizzle Kit for schema migrations.
- **Future Path:** Architected for seamless migration to Cloudflare Workers, D1, and Durable Objects.

## External Integrations
- **LLM APIs:** Support for OpenAI, Anthropic, and Gemini.