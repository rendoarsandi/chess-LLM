# Track Specification: Client-Side Stockfish "Durable Object" Simulation

## 1. Overview
This track implements a robust client-side Stockfish integration that mimics a server-side "Durable Object" architecture. The primary goal is to facilitate cost-effective local testing of "Bot vs. Bot" scenarios (specifically Stockfish vs. Stockfish) without incurring LLM token costs. The server will act as the authoritative game manager, explicitly commanding the client-side Stockfish to make moves via WebSocket events, mimicking the asynchronous command pattern of future cloud-based architectures.

## 2. Functional Requirements

### 2.1 WebSocket Protocol Updates
*   **New Message Type (`REQUEST_MOVE`):**
    *   **Direction:** Server -> Client
    *   **Payload:**
        *   `type`: "REQUEST_MOVE"
        *   `gameId`: string
        *   `fen`: string (Current board state)
        *   `constraints`: object (Search limits)
            *   `depth`: number (e.g., 18)
            *   `movetime`: number (Optional, milliseconds)
*   **New Message Type (`SUBMIT_MOVE`):**
    *   **Direction:** Client -> Server
    *   **Payload:**
        *   `type`: "SUBMIT_MOVE"
        *   `gameId`: string
        *   `move`: string (UCI format, e.g., "e2e4")

### 2.2 Client-Side Stockfish Management
*   **Dual Worker Architecture:** The client must maintain two distinct instances of the Stockfish Web Worker:
    1.  **Analysis Worker:** Dedicated to providing continuous evaluation metrics (Advantage Bar, Top Lines) for the UI. It runs independently of the game turn cycle.
    2.  **Player Worker:** Dedicated to generating moves when requested by the server. It remains idle until a `REQUEST_MOVE` event is received.
*   **Command Handling:**
    *   Upon receiving `REQUEST_MOVE`, the client must:
        1.  Forward the `fen` and `constraints` to the **Player Worker**.
        2.  Await the "bestmove" response from the worker.
        3.  Emit a `SUBMIT_MOVE` event back to the server via WebSocket.

### 2.3 Server-Side Integration
*   **Turn Management:** The server's game loop must detect when it is a "Client Bot's" turn.
*   **Trigger Mechanism:** Instead of waiting for a generic http response or using an internal engine, the server must emit the `REQUEST_MOVE` socket event to the relevant client connection.
*   **Timeout/Alarm Handling:** (As per user context) The server's existing alarm system remains the master clock. If the client fails to respond with `SUBMIT_MOVE` within the allowed time (tracked on the server), the server will flag the game as a timeout loss.

## 3. Non-Functional Requirements
*   **Performance:** The dual-worker setup must ensure that the heavy "Player" calculation does not freeze the UI or interrupt the "Analysis" worker's stream of evaluations.
*   **Resilience:** If the WebSocket reconnects, the client should be ready to accept a new `REQUEST_MOVE` if it's still that player's turn (state reconciliation).

## 4. Acceptance Criteria
*   [ ] A game can be started between two "Client-Side Stockfish" players (or 1 Human vs 1 Stockfish).
*   [ ] The Server logs show `REQUEST_MOVE` being sent.
*   [ ] The Client logs show the move being calculated by the *Player Worker* (distinct from the Analysis Worker).
*   [ ] The Server receives the move, updates the game state, and proceeds to the next turn.
*   [ ] The UI Advantage Bar continues to update smoothly via the *Analysis Worker* while the *Player Worker* is thinking.
*   [ ] The system functions correctly under the existing Termux/Android environment.

## 5. Out of Scope
*   Server-side Stockfish execution (Node.js/Python bindings).
*   Complex time management logic on the client (the client simply obeys the `depth`/`movetime` constraint provided by the server).
*   LLM integration (this track focuses solely on the Stockfish bypass).
