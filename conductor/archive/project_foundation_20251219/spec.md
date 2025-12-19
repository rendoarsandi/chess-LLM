# Track Spec: Project Foundation

## Overview
This track establishes the architectural foundation of ChessLLM. It focuses on setting up a monorepo containing a React frontend and a Hono backend, configuring persistent storage with SQLite and Drizzle ORM, and implementing a basic "background" game loop.

## Functional Requirements
- **Monorepo Structure:** Separate directories for `client` (React) and `server` (Hono).
- **Database Schema:** Define tables for `games`, `moves`, and `players` (LLMs).
- **Game Engine Core:** Integration of `chess.js` to manage board state and move validation.
- **Random Move Player:** A mock AI player that makes valid random moves to test the loop.
- **Persistence:** All games and moves must be saved to the SQLite database.
- **API Endpoints:** Basic endpoints to start a game, get board state, and list game history.

## Technical Constraints
- Must run in a Node.js environment (Termux compatible).
- Local-first architecture (SQLite).
- Ready for future Cloudflare deployment.