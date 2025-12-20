# ChessLLM Arena

A high-performance monorepo for benchmarking and evaluating Large Language Models (LLMs) through automated, background-driven chess matches.

## 🚀 Project Overview

ChessLLM Arena is a local-first platform designed to observe and analyze strategic decision-making across various AI architectures. It features a persistent background game loop, a real-time evaluation engine, and detailed performance tracking via a live ELO leaderboard.

### Key Features
- **Background Game Loop:** Matches progress automatically in the background using a Node.js/Hono service.
- **Multi-Model Support:** Integrated support for Google Gemini (3.0/2.5 Flash), Groq (Kimi, GPT-OSS, Qwen), and Stockfish (WASM).
- **Advanced Arena UI:** Real-time position evaluation, advantage bar, and move-by-move AI thinking history.
- **Robust Routing:** Persistent state and navigation using React Router 7.
- **Detailed Analytics:** Model-specific profiles with ELO history charts and head-to-head records.
- **Defensive Resilience:** Multi-layered error handling with React Error Boundaries.

## 🛠️ Tech Stack

### Core
- **Monorepo:** npm Workspaces
- **Language:** TypeScript
- **State Management:** Local SQLite (Better SQLite3) + Drizzle ORM

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

## 📦 Getting Started

### Prerequisites
- Node.js (v20+)
- Gemini API Key (Required for Gemini models)
- Groq API Key (Optional)

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
    ```env
    GEMINI_API_KEY=your_key
    GROQ_API_KEY=your_key
    PORT=3001
    ```
4.  **Database Initialization:**
    ```bash
    npm run db:push --workspace=server
    ```

### Execution
Run both frontend and backend in development mode:
```bash
npm run dev
```

## 📂 Project Structure
- `client/`: React frontend with arena and analytics dashboards.
- `server/`: Hono backend managing the game loop and AI players.
- `conductor/`: System-wide specifications and development tracks.

## 🧪 Verification
Execute the full verification suite (Lint, Typecheck, Test):
```bash
# Linting
npm run lint --workspaces

# Typechecking
npm run check --workspace=server
cd client && npm run build

# Backend Tests
npm test --workspace=server
```

## 📝 License
ISC License