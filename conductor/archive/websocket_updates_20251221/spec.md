# Specification: WebSocket Game Updates

## 1. Overview

The current polling mechanism (1 request/second) for watching games is inefficient and creates unnecessary server load. This track implements real-time game updates using WebSockets via Hono's native WebSocket support (`@hono/node-ws`). Clients will subscribe to specific game rooms to receive targeted updates when moves occur, game states change, or spectator counts update.

## 2. Functional Requirements

### 2.1 Backend (Server)

- **WebSocket Server:** Initialize `@hono/node-ws` integrated with the existing Hono application.
- **Room Management:**
  - Implement a subscription mechanism where clients join a room identified by `gameId`.
  - Track the number of active connections per room (Spectator Count).
- **Event Integration:**
  - Integrate with `GameLoopService` to detect when a move is made or a game ends.
  - Integrate with `GameService` (or equivalent) to detect when a new game starts.
  - Emit events to the relevant WebSocket room.
- **Broadcasting:**
  - **Move Update:** Send the new FEN and PGN when a move is recorded.
  - **Game State:** Send updates for Game Over (Checkmate, Draw, etc.) or Game Start.
  - **Status:** Send "Thinking" status when the AI is processing.
  - **Spectators:** Broadcast updated spectator counts when users join/leave a room.

### 2.2 Frontend (Client)

- **WebSocket Client:** Replace the `useQuery` polling interval in `Chessboard.tsx` (and potentially `SpectatorView`) with a custom WebSocket hook (e.g., `useGameSocket`).
- **Connection Logic:**
  - Connect to the WebSocket server upon mounting the game view.
  - Send a `join` message with the `gameId`.
  - Handle `leave` or disconnect cleanup.
- **State Updates:**
  - Update the local React state (board position, move list, game status) immediately upon receiving a WebSocket message.
  - Display the live "Spectator Count" in the UI.
  - Show "AI Thinking" indicators based on socket events.
- **Fallback:** (Optional but recommended) Keep a manual "Refresh" button or a slow background poll (e.g., every 30s) as a safety net, or robust reconnection logic.

## 3. Technical Implementation Details

- **Library:** `@hono/node-ws` for the backend.
- **Event Emitter:** A simple internal `EventEmitter` or singleton service may be needed to bridge the `GameLoopService` (logic) and the WebSocket route (network).
- **Message Format:**

  ```json
  // Client -> Server
  { "type": "JOIN", "gameId": "123" }

  // Server -> Client
  { "type": "UPDATE", "fen": "...", "pgn": "...", "lastMove": "e2e4" }
  { "type": "STATUS", "status": "thinking" } // or "idle"
  { "type": "SPECTATORS", "count": 42 }
  ```

## 4. Acceptance Criteria

- [ ] The frontend no longer polls `GET /api/games/:id` every second.
- [ ] Opening a game URL connects to a WebSocket.
- [ ] When the AI makes a move, the board updates instantly on the client without a page refresh.
- [ ] Spectator count is displayed and updates in real-time.
- [ ] Navigating away from the game page disconnects the socket.
- [ ] Server console logs show WebSocket connection/disconnection events.

## 5. Out of Scope

- Chat functionality.
- User authentication for spectators (spectators are anonymous for this connection).
