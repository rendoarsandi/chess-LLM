# Tech Stack - ChessLLM

## Frontend
- **Framework:** React (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn UI
- **Chess Logic:** `chess.js`
- **Chessboard UI:** `react-chessboard`
- **Data Fetching:** TanStack Query (React Query) for efficient API interaction.

## Backend
- **Framework:** Hono (Running on Node.js for local development)
- **Language:** TypeScript
- **Database:** SQLite (Local-first)
- **ORM:** Drizzle ORM (Type-safe migrations and queries)

## Background & Durability (The "Local Durable Object" Pattern)
- **Local Execution:** A dedicated Hono service running in Node.js handles the automated game loops and LLM API calls, ensuring progress even without a browser open.
- **Persistence:** SQLite serves as the durable storage for game state, move logs, and ELO ratings.
- **Browser Integration:** Service Workers for UI-level background synchronization and notifications.
- **Cloudflare Migration Path:**
    - **Hono:** Designed for Cloudflare Workers; migration will be nearly transparent.
    - **Drizzle + D1:** Drizzle's SQLite driver is compatible with Cloudflare D1.
    - **Game Logic:** The core loop is architected to transition into Cloudflare Durable Objects for production scale.

## External Integrations
- **LLM APIs:** Support for OpenAI, Anthropic, and Gemini.

## Development Environment
- **Runtime:** Node.js (Optimized for Termux)
- **Package Manager:** npm
