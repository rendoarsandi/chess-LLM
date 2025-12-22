# Product Guide - ChessLLM

## Initial Concept
A platform for AI vs. AI chess matches, leveraging `chess.js` and `react-chessboard`. The system features a background game loop that persists state using a local-first architecture (SQLite), enabling games to progress independently of the user's browser session.

## Target Audience
Developers and AI researchers interested in benchmarking and evaluating Large Language Models (LLMs) through competitive chess. The platform provides a dynamic leaderboard based on ELO ratings.

## Key Features (Prototype Phase)
- **Interactive Game Arena:** A real-time dashboard to monitor ongoing games and browse game history.
- **Real-time Position Evaluation:** Integrated Stockfish WASM engine provides instant advantage analysis and forced mate detection.
- **Client-Side Bot Architecture:** Mimics cloud-scale "Durable Object" patterns by offloading Stockfish move generation to the client browser via WebSockets, reducing server load.
- **Multi-Provider AI Gameplay:** Support for both Google Gemini and Groq (Kimi, GPT-OSS, Qwen) models for diverse strategic thinking.
- **Robust System Resilience:** Multi-layered error handling with React Error Boundaries and defensive chess logic prevents application crashes on invalid model inputs.
- **Automated Game Loop:** A background service that advances games automatically, ensuring continuous competition.
- **Persistent Storage:** Comprehensive logging of games, moves, and player statistics in a local SQLite database.
- **Live Leaderboard:** Real-time ELO tracking and rankings for all participating models.
- **Detailed LLM Profiles:** Interactive profiles for each model featuring ELO history graphs and head-to-head performance metrics.
- **Administrative Dashboard:** Secure management interface to dynamically configure LLM providers, Model IDs, and API keys without code changes.
- **Dynamic Model Activation:** Real-time control over which models are eligible for the automated arena and matchmaking.
- **Swiss System Tournaments:** Automated "Tilted Tuesday" style championships with pairing logic, scoring, and Buchholz tie-breaks.
- **Distributed Game Review:** Post-game analysis powered by connected clients. Uses Multi-PV Stockfish to classify moves (Brilliant, Blunder, etc.) and provides a detailed quality breakdown.

## Future Roadmap
- **OpenRouter Integration:** Expanding beyond the current prototype to support a vast array of models via OpenRouter.
- **Multi-LLM Integration:** Pluggable architecture to support various LLM APIs as chess players.
## Architecture & Durability
The application uses a "Local First" pattern with a Node.js/Hono backend and SQLite. This ensures that the core game engine and bot logic run reliably as background processes, while the React frontend provides a responsive interface for observation and analysis.

## User Experience & Design
- **Minimalist Aesthetic:** High-contrast, focused design centered on the board and metrics.
- **Mobile-First Responsiveness:** Optimized for small screens with a single-column layout, collapsible navigation, and responsive metrics.
- **Real-time Synchronization:** Frontend polling ensures the UI reflects the background loop's progress.
- **Dynamic Routing:** Proper client-side navigation with URL persistence for models, leaderboard, and history.
- **Historical Review:** Ability to select and review any game from the persistent database.
- **Dark Mode:** System-wide dark theme optimized for long-term monitoring.
