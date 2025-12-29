# Specification: Swiss System Tournament Feature

## 1. Overview

This feature introduces a "Tournament Mode" mimicking the "Tilted Tuesday" Swiss System format. It allows the Admin to organize, schedule, and execute tournaments involving any registered models (LLMs) from the database, as well as built-in Stockfish/Random bots. The system will manage pairings, scoring, and round progression automatically.

## 2. Functional Requirements

### 2.1 Admin Configuration

- **Tournament Creation:**
  - Admin can create a new tournament via a dedicated dashboard panel.
  - **Roster Selection:** Display a list of all available models (from DB) with checkboxes. Admin manually selects participants.
  - **Hardcoded Fallbacks:** System allows adding "Stockfish" or "Random" instances to the roster if needed, but no other hardcoded models are permitted.
  - **Scheduling:** Admin sets a "Start Time" for the tournament.
  - **Time Control:** Admin can specify:
    - "No Time Control" (Default, for slow LLMs).
    - "Timed" (Base minutes + Increment) to enforce move limits.

### 2.2 Tournament Logic (Backend)

- **Format:** Swiss System.
  - **Pairings:** Winners play winners. No elimination.
  - **Rounds:** Calculated based on player count (e.g., `log2(N)` or fixed admin input).
  - **Scoring:** Win (1), Draw (0.5), Loss (0).
  - **Tie-Breaks:** Buchholz system (sum of opponents' scores).
- **Execution Loop:**
  - A background service monitors the schedule.
  - When `start_time` is reached, Round 1 pairings are generated.
  - Games are created in the database with a specific `tournament_id`.
  - The existing `GameLoopService` processes moves.
  - When all games in a round finish, the system generates pairings for the next round.

### 2.3 User Interface (Frontend)

- **Live Tournament Dashboard:**
  - **Standings:** Real-time table showing Rank, Player, Points, Tie-Break, and W/L/D record.
  - **Pairings:** List of current round matchups with live status (In Progress, Result).
  - **Live Observation:** Users can click any active pairing to watch the game on the main board (Focus Mode).
- **History:**
  - Section to view past tournament results and standings.

## 3. Non-Functional Requirements

- **Resilience:** If the server restarts, the tournament state must persist and resume from the current round/game.
- **Performance:** Pairing logic must handle 32+ players efficiently.
- **Scalability:** DB schema should support linking games to tournaments without cluttering the main "Casual" game history.

## 4. Acceptance Criteria

- [ ] Admin can create a tournament, select 4+ specific LLM/Stockfish players, and set it to start in 1 minute.
- [ ] System automatically starts the tournament, creates Round 1 games.
- [ ] "No Time Control" setting allows LLMs to think indefinitely without flagging.
- [ ] UI displays the live standings updating as games finish.
- [ ] Upon Round 1 completion, Round 2 pairings adhere to Swiss rules (1-0 vs 1-0, 0-1 vs 0-1).
- [ ] Tournament concludes after the final round, declaring a winner.
- [ ] Users can click a "Watch" button on a pairing to see the board.

## 5. Out of Scope

- Elo rating updates for Tournament games (Tournament performance is tracked separately or optionally affects main Elo). _Decision: Affects main Elo for simplicity unless specified otherwise._
- Complex tie-breaks beyond Buchholz.
- Manual pairing adjustments by Admin.
