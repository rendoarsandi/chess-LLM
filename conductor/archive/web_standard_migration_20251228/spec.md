# Specification: Node.js to Cloudflare Workers (Web Standards) Migration

## Overview

This track involves migrating the entire ChessLLM backend from its current Node.js environment to a Web Standards-compliant architecture hosted on **Cloudflare Workers**. This includes transitioning the database to **Cloudflare D1**, state/WebSocket management to **Durable Objects**, and background processing to **Durable Object Alarms**. The goal is to eliminate Node.js dependencies and leverage Cloudflare's edge infrastructure for scalability and low latency.

## Track Type

- Refactor / Migration

## Functional Requirements

### 1. Database Migration (D1)

- Transition from `better-sqlite3` to **Cloudflare D1**.
- Update `drizzle.config.ts` and database driver logic to support D1 exclusively.
- Provide a clean migration path for the existing schema to a fresh D1 instance.

### 2. Real-time Communication (Durable Objects)

- Replace `@hono/node-ws` with **Cloudflare Durable Objects** for WebSocket handling.
- Implement Durable Objects to manage authoritative game state and distribute updates to connected clients.

### 3. Automated Game Progression (DO Alarms)

- Replace `GameLoopService` and `TournamentLoopService` with **Durable Object Alarms**.
- Each Game and Tournament Durable Object will manage its own lifecycle and schedule "wake-ups" to advance its logic independently of client connections.

### 4. Authentication Update (BetterAuth)

- Reconfigure BetterAuth to use the Cloudflare D1 adapter.
- Ensure all cryptographic operations within the auth flow use the standard **Web Crypto API**.

### 5. Web Standards Cleanup

- **LLM Clients:** Refactor Google Gemini and Groq integrations to use the standard `fetch` API, removing any Node-specific SDK dependencies.
- **Utility Replacement:** Identify and replace all `node:*` module imports (e.g., `node:buffer`, `node:util`) with standard Web APIs (e.g., `Uint8Array`, `TextEncoder`).
- **Environmental Globals:** Ensure usage of `Response`, `Request`, `Headers`, and other Web Standard globals throughout the application.

## Non-Functional Requirements

- **Performance:** Maintain or improve current game progression speed and WebSocket latency.
- **Strict Typing:** Maintain strict TypeScript typing across the new Cloudflare-specific implementations.
- **Testability:** Ensure the new architecture can be tested using `miniflare` or the Hono/Wrangler testing environment.

## Acceptance Criteria

- [ ] The backend successfully starts and runs using `wrangler dev`.
- [ ] The backend can be deployed to Cloudflare without errors.
- [ ] Games progress automatically via DO Alarms without requiring an active browser tab.
- [ ] Real-time updates are correctly broadcasted to clients via Durable Object WebSockets.
- [ ] Authentication works correctly using the D1 adapter and Web Crypto.
- [ ] All `node:*` imports are removed from the production codebase.

## Out of Scope

- Migration of existing local `.sqlite` data to Cloudflare.
- Significant changes to the React frontend UI, except where required for WebSocket/API compatibility.
