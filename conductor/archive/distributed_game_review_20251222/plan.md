# Plan: Distributed Game Review System

## Phase 1: Database & Backend Foundation [checkpoint: 763e923]

- [x] Task: Create database schema for Game Reviews (2c847f9)
  - [x] Subtask: Create `game_reviews` table (game_id, status, started_at, worker_id, completed_at).
  - [x] Subtask: Create `move_analyses` table (review_id, move_number, classification, evaluation, best_line).
  - [x] Subtask: Run database migration.
- [x] Task: Implement Game Review API Service (6122564)
  - [x] Subtask: Create `GameReviewService` class to handle queue logic.
  - [x] Subtask: Implement `requestReview(gameId)` - adds to queue or returns existing.
  - [x] Subtask: Implement `claimJob(workerId)` - finds oldest queued job, sets to 'processing', sets heartbeat.
  - [x] Subtask: Implement `submitResults(jobId, results)` - saves to DB, marks complete.
  - [x] Subtask: Implement `heartbeat(jobId)` - updates `last_heartbeat` timestamp.
  - [x] Subtask: Implement background cleanup (or check on claim) to reset 'stuck' jobs (heartbeat > 5s ago).
- [x] Task: Expose API Endpoints (541284f)
  - [x] Subtask: `POST /api/reviews/:gameId` (Request/Check status).
  - [x] Subtask: `POST /api/reviews/worker/claim` (Worker claims job).
  - [x] Subtask: `POST /api/reviews/worker/heartbeat` (Worker keep-alive).
  - [x] Subtask: `POST /api/reviews/worker/submit` (Submit results).
- [ ] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Client-Side Worker & Analysis Logic [checkpoint: 6e6a96c]

- [x] Task: Enhance Stockfish Service (ce284bb)
  - [x] Subtask: Update `StockfishService` (Implemented as AnalysisWorker) to support Multi-PV configuration.
  - [x] Subtask: Implement `analyzePosition(fen, depth=20, multipv=3)` method.
- [x] Task: Implement Move Classification Logic (1c64777)
  - [x] Subtask: Create `ClassificationEngine` utility.
  - [x] Subtask: Implement rules for Brilliant, Great, Best, etc. based on centipawn loss and win probability shifts.
  - [x] Subtask: Write unit tests for classification rules (e.g., "Prove -2.0 to +1.0 is a Blunder").
- [x] Task: Build the "Analysis Worker" (ce87dc5)
  - [x] Subtask: Create `useAnalysisWorker` hook.
  - [x] Subtask: Implement polling loop: Check for jobs -> Claim -> Analyze -> Heartbeat -> Submit.
  - [x] Subtask: Ensure analysis runs in a Web Worker to prevent UI freeze.
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: UI Integration & Visualization

- [x] Task: Update Game View (21ae024)
  - [x] Subtask: Add "Request Review" button (if not exists).
  - [x] Subtask: Show status: "Queued" / "Processing (Worker X)" / "Completed".
  - [x] Subtask: Implement WebSocket or Polling to update status in real-time.
- [x] Task: Visualize Results (21ae024)
  - [x] Subtask: Add classification icons (!!, ?, etc.) to the `MoveList` component.
  - [ ] Subtask: Highlight "Best Move" on the board (arrow or highlight).
  - [ ] Subtask: Display "Evaluation Bar" alongside the board (optional but good for context).
- [x] Task: Integration & Robustness Testing (6e6a96c)
  - [x] Subtask: Test: Start review, close tab, verify job becomes available again.
  - [x] Subtask: Test: Multiple clients open, verify no double-processing.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
